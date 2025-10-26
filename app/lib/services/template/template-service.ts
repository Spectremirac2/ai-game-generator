/**
 * Template Service
 *
 * Manages game templates - loading, caching, and providing template metadata
 */

import { logger } from "../../logger";
import * as fs from "fs/promises";
import * as path from "path";
import type { GameTemplate } from "@/types/game";

export interface TemplateMetadata {
  id: GameTemplate;
  name: string;
  description: string;
  icon: string;
  mechanics: string[];
  difficulty: string;
}

export interface TemplateFiles {
  html: string;
  js: string;
  readme: string;
}

export class TemplateService {
  private templatePath: string;
  private cache: Map<string, TemplateFiles> = new Map();

  constructor() {
    this.templatePath = path.join(process.cwd(), "public", "templates");
  }

  /**
   * Get metadata for all available templates
   */
  getTemplateMetadata(): TemplateMetadata[] {
    return [
      {
        id: "platformer",
        name: "Platformer",
        description: "Classic jump-and-run gameplay with platforms and enemies",
        icon: "🏃",
        mechanics: ["Jumping", "Running", "Collecting", "Enemy Avoidance"],
        difficulty: "Beginner-friendly",
      },
      {
        id: "puzzle",
        name: "Puzzle",
        description: "Logic-based challenges and pattern matching",
        icon: "🧩",
        mechanics: ["Match-3", "Tile Swapping", "Combo System"],
        difficulty: "Medium",
      },
      {
        id: "shooter",
        name: "Shooter",
        description: "Action-oriented shooting mechanics",
        icon: "🎯",
        mechanics: ["Shooting", "Dodging", "Power-ups", "Enemy Waves"],
        difficulty: "Medium",
      },
      {
        id: "racing",
        name: "Racing",
        description: "Speed-based competitive gameplay",
        icon: "🏎️",
        mechanics: ["Acceleration", "Drifting", "Obstacles", "Time Trial"],
        difficulty: "Advanced",
      },
      {
        id: "custom",
        name: "Custom",
        description: "Fully AI-generated from scratch",
        icon: "✨",
        mechanics: ["Anything You Imagine"],
        difficulty: "Experimental",
      },
    ];
  }

  /**
   * Load template files for a given template type
   */
  async loadTemplate(templateType: GameTemplate): Promise<TemplateFiles> {
    logger.info("Template Service: Loading template", { templateType });

    // Check cache first
    if (this.cache.has(templateType)) {
      logger.info("Template Service: Using cached template", { templateType });
      return this.cache.get(templateType)!;
    }

    try {
      const templateDir = path.join(this.templatePath, templateType);

      // Check if template exists
      const exists = await this.templateExists(templateDir);
      if (!exists) {
        throw new Error(`Template "${templateType}" not found`);
      }

      // Load all template files
      const [html, js, readme] = await Promise.all([
        fs.readFile(path.join(templateDir, "index.html"), "utf-8"),
        fs.readFile(path.join(templateDir, "template.js"), "utf-8"),
        fs.readFile(path.join(templateDir, "README.md"), "utf-8"),
      ]);

      const templateFiles: TemplateFiles = { html, js, readme };

      // Cache for future use
      this.cache.set(templateType, templateFiles);

      logger.info("Template Service: Template loaded successfully", {
        templateType,
        htmlSize: html.length,
        jsSize: js.length,
      });

      return templateFiles;
    } catch (error) {
      logger.error("Template Service: Failed to load template", {
        templateType,
        error,
      });

      // If template doesn't exist, fall back to platformer
      if (templateType !== "platformer") {
        logger.warn("Template Service: Falling back to platformer template");
        return this.loadTemplate("platformer");
      }

      throw new Error(`Failed to load template: ${error}`);
    }
  }

  /**
   * Check if a template exists
   */
  private async templateExists(templateDir: string): Promise<boolean> {
    try {
      const stats = await fs.stat(templateDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get template for a specific game type
   */
  async getTemplate(gameType: GameTemplate): Promise<TemplateFiles> {
    return this.loadTemplate(gameType);
  }

  /**
   * Validate template has required placeholders
   */
  validateTemplate(templateJs: string): { valid: boolean; missing: string[] } {
    const requiredPlaceholders = [
      "[PLAYER_SPRITE_PATH]",
      "[BG_SPRITE_PATH]",
      "[ENEMY_SPRITE_PATHS]",
      "[PLAYER_LOGIC_CODE]",
      "[PHYSICS_CODE]",
    ];

    const missing = requiredPlaceholders.filter(
      (placeholder) => !templateJs.includes(placeholder)
    );

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info("Template Service: Cache cleared");
  }

  /**
   * Preload all templates (useful for production)
   */
  async preloadAllTemplates(): Promise<void> {
    logger.info("Template Service: Preloading all templates");

    const templates: GameTemplate[] = [
      "platformer",
      "puzzle",
      "shooter",
      "racing",
      "custom",
    ];

    const results = await Promise.allSettled(
      templates.map((type) => this.loadTemplate(type))
    );

    const loaded = results.filter((r) => r.status === "fulfilled").length;
    logger.info("Template Service: Preloading complete", {
      loaded,
      total: templates.length,
    });
  }
}

// Singleton instance
export const templateService = new TemplateService();
