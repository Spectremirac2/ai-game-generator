/**
 * Visual Department - AI Service for Image Generation
 *
 * Responsibilities:
 * - Generate player/enemy sprites
 * - Create background artwork
 * - Produce UI elements
 * - Optimize image sizes
 */

import OpenAI from "openai";
import { logger } from "../../logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SpriteGenerationRequest {
  description: string;
  theme: string;
  style?: "pixel-art" | "hand-drawn" | "realistic" | "cartoon";
  size?: "256x256" | "512x512" | "1024x1024";
}

export interface GeneratedSprite {
  url: string;
  revised_prompt: string;
  size: string;
}

export class VisualDepartment {
  /**
   * Generate a player sprite based on description
   */
  async generatePlayerSprite(
    request: SpriteGenerationRequest
  ): Promise<GeneratedSprite> {
    logger.info("Visual Department: Generating player sprite", { request });

    const prompt = this.buildSpritePrompt(request, "player character");

    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: request.size || "1024x1024",
        quality: "standard",
        style: "vivid",
      });

      const image = response.data[0];

      logger.info("Visual Department: Player sprite generated", {
        url: image.url,
        revised_prompt: image.revised_prompt,
      });

      return {
        url: image.url!,
        revised_prompt: image.revised_prompt!,
        size: request.size || "1024x1024",
      };
    } catch (error) {
      logger.error("Visual Department: Failed to generate player sprite", {
        error,
      });
      throw new Error(`Failed to generate player sprite: ${error}`);
    }
  }

  /**
   * Generate an enemy sprite
   */
  async generateEnemySprite(
    request: SpriteGenerationRequest
  ): Promise<GeneratedSprite> {
    logger.info("Visual Department: Generating enemy sprite", { request });

    const prompt = this.buildSpritePrompt(request, "enemy character");

    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: request.size || "1024x1024",
        quality: "standard",
        style: "vivid",
      });

      const image = response.data[0];

      logger.info("Visual Department: Enemy sprite generated", {
        url: image.url,
        revised_prompt: image.revised_prompt,
      });

      return {
        url: image.url!,
        revised_prompt: image.revised_prompt!,
        size: request.size || "1024x1024",
      };
    } catch (error) {
      logger.error("Visual Department: Failed to generate enemy sprite", {
        error,
      });
      throw new Error(`Failed to generate enemy sprite: ${error}`);
    }
  }

  /**
   * Generate a background image
   */
  async generateBackground(
    theme: string,
    style?: string
  ): Promise<GeneratedSprite> {
    logger.info("Visual Department: Generating background", { theme, style });

    const prompt = `Create a seamless, tileable game background for a ${theme} themed game.
Style: ${style || "vibrant and colorful"}.
The background should be suitable for a 2D platformer game, with clear foreground and background layers.
Make it visually appealing but not too busy, so game elements remain visible.`;

    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid",
      });

      const image = response.data[0];

      logger.info("Visual Department: Background generated", {
        url: image.url,
        revised_prompt: image.revised_prompt,
      });

      return {
        url: image.url!,
        revised_prompt: image.revised_prompt!,
        size: "1024x1024",
      };
    } catch (error) {
      logger.error("Visual Department: Failed to generate background", {
        error,
      });
      throw new Error(`Failed to generate background: ${error}`);
    }
  }

  /**
   * Generate multiple sprites in parallel
   */
  async generateSpriteSet(requests: {
    player: SpriteGenerationRequest;
    enemies?: SpriteGenerationRequest[];
    background: string;
  }): Promise<{
    player: GeneratedSprite;
    enemies: GeneratedSprite[];
    background: GeneratedSprite;
  }> {
    logger.info("Visual Department: Generating sprite set", {
      requestCount: 1 + (requests.enemies?.length || 0) + 1,
    });

    const [player, background, ...enemies] = await Promise.all([
      this.generatePlayerSprite(requests.player),
      this.generateBackground(requests.background, requests.player.style),
      ...(requests.enemies?.map((enemy) => this.generateEnemySprite(enemy)) ||
        []),
    ]);

    logger.info("Visual Department: Sprite set generated", {
      sprites: { player: true, background: true, enemies: enemies.length },
    });

    return {
      player,
      enemies,
      background,
    };
  }

  /**
   * Build a sprite prompt from request
   */
  private buildSpritePrompt(
    request: SpriteGenerationRequest,
    type: string
  ): string {
    const styleGuide = {
      "pixel-art":
        "in pixel art style, 16-bit retro game aesthetic, clean pixels, limited color palette",
      "hand-drawn":
        "in hand-drawn style, sketchy and artistic, with visible brush strokes",
      realistic:
        "in realistic style, detailed and photorealistic, with proper lighting and shadows",
      cartoon:
        "in cartoon style, vibrant colors, exaggerated features, family-friendly",
    };

    const style = request.style
      ? styleGuide[request.style]
      : "in vibrant game art style";

    return `Create a ${type} sprite for a ${request.theme} themed 2D game.
Description: ${request.description}
Style: ${style}
The sprite should be on a transparent or solid background, centered, with clear silhouette.
Make it suitable for a game character that will be animated.
Full body view, facing forward or slightly to the side.`;
  }

  /**
   * Download and optimize sprite from URL
   * (In production, this would resize and compress the image)
   */
  async optimizeSprite(url: string): Promise<Buffer> {
    logger.info("Visual Department: Optimizing sprite", { url });

    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();

      // TODO: Implement actual image optimization
      // - Resize to appropriate dimensions
      // - Compress to reduce file size
      // - Convert to optimal format (WebP/PNG)

      logger.info("Visual Department: Sprite optimized", {
        originalSize: buffer.byteLength,
      });

      return Buffer.from(buffer);
    } catch (error) {
      logger.error("Visual Department: Failed to optimize sprite", { error });
      throw new Error(`Failed to optimize sprite: ${error}`);
    }
  }
}

// Singleton instance
export const visualDepartment = new VisualDepartment();
