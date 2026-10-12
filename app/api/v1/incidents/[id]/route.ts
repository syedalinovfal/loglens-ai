import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const validStatuses = ["Open", "Resolved", "Ignored"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `UPDATE incidents
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      incident: result.rows[0],
    });
  } catch (error: any) {
    console.error("[Incident Status Update Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
