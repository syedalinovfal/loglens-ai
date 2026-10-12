import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const query = `
      SELECT 
        i.*,
        l.stack_trace,
        l.context
      FROM incidents i
      LEFT JOIN LATERAL (
        SELECT stack_trace, context 
        FROM logs 
        WHERE logs.incident_id = i.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) l ON true
      ORDER BY i.last_seen_at DESC;
    `;

    const result = await pool.query(query);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("[Incidents Fetch Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
