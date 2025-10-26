/**
 * Game Generation API v2 - Enhanced with Full Architecture
 *
 * This endpoint uses the complete AI Game Generator Factory architecture:
 * - Visual Department (DALL-E 3) for sprites
 * - Code Department (GPT-4) for game logic
 * - Template Service for game scaffolding
 * - Assembler for package creation
 * - Storage Service for assets
 *
 * Usage: POST /api/generate/v2 with GameGenerationRequest
 */

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { orchestratorService } from "@/lib/services/orchestrator/orchestrator-service";
import { checkRateLimit } from "@/lib/cache";
import { logger } from "@/lib/logger";

const GenerateRequestSchema = z.object({
  gameType: z.enum(["platformer", "puzzle", "shooter", "racing", "custom"]),
  theme: z.string().min(3, "Theme must be at least 3 characters").max(200),
  playerDescription: z
    .string()
    .min(10, "Player description must be at least 10 characters")
    .max(500),
  difficulty: z.enum(["easy", "medium", "hard"]),
  mechanics: z.array(z.string()).optional().default([]),
  enemies: z.array(z.string()).optional().default([]),
  style: z
    .enum(["pixel-art", "hand-drawn", "realistic", "cartoon"])
    .optional()
    .default("cartoon"),
  userId: z.string().optional(),
  userEmail: z.string().email().optional().default("anonymous@example.com"),
});

type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    logger.info("Generate API v2: Request received", { requestId });

    // Parse and validate request
    const rawBody = await request.json();
    const payload = GenerateRequestSchema.parse(rawBody);

    logger.info("Generate API v2: Request validated", {
      requestId,
      gameType: payload.gameType,
      theme: payload.theme,
    });

    // Get user from session or use anonymous
    const userId = payload.userId || requestId;
    const userEmail = payload.userEmail || "anonymous@example.com";

    // Rate limiting
    const rateLimitDisabled = process.env.RATE_LIMIT_FREE_TIER === "0";
    if (!rateLimitDisabled) {
      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";

      const rateLimitKey = userId ?? clientIp;

      try {
        const rateLimit = await checkRateLimit(rateLimitKey, 3); // 3 games per day for free tier

        if (!rateLimit.allowed) {
          logger.warn("Generate API v2: Rate limit exceeded", {
            requestId,
            rateLimitKey,
          });

          return NextResponse.json(
            {
              success: false,
              error: {
                code: "RATE_LIMIT_EXCEEDED",
                message: `Rate limit exceeded. You can generate 3 games per day. Try again after ${rateLimit.reset.toISOString()}`,
              },
              meta: buildMeta(startedAt, requestId, {
                rateLimit: {
                  remaining: 0,
                  reset: rateLimit.reset.toISOString(),
                },
              }),
            },
            { status: 429 }
          );
        }
      } catch (rateLimitError) {
        logger.error("Generate API v2: Rate limit check error", {
          requestId,
          error: rateLimitError,
        });
        // Continue without rate limit if check fails
      }
    }

    // Validate request with orchestrator
    const validation = orchestratorService.validateRequest({
      ...payload,
      userId,
      userEmail,
    });

    if (!validation.valid) {
      logger.warn("Generate API v2: Validation failed", {
        requestId,
        errors: validation.errors,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Request validation failed",
            details: validation.errors,
          },
          meta: buildMeta(startedAt, requestId),
        },
        { status: 400 }
      );
    }

    // Estimate generation time
    const estimatedTime = orchestratorService.estimateGenerationTime({
      ...payload,
      userId,
      userEmail,
    });

    logger.info("Generate API v2: Starting generation", {
      requestId,
      estimatedTime,
    });

    // Generate game using orchestrator
    const result = await orchestratorService.generateGame({
      ...payload,
      userId,
      userEmail,
    });

    logger.info("Generate API v2: Generation complete", {
      requestId,
      jobId: result.jobId,
      packageSize: result.metadata.packageSize,
    });

    const durationMs = Date.now() - startedAt;

    return NextResponse.json(
      {
        success: true,
        game: {
          id: result.jobId,
          downloadUrl: result.downloadUrl,
          assets: result.assets,
          metadata: {
            ...result.metadata,
            durationMs,
            estimatedTime,
          },
          status: "ready",
          createdAt: result.metadata.generatedAt,
        },
        meta: buildMeta(startedAt, requestId, {
          estimatedTime,
          actualTime: durationMs,
          packageSize: result.metadata.packageSize,
        }),
      },
      {
        status: 200,
        headers: {
          "X-Generation-Time": `${durationMs}ms`,
          "X-Job-ID": result.jobId,
        },
      }
    );
  } catch (error) {
    return handleError(error, { requestId, startedAt });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "game-generator-v2",
    version: "2.0.0",
    features: [
      "AI-generated sprites (DALL-E 3)",
      "AI-generated code (GPT-4)",
      "5 game templates",
      "Downloadable packages",
      "Multiple art styles",
    ],
    timestamp: new Date().toISOString(),
  });
}

function handleError(
  error: unknown,
  context: { requestId: string; startedAt: number }
): NextResponse {
  logger.error("Generate API v2: Error occurred", {
    requestId: context.requestId,
    error,
  });

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

  // AI Service errors
  if (isAIServiceError(error)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AI_SERVICE_UNAVAILABLE",
          message:
            "The AI service is temporarily unavailable. Please retry shortly.",
          details: toErrorDetails(error),
        },
        meta: buildMeta(context.startedAt, context.requestId),
      },
      {
        status: 503,
        headers: { "Retry-After": "30" },
      }
    );
  }

  // Generic error
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again later.",
        details: toErrorDetails(error),
      },
      meta: buildMeta(context.startedAt, context.requestId),
    },
    { status: 500 }
  );
}

function buildMeta(
  startedAt: number,
  requestId: string,
  extras?: Record<string, unknown>
) {
  const durationMs = Date.now() - startedAt;
  return {
    timestamp: new Date().toISOString(),
    requestId,
    duration: `${durationMs}ms`,
    version: "2.0.0",
    ...(extras ?? {}),
  };
}

function isAIServiceError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = String((error as { message?: string }).message ?? "").toLowerCase();
  return (
    message.includes("openai") ||
    message.includes("rate limit") ||
    message.includes("timeout") ||
    message.includes("overloaded") ||
    message.includes("dall-e") ||
    message.includes("gpt-4") ||
    message.includes("failed to generate")
  );
}

function toErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const safeError = error as { message?: string; status?: number; code?: string };
  return {
    message: safeError.message,
    status: safeError.status,
    code: safeError.code,
  };
}
