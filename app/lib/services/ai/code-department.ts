/**
 * Code Department - AI Service for Game Code Generation
 *
 * Responsibilities:
 * - Write Phaser.js game code
 * - Implement game mechanics
 * - Add collision detection
 * - Generate win/lose conditions
 */

import OpenAI from "openai";
import { logger } from "../../logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GameCodeRequest {
  gameType: "platformer" | "puzzle" | "shooter" | "racing" | "custom";
  theme: string;
  mechanics: string[];
  difficulty: "easy" | "medium" | "hard";
  playerDescription: string;
  enemyDescriptions?: string[];
}

export interface GeneratedCode {
  playerLogic: string;
  enemyLogic?: string;
  physicsConfig: string;
  levelDesign: string;
  gameLoop: string;
  explanation: string;
}

export class CodeDepartment {
  /**
   * Generate complete game code based on specifications
   */
  async generateGameCode(
    request: GameCodeRequest
  ): Promise<GeneratedCode> {
    logger.info("Code Department: Generating game code", { request });

    const prompt = this.buildCodePrompt(request);

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert Phaser.js game developer. Generate clean, working game code based on specifications.
Always use Phaser 3 syntax. Include proper physics, collision detection, and game states.
Return code in a structured JSON format with separate sections for player logic, enemy logic, physics, level design, and game loop.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content!;
      const codeStructure = JSON.parse(content);

      logger.info("Code Department: Game code generated", {
        usage: response.usage,
      });

      return {
        playerLogic: codeStructure.playerLogic || "",
        enemyLogic: codeStructure.enemyLogic || "",
        physicsConfig: codeStructure.physicsConfig || "",
        levelDesign: codeStructure.levelDesign || "",
        gameLoop: codeStructure.gameLoop || "",
        explanation: codeStructure.explanation || "",
      };
    } catch (error) {
      logger.error("Code Department: Failed to generate game code", { error });
      throw new Error(`Failed to generate game code: ${error}`);
    }
  }

  /**
   * Generate player mechanics code
   */
  async generatePlayerMechanics(
    gameType: string,
    description: string,
    difficulty: string
  ): Promise<string> {
    logger.info("Code Department: Generating player mechanics", {
      gameType,
      description,
      difficulty,
    });

    const prompt = `Generate Phaser.js code for player mechanics in a ${gameType} game.
Player: ${description}
Difficulty: ${difficulty}

Include:
1. Movement controls (arrow keys or WASD)
2. Special abilities based on the description
3. Animation handling
4. Input validation
5. Physics properties

Return only the JavaScript code, properly formatted and commented.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert Phaser.js developer. Generate clean, working player mechanics code.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const code = response.choices[0].message.content!;

      logger.info("Code Department: Player mechanics generated");

      return code;
    } catch (error) {
      logger.error("Code Department: Failed to generate player mechanics", {
        error,
      });
      throw new Error(`Failed to generate player mechanics: ${error}`);
    }
  }

  /**
   * Generate enemy AI logic
   */
  async generateEnemyAI(
    gameType: string,
    enemyDescriptions: string[],
    difficulty: string
  ): Promise<string> {
    logger.info("Code Department: Generating enemy AI", {
      gameType,
      enemyCount: enemyDescriptions.length,
      difficulty,
    });

    const prompt = `Generate Phaser.js code for enemy AI in a ${gameType} game.
Enemies: ${enemyDescriptions.join(", ")}
Difficulty: ${difficulty}

Include:
1. Enemy spawning logic
2. Movement patterns
3. Attack behaviors
4. Collision with player
5. Death animations

The AI should be ${difficulty} - adjust speed, health, and aggressiveness accordingly.
Return only the JavaScript code, properly formatted and commented.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert game AI programmer. Generate engaging enemy behaviors.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const code = response.choices[0].message.content!;

      logger.info("Code Department: Enemy AI generated");

      return code;
    } catch (error) {
      logger.error("Code Department: Failed to generate enemy AI", { error });
      throw new Error(`Failed to generate enemy AI: ${error}`);
    }
  }

  /**
   * Generate level design code
   */
  async generateLevelDesign(
    gameType: string,
    theme: string,
    difficulty: string
  ): Promise<string> {
    logger.info("Code Department: Generating level design", {
      gameType,
      theme,
      difficulty,
    });

    const prompt = `Generate Phaser.js code for level design in a ${gameType} game.
Theme: ${theme}
Difficulty: ${difficulty}

Include:
1. Platform/tile placement
2. Collectible item positions
3. Hazard locations
4. Start and end points
5. Level boundaries

The level should be ${difficulty} - adjust platform gaps, hazard density, and complexity.
Return only the JavaScript code with level data, properly formatted and commented.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert game level designer. Generate balanced, fun levels.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const code = response.choices[0].message.content!;

      logger.info("Code Department: Level design generated");

      return code;
    } catch (error) {
      logger.error("Code Department: Failed to generate level design", {
        error,
      });
      throw new Error(`Failed to generate level design: ${error}`);
    }
  }

  /**
   * Validate and sanitize generated code
   */
  async validateCode(code: string): Promise<{ valid: boolean; errors: string[] }> {
    logger.info("Code Department: Validating code", {
      codeLength: code.length,
    });

    // Basic validation checks
    const errors: string[] = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
      /eval\(/gi,
      /new Function\(/gi,
      /document\.write/gi,
      /innerHTML\s*=/gi,
      /__proto__/gi,
      /constructor\[/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(`Dangerous pattern detected: ${pattern}`);
      }
    }

    // Check for required Phaser patterns
    if (!code.includes("Phaser") && !code.includes("this.physics")) {
      errors.push("Code does not appear to be valid Phaser.js code");
    }

    const valid = errors.length === 0;

    logger.info("Code Department: Code validation complete", {
      valid,
      errorCount: errors.length,
    });

    return { valid, errors };
  }

  /**
   * Build comprehensive code generation prompt
   */
  private buildCodePrompt(request: GameCodeRequest): string {
    const mechanicsText = request.mechanics.join(", ");
    const enemiesText = request.enemyDescriptions
      ? request.enemyDescriptions.join(", ")
      : "basic enemies";

    return `Generate complete Phaser.js game code for a ${request.gameType} game.

SPECIFICATIONS:
- Game Type: ${request.gameType}
- Theme: ${request.theme}
- Player: ${request.playerDescription}
- Enemies: ${enemiesText}
- Mechanics: ${mechanicsText}
- Difficulty: ${request.difficulty}

REQUIREMENTS:
1. Use Phaser 3 syntax
2. Include proper physics configuration
3. Implement all requested mechanics
4. Add collision detection
5. Include win/lose conditions
6. Add score tracking
7. Make the game ${request.difficulty} difficulty

OUTPUT FORMAT (JSON):
{
  "playerLogic": "// Player class and mechanics code",
  "enemyLogic": "// Enemy class and AI code",
  "physicsConfig": "// Physics configuration",
  "levelDesign": "// Level layout and object placement",
  "gameLoop": "// Main game loop, update, and render functions",
  "explanation": "// Brief explanation of how the code works"
}

Generate clean, production-ready code with proper comments.`;
  }

  /**
   * Generate complete game in parallel
   */
  async generateCompleteGame(
    request: GameCodeRequest
  ): Promise<GeneratedCode> {
    logger.info("Code Department: Generating complete game in parallel", {
      request,
    });

    try {
      // Generate all parts in parallel for speed
      const [playerLogic, enemyLogic, levelDesign] = await Promise.all([
        this.generatePlayerMechanics(
          request.gameType,
          request.playerDescription,
          request.difficulty
        ),
        request.enemyDescriptions && request.enemyDescriptions.length > 0
          ? this.generateEnemyAI(
              request.gameType,
              request.enemyDescriptions,
              request.difficulty
            )
          : Promise.resolve(""),
        this.generateLevelDesign(
          request.gameType,
          request.theme,
          request.difficulty
        ),
      ]);

      // Generate physics config and game loop
      const physicsConfig = this.generatePhysicsConfig(
        request.gameType,
        request.difficulty
      );
      const gameLoop = this.generateGameLoop(request.gameType);

      logger.info("Code Department: Complete game generated");

      return {
        playerLogic,
        enemyLogic,
        physicsConfig,
        levelDesign,
        gameLoop,
        explanation: `Complete ${request.gameType} game with ${request.difficulty} difficulty`,
      };
    } catch (error) {
      logger.error("Code Department: Failed to generate complete game", {
        error,
      });
      throw new Error(`Failed to generate complete game: ${error}`);
    }
  }

  /**
   * Generate physics configuration
   */
  private generatePhysicsConfig(
    gameType: string,
    difficulty: string
  ): string {
    const configs = {
      platformer: {
        easy: "{ gravity: { y: 600 }, debug: false }",
        medium: "{ gravity: { y: 800 }, debug: false }",
        hard: "{ gravity: { y: 1000 }, debug: false }",
      },
      shooter: {
        easy: "{ gravity: { y: 0 }, debug: false }",
        medium: "{ gravity: { y: 0 }, debug: false }",
        hard: "{ gravity: { y: 0 }, debug: false }",
      },
      puzzle: {
        easy: "{ gravity: { y: 0 }, debug: false }",
        medium: "{ gravity: { y: 0 }, debug: false }",
        hard: "{ gravity: { y: 0 }, debug: false }",
      },
      racing: {
        easy: "{ gravity: { y: 0 }, debug: false }",
        medium: "{ gravity: { y: 0 }, debug: false }",
        hard: "{ gravity: { y: 0 }, debug: false }",
      },
      custom: {
        easy: "{ gravity: { y: 500 }, debug: false }",
        medium: "{ gravity: { y: 700 }, debug: false }",
        hard: "{ gravity: { y: 900 }, debug: false }",
      },
    };

    return (
      configs[gameType as keyof typeof configs]?.[
        difficulty as keyof (typeof configs)["platformer"]
      ] || configs.custom.medium
    );
  }

  /**
   * Generate basic game loop structure
   */
  private generateGameLoop(gameType: string): string {
    return `
// Game Loop
function update(time, delta) {
  // Update player
  updatePlayer();

  // Update enemies
  updateEnemies();

  // Check collisions
  checkCollisions();

  // Update score
  updateScore();

  // Check win/lose conditions
  checkGameState();
}

function render() {
  // Phaser handles rendering automatically
}
    `.trim();
  }
}

// Singleton instance
export const codeDepartment = new CodeDepartment();
