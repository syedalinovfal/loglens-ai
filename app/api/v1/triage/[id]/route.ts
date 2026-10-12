import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import pool from "@/lib/db";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 1. Fetch incident and its latest associated log
    const incidentRes = await pool.query(
      `SELECT i.*, l.stack_trace, l.context 
       FROM incidents i
       LEFT JOIN logs l ON l.incident_id = i.id
       WHERE i.id = $1
       ORDER BY l.created_at DESC
       LIMIT 1`,
      [id],
    );

    if (incidentRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 },
      );
    }

    const incident = incidentRes.rows[0];

    // If already analyzed, return cached analysis to save tokens
    if (incident.root_cause && incident.suggested_fix) {
      return NextResponse.json({
        rootCause: incident.root_cause,
        suggestedFix: incident.suggested_fix,
        impact: incident.impact,
        cached: true,
      });
    }

    // 2. Build structured prompt for Gemini
    const prompt = `You are a Principal Reliability and Systems Engineer triaging a production software failure.

Incident Title: ${incident.title}
Severity: ${incident.severity}
Stack Trace:
${incident.stack_trace || "No stack trace provided"}

Context:
${JSON.stringify(incident.context || {}, null, 2)}

Provide an actionable, concise triage assessment in strict JSON format matching this schema:
{
  "rootCause": "Direct 1-2 sentence explanation of why this error occurred.",
  "impact": "1 sentence describing user or business blast radius.",
  "suggestedFix": "Unified git diff or code replacement snippet illustrating the fix."
}

Do not wrap your response in markdown code blocks (\`\`\`json). Return valid raw JSON only.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    const text = response.text?.trim() || "{}";
    const cleanJson = text
      .replace(/^```json/, "")
      .replace(/```$/, "")
      .trim();
    const diagnosis = JSON.parse(cleanJson);

    // 3. Persist diagnosis in PostgreSQL
    await pool.query(
      `UPDATE incidents 
       SET root_cause = $1, suggested_fix = $2, impact = $3
       WHERE id = $4`,
      [diagnosis.rootCause, diagnosis.suggestedFix, diagnosis.impact, id],
    );

    return NextResponse.json({
      rootCause: diagnosis.rootCause,
      suggestedFix: diagnosis.suggestedFix,
      impact: diagnosis.impact,
      cached: false,
    });
  } catch (error: any) {
    console.error("[AI Triage Error]:", error);
    return NextResponse.json(
      { error: "Failed to generate AI triage: " + error.message },
      { status: 500 },
    );
  }
}
