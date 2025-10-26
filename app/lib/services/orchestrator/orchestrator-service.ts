/**
 * Orchestrator Service
 *
 * The brain of the system. Coordinates all AI departments, template loading,
 * asset generation, and game assembly.
 */

import { logger } from "../../logger";
import { visualDepartment } from "../ai/visual-department";
import { codeDepartment } from "../ai/code-department";
import { templateService } from "../template/template-service";
import { storageService } from "../storage/storage-service";
import { gameAssembler } from "../../assembler/game-assembler";
import type { GameTemplate } from "@/types/game";
import type { AssemblyParts } from "../../assembler/game-assembler";

export interface GameGenerationRequest {
  gameType: GameTemplate;
  theme: string;
  playerDescription: string;
  difficulty: "easy" | "medium" | "hard";
  mechanics?: string[];
  enemies?: string[];
  style?: "pixel-art" | "hand-drawn" | "realistic" | "cartoon";
  userId: string;
  userEmail: string;
}

export interface GameGenerationResult {
  jobId: string;
  downloadUrl: string;
  assets: {
    playerSprite: string;
    background: string;
    enemySprites: string[];
  };
  metadata: {
    gameType: string;
    theme: string;
    generatedAt: string;
    packageSize: number;
  };
}

export interface GenerationProgress {
  jobId: string;
  status: "pending" | "generating_sprites" | "generating_code" | "assembling" | "completed" | "failed";
  progress: number;
  currentStep: string;
  error?: string;
}

export class OrchestratorService {
  /**
   * Generate a complete game from user specifications
   */
  async generateGame(
    request: GameGenerationRequest
  ): Promise<GameGenerationResult> {
    const jobId = this.generateJobId();
    logger.info("Orchestrator: Starting game generation", { jobId, request });

    try {
      // Step 1: Generate visual assets (30% of progress)
      logger.info("Orchestrator: Generating visual assets", { jobId });
      const sprites = await this.generateVisualAssets(request);

      // Step 2: Generate game code (30% of progress)
      logger.info("Orchestrator: Generating game code", { jobId });
      const code = await this.generateGameCode(request);

      // Step 3: Load template (10% of progress)
      logger.info("Orchestrator: Loading template", { jobId });
      const templateFiles = await templateService.getTemplate(request.gameType);

      // Step 4: Assemble game (20% of progress)
      logger.info("Orchestrator: Assembling game", { jobId });
      const assembled = await this.assembleGame({
        request,
        sprites,
        code,
        templateFiles,
        jobId,
      });

      // Step 5: Create and store package (10% of progress)
      logger.info("Orchestrator: Creating package", { jobId });
      const packageAsset = await this.createAndStorePackage(
        assembled,
        jobId,
        request.userId
      );

      const result: GameGenerationResult = {
        jobId,
        downloadUrl: packageAsset.url,
        assets: {
          playerSprite: sprites.player.url,
          background: sprites.background.url,
          enemySprites: sprites.enemies.map((e) => e.url),
        },
        metadata: {
          gameType: request.gameType,
          theme: request.theme,
          generatedAt: new Date().toISOString(),
          packageSize: packageAsset.size,
        },
      };

      logger.info("Orchestrator: Game generation complete", {
        jobId,
        packageSize: result.metadata.packageSize,
      });

      return result;
    } catch (error) {
      logger.error("Orchestrator: Game generation failed", { jobId, error });
      throw new Error(`Game generation failed: ${error}`);
    }
  }

  /**
   * Generate all visual assets using Visual Department
   */
  private async generateVisualAssets(request: GameGenerationRequest) {
    logger.info("Orchestrator: Calling Visual Department");

    const style = request.style || "cartoon";

    // Generate sprites in parallel
    const spriteSet = await visualDepartment.generateSpriteSet({
      player: {
        description: request.playerDescription,
        theme: request.theme,
        style,
      },
      enemies: request.enemies?.map((desc) => ({
        description: desc,
        theme: request.theme,
        style,
      })),
      background: request.theme,
    });

    return spriteSet;
  }

  /**
   * Generate game code using Code Department
   */
  private async generateGameCode(request: GameGenerationRequest) {
    logger.info("Orchestrator: Calling Code Department");

    const code = await codeDepartment.generateCompleteGame({
      gameType: request.gameType,
      theme: request.theme,
      mechanics: request.mechanics || [],
      difficulty: request.difficulty,
      playerDescription: request.playerDescription,
      enemyDescriptions: request.enemies,
    });

    return code;
  }

  /**
   * Assemble the complete game package
   */
  private async assembleGame(params: {
    request: GameGenerationRequest;
    sprites: any;
    code: any;
    templateFiles: any;
    jobId: string;
  }) {
    logger.info("Orchestrator: Calling Game Assembler");

    const { request, sprites, code, templateFiles, jobId } = params;

    const assemblyParts: AssemblyParts = {
      template: {
        type: request.gameType,
        files: templateFiles,
      },
      sprites: {
        player: sprites.player.url,
        background: sprites.background.url,
        enemies: sprites.enemies.map((e: any) => e.url),
      },
      code: {
        playerLogic: code.playerLogic,
        enemyLogic: code.enemyLogic,
        physicsConfig: code.physicsConfig,
        levelDesign: code.levelDesign,
        gameLoop: code.gameLoop,
      },
      metadata: {
        gameType: request.gameType,
        theme: request.theme,
        author: request.userEmail,
        difficulty: request.difficulty,
        createdAt: new Date().toISOString(),
      },
    };

    const assembled = await gameAssembler.assemble(assemblyParts);
    return assembled;
  }

  /**
   * Create ZIP package and store it
   */
  private async createAndStorePackage(
    assembled: any,
    jobId: string,
    userId: string
  ) {
    logger.info("Orchestrator: Creating ZIP package");

    // Create ZIP
    const zipBuffer = await gameAssembler.createZip(assembled);

    // Store package
    const packageAsset = await storageService.storePackage(
      zipBuffer,
      jobId,
      userId
    );

    return packageAsset;
  }

  /**
   * Generate a unique job ID
   */
  private generateJobId(): string {
    return `game-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Estimate generation time based on request complexity
   */
  estimateGenerationTime(request: GameGenerationRequest): number {
    let baseTime = 30; // 30 seconds base

    // Add time for each enemy
    const enemyCount = request.enemies?.length || 1;
    baseTime += enemyCount * 10; // 10 seconds per enemy

    // Add time for custom mechanics
    const mechanicCount = request.mechanics?.length || 0;
    baseTime += mechanicCount * 5; // 5 seconds per mechanic

    // Adjust for difficulty
    const difficultyMultiplier = {
      easy: 0.8,
      medium: 1.0,
      hard: 1.2,
    };
    baseTime *= difficultyMultiplier[request.difficulty];

    return Math.ceil(baseTime);
  }

  /**
   * Validate generation request
   */
  validateRequest(
    request: GameGenerationRequest
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.gameType) {
      errors.push("Game type is required");
    }

    if (!request.theme || request.theme.trim().length < 3) {
      errors.push("Theme must be at least 3 characters");
    }

    if (
      !request.playerDescription ||
      request.playerDescription.trim().length < 10
    ) {
      errors.push("Player description must be at least 10 characters");
    }

    if (!["easy", "medium", "hard"].includes(request.difficulty)) {
      errors.push("Difficulty must be easy, medium, or hard");
    }

    if (!request.userId) {
      errors.push("User ID is required");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get generation progress (placeholder for future job queue integration)
   */
  async getProgress(jobId: string): Promise<GenerationProgress> {
    // This would query a job queue/database in production
    return {
      jobId,
      status: "pending",
      progress: 0,
      currentStep: "Initializing...",
    };
  }

  /**
   * Cancel a generation job (placeholder for future job queue integration)
   */
  async cancelGeneration(jobId: string): Promise<boolean> {
    logger.warn("Orchestrator: Cancel not yet implemented", { jobId });
    return false;
  }
}

// Singleton instance
export const orchestratorService = new OrchestratorService();
