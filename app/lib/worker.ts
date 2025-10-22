import type { Prisma, GameTemplate as PrismaGameTemplate } from "@prisma/client";

import { dequeueJob, completeJob } from "@/lib/queue";
import { generateGameCode } from "@/lib/openai";
import { generateGameAssetSet, TemplateKey } from "@/lib/dalle";
import { createGame } from "@/lib/repositories/gameRepository";
import type { GameTemplate as AppGameTemplate } from "@/types/game";

const toAppTemplate = (template: string): AppGameTemplate => template.toLowerCase() as AppGameTemplate;

const toTemplateKey = (template: string): TemplateKey => template.toLowerCase() as TemplateKey;
const toPrismaTemplate = (template: string): PrismaGameTemplate => template.toUpperCase() as PrismaGameTemplate;

/**
 * Processes a single queued generation job.
 */
export async function processJob(): Promise<boolean> {
  const job = await dequeueJob();
  if (!job) {
    return false;
  }

  console.log("[worker] processing job", job.id);

  try {
        const templateKey = toTemplateKey(job.payload.template);
    const appTemplate = toAppTemplate(job.payload.template);
    const prismaTemplate = toPrismaTemplate(job.payload.template);

    const codeResult = await generateGameCode(job.payload.prompt, appTemplate);
    const assets = await generateGameAssetSet(templateKey);

    let gameId: string | undefined;
    if (job.payload.userId) {
      const game = await createGame({
        userId: job.payload.userId,
        title: codeResult.metadata.title,
        description: codeResult.metadata.description,
        code: codeResult.code,
        template: prismaTemplate,
        prompt: job.payload.prompt,
        difficulty: codeResult.metadata.difficulty,
        assets: assets as unknown as Prisma.JsonValue,
      });
      gameId = game.id;
    }

    await completeJob(job.id, gameId);
    console.log("[worker] completed job", job.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[worker] job failed", job.id, error);
    await completeJob(job.id, undefined, message);
  }

  return true;
}

/**
 * Starts the long-running worker loop. Intended for dedicated workers.
 */
export async function startWorker(): Promise<void> {
  while (true) {
    try {
      const processed = await processJob();
      await new Promise((resolve) => setTimeout(resolve, processed ? 1_000 : 5_000));
    } catch (error) {
      console.error("[worker] unexpected error", error);
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }
}

/**
 * Processes a single job and returns whether one was handled.
 */
export async function processOneJob(): Promise<boolean> {
  return processJob();
}


