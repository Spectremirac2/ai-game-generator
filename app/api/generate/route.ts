import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { cacheGameCode, checkRateLimit, getCachedGameCode } from "@/lib/cache";
import { generateGameCode, estimateCost } from "@/lib/openai";
import type { GameAssets, GeneratedGame, GameTemplate } from "@/types/game";

const GenerateRequestSchema = z.object({
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters long.")
    .max(500, "Prompt cannot exceed 500 characters."),
  template: z.enum(["platformer", "puzzle", "shooter", "racing", "custom"]),
  userId: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const rawBody = await request.json();
    const payload = GenerateRequestSchema.parse(rawBody);

    const preflightCostEstimate = estimatePromptCost(payload.prompt);
    logRequestStart(requestId, payload, preflightCostEstimate);

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const rateLimitKey = payload.userId ?? clientIp;
    const rateLimit = await checkRateLimit(rateLimitKey, 10);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Rate limit exceeded. Try again after ${rateLimit.reset.toISOString()}`,
          },
          meta: buildMeta(startedAt, requestId, undefined, {
            cacheHit: false,
            rateLimit: {
              remaining: 0,
              reset: rateLimit.reset.toISOString(),
            },
          }),
        },
        { status: 429 }
      );
    }

    type GameGenerationResult = Awaited<ReturnType<typeof generateGameCode>>;
    const template = payload.template as GameTemplate;
    const cachedResult = await getCachedGameCode<GameGenerationResult>(payload.prompt, template);

    let cacheHit = false;
    let result: GameGenerationResult;

    if (cachedResult) {
      cacheHit = true;
      console.log("✅ Cache HIT", { requestId, template });
      result = cachedResult;
    } else {
      console.log("❌ Cache MISS", { requestId, template });
      result = await generateGameCode(payload.prompt, template);
      await cacheGameCode(payload.prompt, template, result);
    }

    const responseCost = result.usage?.estimatedCost ?? preflightCostEstimate;
    const game = buildGeneratedGame(template, result);
    const meta = buildMeta(startedAt, requestId, responseCost, {
      cacheHit,
      rateLimit: {
        remaining: Math.max(0, rateLimit.remaining),
        reset: rateLimit.reset.toISOString(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        game,
        meta,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error, { requestId, startedAt });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "game-generator",
    timestamp: new Date().toISOString(),
  });
}

function buildGeneratedGame(
  template: GameTemplate,
  result: Awaited<ReturnType<typeof generateGameCode>>
): GeneratedGame {
  const assets = createPlaceholderAssets(template);
  const metadata = {
    ...result.metadata,
    template,
  };

  return {
    id: crypto.randomUUID(),
    code: result.code,
    assets,
    metadata,
    status: "ready",
    createdAt: new Date().toISOString(),
  };
}

function createPlaceholderAssets(template: GameTemplate): GameAssets {
  const baseAssets: Record<GameTemplate, GameAssets> = {
    platformer: {
      sprites: {
        player: "generated://platformer-player",
        enemy: [],
        platform: "generated://platformer-platform",
        background: "generated://platformer-bg",
        collectible: "generated://platformer-collectible",
      },
      sounds: {
        jump: "generated://platformer-jump",
        collect: "generated://platformer-collect",
        gameover: "generated://platformer-gameover",
      },
    },
    puzzle: {
      sprites: {
        player: "generated://puzzle-pointer",
        enemy: [],
        platform: "generated://puzzle-grid",
        background: "generated://puzzle-bg",
        collectible: "generated://puzzle-tile",
      },
      sounds: {
        collect: "generated://puzzle-match",
      },
    },
    shooter: {
      sprites: {
        player: "generated://shooter-ship",
        enemy: ["generated://shooter-enemy"],
        platform: "generated://shooter-boundary",
        background: "generated://shooter-bg",
        collectible: "generated://shooter-powerup",
      },
      sounds: {
        gameover: "generated://shooter-alert",
      },
    },
    racing: {
      sprites: {
        player: "generated://racing-car",
        enemy: ["generated://racing-rival"],
        platform: "generated://racing-track",
        background: "generated://racing-bg",
        collectible: "generated://racing-boost",
      },
      sounds: {
        gameover: "generated://racing-crash",
      },
    },
    custom: {
      sprites: {
        player: "generated://custom-player",
        enemy: [],
        platform: "generated://custom-platform",
        background: "generated://custom-bg",
        collectible: "generated://custom-item",
      },
      sounds: {},
    },
  };

  return baseAssets[template] ?? baseAssets.custom;
}

function handleError(
  error: unknown,
  context: { requestId: string; startedAt: number }
): NextResponse {
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "The request body could not be parsed as valid JSON.",
        },
        meta: buildMeta(context.startedAt, context.requestId),
      },
      { status: 400 }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Request validation failed.",
          details: error.flatten(),
        },
        meta: buildMeta(context.startedAt, context.requestId),
      },
      { status: 400 }
    );
  }

  if (isOpenAIServiceError(error)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GENERATION_UNAVAILABLE",
          message: "The generation service is temporarily unavailable. Please retry shortly.",
          details: toErrorDetails(error),
        },
        meta: buildMeta(context.startedAt, context.requestId),
      },
      {
        status: 503,
        headers: { "Retry-After": "10" },
      }
    );
  }

  console.error("[game-generator] unexpected_error", {
    requestId: context.requestId,
    error,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again later.",
      },
      meta: buildMeta(context.startedAt, context.requestId),
    },
    { status: 500 }
  );
}

function estimatePromptCost(prompt: string): number {
  const approxPromptTokens = Math.max(1, Math.ceil(prompt.length / 4));
  return estimateCost({ inputTokens: approxPromptTokens, outputTokens: 0 });
}

function buildMeta(
  startedAt: number,
  requestId: string,
  cost?: number,
  extras?: Record<string, unknown>
) {
  const durationMs = Date.now() - startedAt;
  return {
    timestamp: new Date().toISOString(),
    requestId,
    duration: `${durationMs}ms`,
    ...(typeof cost === "number" ? { estimatedCost: cost } : {}),
    ...(extras ?? {}),
  };
}

function logRequestStart(requestId: string, payload: GenerateRequest, estimatedCost: number) {
  console.warn("[game-generator] request_received", {
    requestId,
    userId: payload.userId ?? "anonymous",
    template: payload.template,
    estimatedCost,
  });
}

function isOpenAIServiceError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const status = (error as { status?: number }).status;
  if (typeof status === "number" && [429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  const message = String((error as { message?: string }).message ?? "").toLowerCase();
  return (
    message.includes("openai") ||
    message.includes("rate limit") ||
    message.includes("timeout") ||
    message.includes("overloaded")
  );
}

function toErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const safeError = error as { message?: string; status?: number };
  return {
    status: safeError.status,
    message: safeError.message,
  };
}
