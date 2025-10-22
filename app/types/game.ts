/**
 * Describes the available base templates that can be used to generate a game.
 */
export type GameTemplate = "platformer" | "puzzle" | "shooter" | "racing" | "custom";

/**
 * Represents a configurable set of gameplay parameters used to guide generation.
 */
export interface GameConfig {
  /**
   * Selected template that determines the initial gameplay structure.
   */
  type: GameTemplate;
  /**
   * Natural language prompt describing the desired game experience.
   */
  prompt: string;
  /**
   * Optional player control settings for tuning responsiveness and feel.
   */
  playerControls?: {
    /**
     * Horizontal movement speed for the player character.
     */
    moveSpeed?: number;
    /**
     * Vertical impulse applied when the player jumps.
     */
    jumpForce?: number;
  };
  /**
   * Optional physics parameters to refine world interaction and realism.
   */
  physics?: {
    /**
     * Downward acceleration applied to entities in the game world.
     */
    gravity?: number;
    /**
     * Resistance applied to slow moving entities over time.
     */
    friction?: number;
  };
  /**
   * Optional enemy configuration describing population and difficulty.
   */
  enemies?: {
    /**
     * Approximate number of enemies spawned in the generated game.
     */
    count?: number;
    /**
     * General challenge level presented by enemy behaviors.
     */
    difficulty?: "easy" | "medium" | "hard";
  };
}

/**
 * External media resources referenced by the generated game.
 */
export interface GameAssets {
  /**
   * Visual resources used to render game entities and environments.
   */
  sprites: {
    /**
     * Primary sprite for the controllable player character.
     */
    player?: string;
    /**
     * Collection of enemy sprite asset identifiers or URLs.
     */
    enemy?: string[];
    /**
     * Sprite representing solid surfaces or platforms.
     */
    platform?: string;
    /**
     * Background art or parallax layers.
     */
    background?: string;
    /**
     * Optional sprite for collectible items or power-ups.
     */
    collectible?: string;
  };
  /**
   * Audio resources triggered during gameplay.
   */
  sounds?: {
    /**
     * Sound effect played when the player jumps.
     */
    jump?: string;
    /**
     * Sound effect played upon collecting an item.
     */
    collect?: string;
    /**
     * Sound effect triggered when the player loses or the game ends.
     */
    gameover?: string;
  };
}

/**
 * Descriptive information about a generated game for presentation and filtering.
 */
export interface GameMetadata {
  /**
   * Human-readable game name.
   */
  title: string;
  /**
   * Short summary of the gameplay premise.
   */
  description: string;
  /**
   * Template used during generation for categorization.
   */
  template: GameTemplate;
  /**
   * Overall difficulty level communicated to players.
   */
  difficulty: string;
  /**
   * Estimated time required to complete or fully experience the game.
   */
  estimatedPlayTime: string;
}

/**
 * Complete model for a game produced by the generation pipeline.
 */
export interface GeneratedGame {
  /**
   * Unique identifier for referencing the generated game.
   */
  id: string;
  /**
   * Standalone Phaser.js-compatible game source code.
   */
  code: string;
  /**
   * Associated visual and audio assets used by the game code.
   */
  assets: GameAssets;
  /**
   * Metadata describing the generated game's characteristics.
   */
  metadata: GameMetadata;
  /**
   * Current state of the generation process.
   */
  status: "generating" | "ready" | "error";
  /**
   * ISO-8601 timestamp describing when the game was created.
   */
  createdAt: string;
}

/**
 * Payload describing how the generation service should produce a game.
 */
export interface GenerationRequest {
  /**
   * Prompt provided by the user to guide game creation.
   */
  prompt: string;
  /**
   * Template selected from the available game archetypes.
   */
  template: GameTemplate;
  /**
   * Optional configuration parameters for fine-tuning game output.
   */
  config?: Partial<GameConfig>;
  /**
   * Optional unique identifier for the requesting user.
   */
  userId?: string;
}

/**
 * Returned payload describing the status of a generation attempt.
 */
export interface GenerationResponse {
  /**
   * Indicates whether the generation request was accepted or completed.
   */
  success: boolean;
  /**
   * Optional identifier for tracking asynchronous generation jobs.
   */
  jobId?: string;
  /**
   * Generated game payload when the process finishes successfully.
   */
  game?: GeneratedGame;
  /**
   * Diagnostic message describing why generation failed.
   */
  error?: string;
  /**
   * Estimated remaining time for generation in seconds.
   */
  estimatedTime?: number;
}
