import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { clearStaleJobs } from "@/lib/queue";

/**
 * Cleanup cron endpoint - clears stale jobs
 * Called every 6 hours by Vercel Cron
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!authHeader || !secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Unauthorized" },
      },
      { status: 401 },
    );
  }

  try {
    const clearedJobs = await clearStaleJobs();

    return NextResponse.json(
      {
        success: true,
        clearedJobs,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[cron:cleanup] error", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Cleanup execution failed." },
      },
      { status: 500 },
    );
  }
}
