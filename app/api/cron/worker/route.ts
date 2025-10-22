import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { processOneJob } from "@/lib/worker";

/**
 * Worker cron endpoint - processes one job from the queue
 * Called every minute by Vercel Cron
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
    const processed = await processOneJob();

    return NextResponse.json(
      {
        success: true,
        processed,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[cron:worker] error", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Worker execution failed." },
      },
      { status: 500 },
    );
  }
}
