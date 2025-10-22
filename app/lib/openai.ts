import OpenAI from "openai";
import { z } from "zod";
import type { GameMetadata, GameTemplate } from "../types/game";

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY is not set. Please define it in your environment before using the OpenAI client."
  );
}

/**
 * Shared OpenAI client configured for server-side usage.
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Zod schema enforcing the minimum structure returned from the LLM when generating game code.
 */
export const GameCodeSchema = z.object({
  code: z.string().min(100, "Generated code appears to be incomplete."),
  title: z.string().min(1, "A descriptive title is required."),
  description: z.string().min(1, "A concise description is required."),
  difficulty: z.enum(["easy", "medium", "hard"], {
    message: "Difficulty must be 'easy', 'medium', or 'hard'.",
  }),
  controls: z.object({
    movement: z
      .string()
      .min(1, "Explain how the player moves (e.g., 'Arrow keys or WASD for movement')."),
    jump: z.string().optional(),
    action: z.string().optional(),
  }),
});

const MetadataSchema = GameCodeSchema.extend({
  estimatedPlayTime: z
    .string()
    .min(1, "Provide an estimated play time such as '5-10 minutes'."),
}).omit({ code: true });

export type GameCode = z.infer<typeof GameCodeSchema>;

export interface GenerationUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface GameCodeOutput extends GameCode {
  metadata: GameMetadata;
  usage?: GenerationUsage;
}

/**
 * Detailed system prompts for each supported template.
 */
export const SYSTEM_PROMPTS: Record<GameTemplate, string> = {
  platformer: `You are an expert Phaser.js game developer. Generate a complete platformer game with:
- Phaser 3 syntax
- Player movement (arrow keys/WASD)
- Jump mechanics
- Platforms and obstacles
- Collision detection
- Score system
- CRITICAL: Use ONLY this.add.rectangle() and this.add.text() for ALL visuals
- NEVER use this.load.image(), this.load.sprite(), or any image loading
- Do NOT use placeholder base64 images or external URLs
- The preload() function should be empty or only contain this.load.image calls that are never used
- Create ALL game objects with this.add.rectangle() in the create() function
- Complete preload, create, update functions
Output ONLY valid JavaScript, no explanations.`,
  puzzle: `You are an expert Phaser.js game developer. Generate a complete puzzle game with:
- Phaser 3 syntax
- Grid-based or logic puzzle mechanics
- Mouse and keyboard input handling instructions on screen
- Level reset or undo functionality
- Scoring or progress tracking
- CRITICAL: Use ONLY this.add.rectangle() and this.add.text() for ALL visuals
- NEVER use this.load.image(), this.load.sprite(), or any image loading
- Do NOT use placeholder base64 images or external URLs
- Create ALL game objects with this.add.rectangle() in the create() function
- Implement preload, create, update functions fully
Output ONLY valid JavaScript, no explanations.`,
  shooter: `You are an expert Phaser.js game developer. Generate a complete top-down shooter game with:
- Phaser 3 syntax
- Player movement with arrow keys or WASD
- Shooting controls (spacebar or mouse)
- Enemy spawning waves with increasing difficulty
- Health and score tracking
- CRITICAL: Use ONLY this.add.rectangle() and this.add.text() for ALL visuals
- NEVER use this.load.image(), this.load.sprite(), or any image loading
- Do NOT use placeholder base64 images or external URLs
- Create ALL game objects with this.add.rectangle() in the create() function
- Complete preload, create, update functions with collision handling
Output ONLY valid JavaScript, no explanations.`,
  racing: `You are an expert Phaser.js game developer. Generate a complete racing game with:
- Phaser 3 syntax
- Player vehicle controlled with arrow keys (accelerate, brake, steer)
- Track layout with checkpoints or lap counter
- Opponent or time-trial mechanics
- HUD with speed and lap information
- CRITICAL: Use ONLY this.add.rectangle() and this.add.text() for ALL visuals
- NEVER use this.load.image(), this.load.sprite(), or any image loading
- Do NOT use placeholder base64 images or external URLs
- Create ALL game objects with this.add.rectangle() in the create() function
- Implement preload, create, update functions completely
Output ONLY valid JavaScript, no explanations.`,
  custom: `You are an expert Phaser.js game developer. Generate a complete game tailored to the user's request with:
- Phaser 3 syntax
- Mechanics and controls derived from the provided prompt
- Clear instructions within the scene for how to play
- Scoring or objective tracking
- CRITICAL: Use ONLY this.add.rectangle() and this.add.text() for ALL visuals
- NEVER use this.load.image(), this.load.sprite(), or any image loading
- Do NOT use placeholder base64 images or external URLs
- Create ALL game objects with this.add.rectangle() in the create() function
- Complete preload, create, update functions and ensure the code runs standalone
Output ONLY valid JavaScript, no explanations.`,
};

interface CostEstimateInput {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Estimates the OpenAI API cost in USD based on approximate token usage for gpt-4o-mini.
 *
 * Pricing reference (Oct 2025):
 * - Input tokens: $0.00015 per 1K tokens
 * - Output tokens: $0.00060 per 1K tokens
 */
export function estimateCost({ inputTokens, outputTokens }: CostEstimateInput): number {
  const INPUT_RATE_PER_TOKEN = 0.00015 / 1000;
  const OUTPUT_RATE_PER_TOKEN = 0.0006 / 1000;
  const cost =
    inputTokens * INPUT_RATE_PER_TOKEN +
    outputTokens * OUTPUT_RATE_PER_TOKEN;
  return Number(cost.toFixed(6));
}

/**
 * Generates Phaser.js game code along with structured metadata using OpenAI.
 */
export async function generateGameCode(
  prompt: string,
  template: GameTemplate,
  maxRetries = 3
): Promise<GameCodeOutput> {
  if (!prompt.trim()) {
    throw new Error("Prompt cannot be empty when generating game code.");
  }

  const systemPrompt = SYSTEM_PROMPTS[template];
  if (!systemPrompt) {
    throw new Error(`Unsupported game template "${template}".`);
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const { code, usage: generationUsage } = await requestGameCode(prompt, template, systemPrompt);
      const metadata = await generateMetadata(code, prompt, template);

      const validated = GameCodeSchema.parse({
        code,
        title: metadata.title,
        description: metadata.description,
        difficulty: metadata.difficulty,
        controls: metadata.controls,
      });

      const totalUsage = combineUsage(generationUsage, metadata.usage);
      const result: GameCodeOutput = {
        ...validated,
        metadata: {
          title: metadata.title,
          description: metadata.description,
          difficulty: metadata.difficulty,
          estimatedPlayTime: metadata.estimatedPlayTime,
          template,
        },
        usage: totalUsage,
      };

      return result;
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries || !isRetryableError(error)) {
        throw enrichError(error, attempt, maxRetries);
      }
      await delay(2 ** attempt * 1000);
    }
  }

  throw enrichError(lastError, maxRetries, maxRetries);
}

async function requestGameCode(
  prompt: string,
  template: GameTemplate,
  systemPrompt: string
): Promise<{ code: string; usage: GenerationUsage }> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 2_500,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          `Game Template: ${template}`,
          `User Prompt: ${prompt}`,
          "Produce fully-functional Phaser 3 code inside a single ```javascript``` block.",
          "Do not include explanations or commentary outside the code block.",
        ].join("\n"),
      },
    ],
  });

  const messageContent = completion.choices[0]?.message?.content?.trim();
  if (!messageContent) {
    throw new Error("OpenAI returned an empty response while generating game code.");
  }

  const code = extractCodeBlock(messageContent);
  if (!code.includes("Phaser")) {
    throw new Error("Generated code does not reference Phaser. Please refine the prompt and retry.");
  }

  if (code.length < 100) {
    throw new Error("Generated code is unexpectedly short. The prompt may need more detail.");
  }

  const usage = normalizeUsage(completion.usage);

  return { code, usage };
}

async function generateMetadata(code: string, prompt: string, template: GameTemplate) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content:
          "You are a concise game design assistant. Return compact JSON describing the game without additional commentary.",
      },
      {
        role: "user",
        content: [
          "Summarize the following Phaser 3 game code and provide gameplay metadata.",
          "Respond strictly in JSON with the shape:",
          "{ \"title\": string, \"description\": string, \"difficulty\": \"easy\"|\"medium\"|\"hard\", \"estimatedPlayTime\": string, \"controls\": { \"movement\": string, \"jump\"?: string, \"action\"?: string } }",
          "Avoid newline characters inside values unless necessary.",
          "",
          `Template: ${template}`,
          `Original Prompt: ${prompt}`,
          "",
          "Phaser Code:",
          code,
        ].join("\n"),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned an empty response while generating metadata.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Failed to parse metadata JSON from OpenAI. Received: ${raw}. ${(error as Error).message}`
    );
  }

  const validated = MetadataSchema.parse(parsedJson);
  const usage = normalizeUsage(completion.usage);

  return { ...validated, usage };
}

function extractCodeBlock(content: string): string {
  const codeBlockRegex = /```(?:javascript|js|typescript|ts)?\s*([\s\S]*?)```/i;
  const match = codeBlockRegex.exec(content);
  if (match && match[1]) {
    return match[1].trim();
  }
  return content.trim();
}

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const err = error as { status?: number; message?: string };
  if (err.status === 429) {
    return true;
  }
  const message = err.message?.toLowerCase() ?? "";
  return message.includes("rate limit") || message.includes("timeout") || message.includes("overloaded");
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function enrichError(error: unknown, attempt: number, maxRetries: number): Error {
  const baseMessage = `Failed to generate game code after ${attempt}/${maxRetries} attempts.`;

  if (error instanceof Error) {
    const enriched = new Error(`${baseMessage} Reason: ${error.message}`);
    (enriched as Error & { cause?: unknown }).cause = error;
    return enriched;
  }

  return new Error(baseMessage);
}

type ChatUsage =
  | {
      prompt_tokens?: number | null;
      completion_tokens?: number | null;
      total_tokens?: number | null;
    }
  | null
  | undefined;

function normalizeUsage(usage: ChatUsage): GenerationUsage {
  const inputTokens = usage?.prompt_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? 0;
  const totalTokens = usage?.total_tokens ?? inputTokens + outputTokens;
  const estimatedCost = estimateCost({ inputTokens, outputTokens });
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
  };
}

function combineUsage(
  a?: GenerationUsage,
  b?: GenerationUsage
): GenerationUsage | undefined {
  if (!a && !b) {
    return undefined;
  }

  const inputTokens = (a?.inputTokens ?? 0) + (b?.inputTokens ?? 0);
  const outputTokens = (a?.outputTokens ?? 0) + (b?.outputTokens ?? 0);
  const totalTokens = (a?.totalTokens ?? 0) + (b?.totalTokens ?? 0);
  const estimatedCost = estimateCost({ inputTokens, outputTokens });

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
  };
}
