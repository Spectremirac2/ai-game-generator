import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { clearStaleJobs } from "@/lib/queue";
import { processOneJob } from "@/lib/worker";

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
    const processed = await processOneJob();

    return NextResponse.json(
      {
        success: true,
        processed,
        clearedJobs,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[cron] worker error", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Worker execution failed." },
      },
      { status: 500 },
    );
  }
}
