import { NextRequest, NextResponse } from "next/server";

import { clearCache, getCacheStats } from "@/lib/cache";

export async function GET() {
  try {
    const stats = await getCacheStats();
    return NextResponse.json(
      {
        success: true,
        stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[cache-api] stats error", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve cache statistics.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // TODO: Require admin auth in production
  try {
    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get("pattern") ?? undefined;
    const deleted = await clearCache(pattern);
    return NextResponse.json(
      {
        success: true,
        deleted,
        pattern: pattern ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[cache-api] clear error", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to clear cache.",
      },
      { status: 500 }
    );
  }
}
