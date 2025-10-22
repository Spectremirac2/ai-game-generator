import type { GenerationJob } from "@prisma/client";
import { JobStatus, Prisma } from "@prisma/client";

import { redis } from "@/lib/cache";
import prisma from "@/lib/prisma";

const QUEUE_KEY = "queue:generation";
const PROCESSING_KEY = "queue:processing";

export interface JobPayload {
  prompt: string;
  template: string;
  userId?: string;
  priority?: number;
  config?: Prisma.InputJsonValue | null;
}

export interface Job {
  id: string;
  payload: JobPayload;
  priority: number;
  createdAt: string;
}

export async function enqueueJob(payload: JobPayload, priority = 5): Promise<string> {  const normalizedTemplate = payload.template.toLowerCase();
  const jobRecord = await prisma.generationJob.create({
    data: {
      prompt: payload.prompt,
      template: normalizedTemplate,

      config: (payload.config ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      status: JobStatus.PENDING,
      priority,
    },
  });

  const jobPayload: JobPayload = {
    ...payload,
    template: normalizedTemplate,
    priority,
  };

  const job: Job = {
    id: jobRecord.id,
    payload: jobPayload,
    priority,
    createdAt: jobRecord.createdAt.toISOString(),
  };

  await redis.zadd(QUEUE_KEY, {
    score: priority,
    member: JSON.stringify(job),
  });

  console.log("[queue] enqueue", job.id, "priority", priority);
  return job.id;
}

export async function dequeueJob(): Promise<Job | null> {
  const result = await redis.zpopmin<string[]>(QUEUE_KEY);
  if (!result || result.length === 0) {
    return null;
  }

  const [serialized] = result;
  if (!serialized) {
    return null;
  }

  const job: Job = JSON.parse(serialized) as Job;

  await redis.sadd(PROCESSING_KEY, job.id);

  await prisma.generationJob.update({
    where: { id: job.id },
    data: {
      status: JobStatus.PROCESSING,
      startedAt: new Date(),
    },
  });

  console.log("[queue] dequeue", job.id);
  return job;
}

export async function completeJob(jobId: string, gameId?: string, error?: string) {
  await redis.srem(PROCESSING_KEY, jobId);

  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: error ? JobStatus.FAILED : JobStatus.COMPLETED,
      gameId: gameId ?? null,
      errorMessage: error ?? null,
      completedAt: new Date(),
    },
  });

  console.log("[queue] complete", jobId, error ? "FAILED" : "COMPLETED");
}

export async function getJobStatus(jobId: string): Promise<GenerationJob | null> {
  return prisma.generationJob.findUnique({ where: { id: jobId } });
}

export async function getQueueStats() {
  const [pending, processing, recentJobs] = await Promise.all([
    redis.zcard(QUEUE_KEY),
    redis.scard(PROCESSING_KEY),
    prisma.generationJob.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
    }),
  ]);

  console.log("[queue] stats", { pending, processing, recentJobs });
  return { pending, processing, recentJobs };
}

export async function clearStaleJobs(timeoutMs = 5 * 60 * 1000): Promise<number> {
  const staleJobs = await prisma.generationJob.findMany({
    where: {
      status: JobStatus.PROCESSING,
      startedAt: {
        lt: new Date(Date.now() - timeoutMs),
      },
    },
  });

  for (const job of staleJobs) {
    await completeJob(job.id, undefined, "Job timeout");
  }

  console.log("[queue] cleared stale jobs", staleJobs.length);
  return staleJobs.length;
}

