import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAnalyticsDashboard } from "@/lib/analytics";
import { getCacheStats } from "@/lib/cache";
import logger from "@/lib/logger";
import { getQueueStats } from "@/lib/queue";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");
    const parsedDays = Number.parseInt(daysParam ?? "", 10);
    const days = Number.isNaN(parsedDays) || parsedDays <= 0 ? 7 : parsedDays;

    const [dashboard, cacheStats, queueStats] = await Promise.all([
      getAnalyticsDashboard(days),
      getCacheStats(),
      getQueueStats(),
    ]);

    const { since, ...metrics } = dashboard;
    const combinedData = {
      dashboard: metrics,
      cache: cacheStats,
      queue: queueStats,
    };

    return NextResponse.json(
      {
        success: true,
        period: {
          days,
          since: since.toISOString(),
        },
        data: combinedData,
      },
      { status: 200 },
    );
  } catch (error) {
    await logger.error("Failed to load analytics dashboard", error, {
      scope: "api:analytics",
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Unable to load analytics dashboard.",
        },
      },
      { status: 500 },
    );
  }
}
