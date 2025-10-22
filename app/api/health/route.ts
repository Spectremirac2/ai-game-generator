import { NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import type { PrismaClient } from "@prisma/client";
import { Redis } from "@upstash/redis";

import { openai } from "@/lib/openai";

type HealthStatus = "healthy" | "degraded" | "unhealthy";

type ServiceName = "database" | "redis" | "openai";

interface ServiceCheck {
  service: ServiceName;
  status: HealthStatus;
  message?: string;
  latencyMs?: number;
}

interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  checks: ServiceCheck[];
}

let PrismaClientCtor: (new () => PrismaClient) | null | undefined;
let prismaClient: PrismaClient | null = null;
let redisClient: Redis | null | undefined;

export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkOpenAI(),
  ]);

  const overallStatus = deriveOverallStatus(checks);
  const statusCode = overallStatus === "healthy" ? 200 : 503;

  const body: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
  };

  return NextResponse.json(body, { status: statusCode });
}

async function checkDatabase(): Promise<ServiceCheck> {
  if (!isDatabaseConfigured()) {
    return {
      service: "database",
      status: "degraded",
      message: "Database environment variables are not configured.",
    };
  }

  const client = getPrismaClient();
  if (!client) {
    return {
      service: "database",
      status: "degraded",
      message: "Prisma client is not available. Run `prisma generate` to enable database checks.",
    };
  }

  const start = performance.now();

  try {
    await client.$queryRaw`SELECT 1`;
    return {
      service: "database",
      status: "healthy",
      latencyMs: roundLatency(performance.now() - start),
    };
  } catch (error) {
    return {
      service: "database",
      status: "unhealthy",
      message: toErrorMessage(error),
      latencyMs: roundLatency(performance.now() - start),
    };
  }
}

async function checkRedis(): Promise<ServiceCheck> {
  const client = getRedisClient();
  if (!client) {
    return {
      service: "redis",
      status: "degraded",
      message: "Redis environment variables are not configured.",
    };
  }

  const start = performance.now();

  try {
    await client.ping();
    return {
      service: "redis",
      status: "healthy",
      latencyMs: roundLatency(performance.now() - start),
    };
  } catch (error) {
    return {
      service: "redis",
      status: "unhealthy",
      message: toErrorMessage(error),
      latencyMs: roundLatency(performance.now() - start),
    };
  }
}

async function checkOpenAI(): Promise<ServiceCheck> {
  const start = performance.now();

  try {
    await openai.models.list();
    return {
      service: "openai",
      status: "healthy",
      latencyMs: roundLatency(performance.now() - start),
    };
  } catch (error) {
    return {
      service: "openai",
      status: "degraded",
      message: toErrorMessage(error),
      latencyMs: roundLatency(performance.now() - start),
    };
  }
}

function deriveOverallStatus(checks: ServiceCheck[]): HealthStatus {
  if (checks.some((check) => check.status === "unhealthy")) {
    return "unhealthy";
  }

  if (checks.some((check) => check.status === "degraded")) {
    return "degraded";
  }

  return "healthy";
}

function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.POSTGRES_PRISMA_URL ??
      process.env.POSTGRES_URL ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL
  );
}

function getPrismaClient(): PrismaClient | null {
  if (prismaClient) {
    return prismaClient;
  }

  const ctor = getPrismaCtor();
  if (!ctor) {
    return null;
  }

  prismaClient = new ctor();
  return prismaClient;
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  try {
    redisClient = Redis.fromEnv();
  } catch {
    redisClient = null;
  }

  return redisClient;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function roundLatency(value: number): number {
  return Math.round(value);
}

function getPrismaCtor(): (new () => PrismaClient) | null {
  if (PrismaClientCtor !== undefined) {
    return PrismaClientCtor;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const mod = require("@prisma/client") as { PrismaClient?: new () => PrismaClient };
    PrismaClientCtor = mod?.PrismaClient ?? null;
  } catch {
    PrismaClientCtor = null;
  }

  return PrismaClientCtor;
}
