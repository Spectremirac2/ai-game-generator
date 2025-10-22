import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPublicGames, getUserGames } from "@/lib/repositories/gameRepository";
import type { GameTemplate } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? undefined;
    const visibility = searchParams.get("visibility") ?? undefined;
    const templateParam = searchParams.get("template") ?? undefined;
    const limitParam = Number.parseInt(searchParams.get("limit") ?? "20", 10);
    const offsetParam = Number.parseInt(searchParams.get("offset") ?? "0", 10);

    const limit = Number.isNaN(limitParam) || limitParam <= 0 ? 20 : limitParam;
    const offset = Number.isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam;

    if (visibility === "public") {
      const games = await getPublicGames({
        template: templateParam ? (templateParam as GameTemplate) : undefined,
        limit,
        offset,
      });

      return NextResponse.json(
        {
          success: true,
          count: games.length,
          games,
        },
        { status: 200 },
      );
    }

    if (userId) {
      const games = await getUserGames(userId, {
        limit,
        offset,
      });

      return NextResponse.json(
        {
          success: true,
          count: games.length,
          games,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Either set visibility=public or provide a userId.",
        },
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("[games-api] GET error", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Failed to load games.",
        },
      },
      { status: 500 },
    );
  }
}
