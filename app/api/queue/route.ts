import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { enqueueJob, getQueueStats } from "@/lib/queue";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, template, userId, priority, config } = body ?? {};

    if (!prompt || typeof prompt !== "string" || !template || typeof template !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Missing required fields: prompt and template" },
        },
        { status: 400 },
      );
    }

    const jobId = await enqueueJob(
      {
        prompt,
        template,
        userId,
        priority,
        config,
      },
      typeof priority === "number" ? priority : undefined,
    );

    return NextResponse.json(
      {
        success: true,
        jobId,
        message: "Job enqueued",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[queue-api] POST error", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Failed to enqueue job." },
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const stats = await getQueueStats();
    return NextResponse.json({ success: true, stats }, { status: 200 });
  } catch (error) {
    console.error("[queue-api] GET error", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Failed to retrieve queue stats." },
      },
      { status: 500 },
    );
  }
}
