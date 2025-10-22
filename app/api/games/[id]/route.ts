import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  deleteGame,
  getGameById,
  incrementPlayCount,
  updateGame,
} from "@/lib/repositories/gameRepository";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const game = await getGameById(id);
    if (!game) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Game not found." },
        },
        { status: 404 },
      );
    }

    void incrementPlayCount(id);

    return NextResponse.json(
      {
        success: true,
        game,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[game-detail] GET error", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Failed to load game." },
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    // TODO: Authorize user owns this game
    const updated = await updateGame(id, body);

    return NextResponse.json(
      {
        success: true,
        game: updated,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[game-detail] PATCH error", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Failed to update game." },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    // TODO: Authorize user owns this game
    await deleteGame(id);

    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[game-detail] DELETE error", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Failed to delete game." },
      },
      { status: 500 },
    );
  }
}
