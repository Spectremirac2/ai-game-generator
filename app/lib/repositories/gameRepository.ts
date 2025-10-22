import { Prisma, GameStatus, GameTemplate, Visibility } from "@prisma/client";

import prisma from "@/lib/prisma";

export interface CreateGameInput {
  userId: string;
  title: string;
  description: string;
  code: string;
  template: GameTemplate;
  prompt: string;
  difficulty: string;
  assets?: Prisma.InputJsonValue | null;
}

export interface UpdateGameInput {
  title?: string;
  description?: string;
  code?: string;
  status?: GameStatus;
  visibility?: Visibility;
  assets?: Prisma.InputJsonValue | null;
}

/**
 * Creates a new game record for the supplied user.
 */
export async function createGame(input: CreateGameInput) {
  try {
    return await prisma.game.create({
      data: {
        userId: input.userId,
        title: input.title,
        description: input.description,
        code: input.code,
        template: input.template,
        prompt: input.prompt,
        difficulty: input.difficulty,
        assets: input.assets === undefined ? undefined : input.assets ?? Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("[GameRepository] createGame", error);
    throw error;
  }
}

/**
 * Retrieves a game by its identifier including basic user info.
 */
export async function getGameById(id: string) {
  try {
    return await prisma.game.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("[GameRepository] getGameById", error);
    throw error;
  }
}

/**
 * Updates a game and automatically increments the version.
 */
export async function updateGame(id: string, input: UpdateGameInput) {
  try {
    const { assets, ...rest } = input;
    return await prisma.game.update({
      where: { id },
      data: {
        ...rest,
        ...(assets !== undefined ? { assets: assets ?? Prisma.JsonNull } : {}),
        version: { increment: 1 },
      },
    });
  } catch (error) {
    console.error("[GameRepository] updateGame", error);
    throw error;
  }
}

/**
 * Permanently removes a game from the database.
 */
export async function deleteGame(id: string) {
  try {
    return await prisma.game.delete({
      where: { id },
    });
  } catch (error) {
    console.error("[GameRepository] deleteGame", error);
    throw error;
  }
}

/**
 * Lists games belonging to a user with optional status filter and pagination.
 */
export async function getUserGames(
  userId: string,
  options?: { status?: GameStatus; limit?: number; offset?: number },
) {
  const take = options?.limit ?? 20;
  const skip = options?.offset ?? 0;

  try {
    return await prisma.game.findMany({
      where: {
        userId,
        ...(options?.status ? { status: options.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });
  } catch (error) {
    console.error("[GameRepository] getUserGames", error);
    throw error;
  }
}

/**
 * Retrieves published public games with optional template filtering.
 */
export async function getPublicGames(
  options?: { template?: GameTemplate; limit?: number; offset?: number },
) {
  const take = options?.limit ?? 20;
  const skip = options?.offset ?? 0;

  try {
    return await prisma.game.findMany({
      where: {
        status: GameStatus.PUBLISHED,
        visibility: Visibility.PUBLIC,
        ...(options?.template ? { template: options.template } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: [
        { plays: "desc" },
        { createdAt: "desc" },
      ],
      take,
      skip,
    });
  } catch (error) {
    console.error("[GameRepository] getPublicGames", error);
    throw error;
  }
}

/**
 * Increments the play count metric for a game.
 */
export async function incrementPlayCount(id: string) {
  try {
    return await prisma.game.update({
      where: { id },
      data: {
        plays: { increment: 1 },
      },
    });
  } catch (error) {
    console.error("[GameRepository] incrementPlayCount", error);
    throw error;
  }
}

/**
 * Publishes a game, making it visible to the public audience.
 */
export async function publishGame(id: string) {
  try {
    return await prisma.game.update({
      where: { id },
      data: {
        status: GameStatus.PUBLISHED,
        visibility: Visibility.PUBLIC,
        publishedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[GameRepository] publishGame", error);
    throw error;
  }
}

/**
 * Full-text search across public games using a simple OR query.
 */
export async function searchGames(query: string, limit = 20) {
  try {
    return await prisma.game.findMany({
      where: {
        status: GameStatus.PUBLISHED,
        visibility: Visibility.PUBLIC,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { prompt: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { plays: "desc" },
      take: limit,
    });
  } catch (error) {
    console.error("[GameRepository] searchGames", error);
    throw error;
  }
}




