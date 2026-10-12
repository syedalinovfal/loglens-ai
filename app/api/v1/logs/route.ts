import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing x-api-key header" },
        { status: 401 },
      );
    }

    // 1. Authenticate Project by API Key
    const projectRes = await pool.query(
      "SELECT id FROM projects WHERE api_key = $1 LIMIT 1",
      [apiKey],
    );

    if (projectRes.rows.length === 0) {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 403 });
    }

    const projectId = projectRes.rows[0].id;
    const body = await req.json();
    const { level = "error", message, stack_trace, context = {} } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Log "message" is required' },
        { status: 400 },
      );
    }

    // 2. Compute a stable error fingerprint (groups identical errors together)
    const normalizedSignature = stack_trace
      ? stack_trace.split("\n").slice(0, 3).join("\n")
      : message;

    const fingerprint = crypto
      .createHash("sha256")
      .update(normalizedSignature)
      .digest("hex");

    // 3. Upsert into Incidents Table (deduplicate / increment event count)
    const severity = level.toUpperCase() === "ERROR" ? "HIGH" : "MEDIUM";

    const incidentQuery = `
      INSERT INTO incidents (project_id, title, fingerprint, severity, events_count, last_seen_at)
      VALUES ($1, $2, $3, $4, 1, NOW())
      ON CONFLICT (project_id, fingerprint)
      DO UPDATE SET
        events_count = incidents.events_count + 1,
        last_seen_at = NOW(),
        status = 'Open'
      RETURNING id;
    `;

    const incidentRes = await pool.query(incidentQuery, [
      projectId,
      message.slice(0, 500),
      fingerprint,
      severity,
    ]);

    const incidentId = incidentRes.rows[0].id;

    // 4. Insert raw log entry linked to the incident
    await pool.query(
      `INSERT INTO logs (project_id, incident_id, level, message, stack_trace, context)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        projectId,
        incidentId,
        level,
        message,
        stack_trace || null,
        JSON.stringify(context),
      ],
    );

    return NextResponse.json(
      { success: true, incident_id: incidentId },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[LogLens Ingestion Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
