import OpenAI from "openai";
import { z } from "zod";

/**
 * Shared OpenAI client for image generation.
 * Requires the `OPENAI_API_KEY` environment variable to be defined.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Validation schema for sprite generation requests.
 */
const SpriteRequestSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  style: z.enum(["pixel-art", "cartoon", "2d-vector", "hand-drawn"]).default("cartoon"),
  size: z.enum(["1024x1024", "1024x1792", "1792x1024"]).default("1024x1024"),
  quality: z.enum(["standard", "hd"]).default("standard"),
  background: z.enum(["transparent", "white", "black"]).default("white"),
});

export type SpriteRequest = z.input<typeof SpriteRequestSchema>;

export interface GeneratedSprite {
  url: string;
  prompt: string;
  revised_prompt?: string;
  timestamp: string;
}

type SpriteStyle = z.output<typeof SpriteRequestSchema>["style"];

const styleDescriptions: Record<SpriteStyle, string> = {
  "pixel-art": "8-bit pixel art, retro gaming, crisp pixels",
  cartoon: "2D cartoon, bold outlines, vibrant colors",
  "2d-vector": "Clean 2D vector art, flat colors, modern",
  "hand-drawn": "Hand-drawn illustration, sketchy lines, artistic",
};

/**
 * Generates a single sprite using DALL·E 3 according to the provided request.
 */
export async function generateSprite(request: SpriteRequest): Promise<GeneratedSprite> {
  const parsed = SpriteRequestSchema.parse(request);

  const description = styleDescriptions[parsed.style];
  const prompt = `${description}. Subject: ${parsed.subject}. ${parsed.background} background. Simple, clean, game-ready asset. No text, no UI. Centered composition. High contrast.`;

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      size: parsed.size,
      quality: parsed.quality,
      n: 1,
    });

    const image = response.data?.[0];

    if (!image?.url) {
      throw new Error("No URL returned from DALL·E response");
    }

    return {
      url: image.url,
      prompt,
      revised_prompt: image.revised_prompt ?? undefined,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[dalle] generateSprite error", error);
    throw error;
  }
}

/**
 * Generates multiple sprites in batches, respecting rate limits.
 * Only fulfilled results are returned; failures are logged.
 */
export async function generateSpriteSet(requests: SpriteRequest[]): Promise<GeneratedSprite[]> {
  const results: GeneratedSprite[] = [];

  for (let i = 0; i < requests.length; i += 3) {
    const batch = requests.slice(i, i + 3);
    const settled = await Promise.allSettled(batch.map((req) => generateSprite(req)));
    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        results.push(outcome.value);
      } else {
        console.error("[dalle] sprite generation failed", outcome.reason);
      }
    }

    if (i + 3 < requests.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

export const SPRITE_PRESETS = {
  player: {
    human: "Hero character, friendly expression, ready to play",
    robot: "Cute robot companion, glowing eyes, metallic body",
    animal: "Charming animal hero, expressive eyes, whimsical",
  },
  enemy: {
    basic: "Regular enemy, intimidating but simple design",
    flying: "Flying enemy, wings or jet boosters, agile",
    boss: "Boss enemy, larger scale, detailed armor",
  },
  platform: {
    grass: "Grassy platform tile, lush green top, earthy sides",
    stone: "Stone platform tile, rugged texture, heavy",
    metal: "Metal platform tile, industrial, riveted",
  },
  collectible: {
    coin: "Shiny coin collectible, gold, glimmering",
    gem: "Precious gem collectible, vibrant colors",
    star: "Magical star collectible, glowing aura",
  },
  background: {
    forest: "Forest backdrop, layered trees, soft lighting",
    city: "City skyline backdrop, neon lights, futuristic",
    space: "Outer space backdrop, stars and nebulae",
  },
} as const;

export type TemplateKey = "platformer" | "shooter" | "puzzle" | "racing";

const templateAssetDefinitions: Record<TemplateKey, Array<{ key: string; subject: string }>> = {
  platformer: [
    { key: "player", subject: SPRITE_PRESETS.player.human },
    { key: "enemy", subject: SPRITE_PRESETS.enemy.basic },
    { key: "platform", subject: SPRITE_PRESETS.platform.grass },
    { key: "collectible", subject: SPRITE_PRESETS.collectible.coin },
  ],
  shooter: [
    { key: "player", subject: "Top-down ship hero, aerodynamic design, glowing engine" },
    { key: "enemy", subject: SPRITE_PRESETS.enemy.flying },
    { key: "bullet", subject: "Projectile bullet, energy trail, glowing effect" },
  ],
  puzzle: [
    { key: "block_red", subject: "Red puzzle block tile, glossy finish, soft shadows" },
    { key: "block_blue", subject: "Blue puzzle block tile, glossy finish, soft shadows" },
    { key: "block_green", subject: "Green puzzle block tile, glossy finish, soft shadows" },
  ],
  racing: [
    { key: "car", subject: "Player race car, sleek silhouette, vibrant paint job" },
    { key: "track", subject: "Race track segment, striped edges, dynamic perspective" },
    { key: "obstacle", subject: "Racing obstacle, hazard cone or barrier, high contrast" },
  ],
};

export const TEMPLATE_ASSET_DEFINITIONS = templateAssetDefinitions as Readonly<
  typeof templateAssetDefinitions
>;

/**
 * Generates a set of sprites tailored to the provided game template.
 */
export async function generateGameAssetSet(
  template: TemplateKey,
  style: SpriteRequest["style"] = "cartoon",
): Promise<Record<string, GeneratedSprite>> {
  const definitions = templateAssetDefinitions[template];
  if (!definitions) {
    throw new Error(`Unknown template: ${template}`);
  }

  const requests: SpriteRequest[] = definitions.map((definition) => ({
    subject: definition.subject,
    style,
  }));

  const sprites = await generateSpriteSet(requests);
  const result: Record<string, GeneratedSprite> = {};

  definitions.forEach(({ key }, index) => {
    if (sprites[index]) {
      result[key] = sprites[index];
    }
  });

  return result;
}

