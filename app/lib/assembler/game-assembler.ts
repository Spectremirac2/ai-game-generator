/**
 * Game Assembler
 *
 * Combines AI-generated assets (sprites, code) with game templates
 * to create a complete, downloadable game package.
 */

import { logger } from "../logger";
import * as fs from "fs";
import * as path from "path";

export interface AssemblyParts {
  template: {
    type: "platformer" | "puzzle" | "shooter" | "racing" | "custom";
    files: {
      html: string;
      js: string;
      readme: string;
    };
  };
  sprites: {
    player: string; // URL or base64
    background: string;
    enemies?: string[];
    collectibles?: string[];
  };
  code: {
    playerLogic: string;
    enemyLogic?: string;
    physicsConfig: string;
    levelDesign?: string;
    gameLoop?: string;
  };
  metadata: {
    gameType: string;
    theme: string;
    author: string;
    difficulty: string;
    createdAt: string;
  };
}

export interface AssembledGame {
  files: {
    [filename: string]: string | Buffer;
  };
  manifest: {
    version: string;
    gameType: string;
    filesCount: number;
    totalSize: number;
  };
}

export class GameAssembler {
  private templatePath: string;

  constructor() {
    this.templatePath = path.join(process.cwd(), "public", "templates");
  }

  /**
   * Assemble a complete game from parts
   */
  async assemble(parts: AssemblyParts): Promise<AssembledGame> {
    logger.info("Assembler: Starting game assembly", {
      gameType: parts.template.type,
      theme: parts.metadata.theme,
    });

    try {
      // 1. Load template files
      const templateFiles = await this.loadTemplate(parts.template.type);

      // 2. Replace sprite placeholders
      const processedJS = this.injectSprites(
        templateFiles.js,
        parts.sprites
      );

      // 3. Replace code placeholders
      const finalJS = this.injectCode(processedJS, parts.code);

      // 4. Update HTML
      const finalHTML = this.updateHTML(
        templateFiles.html,
        parts.metadata
      );

      // 5. Generate README
      const finalREADME = this.generateREADME(
        templateFiles.readme,
        parts.metadata
      );

      // 6. Download and process sprite assets
      const assetFiles = await this.processAssets(parts.sprites);

      // 7. Combine all files
      const files: { [key: string]: string | Buffer } = {
        "index.html": finalHTML,
        "game.js": finalJS,
        "README.md": finalREADME,
        "package.json": this.generatePackageJson(parts.metadata),
        ...assetFiles,
      };

      // 8. Calculate total size
      const totalSize = Object.values(files).reduce((sum, content) => {
        return sum + (typeof content === "string" ? content.length : content.length);
      }, 0);

      const assembled: AssembledGame = {
        files,
        manifest: {
          version: "1.0.0",
          gameType: parts.template.type,
          filesCount: Object.keys(files).length,
          totalSize,
        },
      };

      logger.info("Assembler: Game assembly complete", {
        filesCount: assembled.manifest.filesCount,
        totalSize: assembled.manifest.totalSize,
      });

      return assembled;
    } catch (error) {
      logger.error("Assembler: Failed to assemble game", { error });
      throw new Error(`Failed to assemble game: ${error}`);
    }
  }

  /**
   * Load template files from disk
   */
  private async loadTemplate(templateType: string): Promise<{
    html: string;
    js: string;
    readme: string;
  }> {
    logger.info("Assembler: Loading template", { templateType });

    const templateDir = path.join(this.templatePath, templateType);

    try {
      // Check if running in browser environment (for Vercel edge)
      if (typeof window !== "undefined") {
        // Fetch from public URL
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
        const [html, js, readme] = await Promise.all([
          fetch(`${baseUrl}/templates/${templateType}/index.html`).then((r) =>
            r.text()
          ),
          fetch(`${baseUrl}/templates/${templateType}/template.js`).then((r) =>
            r.text()
          ),
          fetch(`${baseUrl}/templates/${templateType}/README.md`).then((r) =>
            r.text()
          ),
        ]);

        return { html, js, readme };
      } else {
        // Node.js environment - read from file system
        const html = fs.readFileSync(
          path.join(templateDir, "index.html"),
          "utf-8"
        );
        const js = fs.readFileSync(
          path.join(templateDir, "template.js"),
          "utf-8"
        );
        const readme = fs.readFileSync(
          path.join(templateDir, "README.md"),
          "utf-8"
        );

        return { html, js, readme };
      }
    } catch (error) {
      logger.error("Assembler: Failed to load template", {
        templateType,
        error,
      });
      throw new Error(`Failed to load template ${templateType}: ${error}`);
    }
  }

  /**
   * Inject sprite URLs into game code
   */
  private injectSprites(
    jsCode: string,
    sprites: AssemblyParts["sprites"]
  ): string {
    logger.info("Assembler: Injecting sprites");

    let processed = jsCode;

    // Replace player sprite
    processed = processed.replace(
      /\[PLAYER_SPRITE_PATH\]/g,
      `assets/player.png`
    );

    // Replace background sprite
    processed = processed.replace(
      /\[BG_SPRITE_PATH\]/g,
      `assets/background.png`
    );

    // Replace enemy sprites (as array)
    if (sprites.enemies && sprites.enemies.length > 0) {
      const enemyPaths = sprites.enemies
        .map((_, i) => `'assets/enemy${i}.png'`)
        .join(", ");
      processed = processed.replace(/\[ENEMY_SPRITE_PATHS\]/g, enemyPaths);
    } else {
      processed = processed.replace(/\[ENEMY_SPRITE_PATHS\]/g, "[]");
    }

    return processed;
  }

  /**
   * Inject AI-generated code into template
   */
  private injectCode(
    jsCode: string,
    code: AssemblyParts["code"]
  ): string {
    logger.info("Assembler: Injecting code");

    let processed = jsCode;

    // Replace player logic
    if (code.playerLogic) {
      processed = processed.replace(
        /\/\/ \[PLAYER_LOGIC_CODE\][^]*/m,
        code.playerLogic
      );
    }

    // Replace enemy logic
    if (code.enemyLogic) {
      processed = processed.replace(
        /\/\/ \[ENEMY_LOGIC_CODE\][^]*/m,
        code.enemyLogic
      );
    }

    // Replace physics config
    if (code.physicsConfig) {
      processed = processed.replace(
        /\[PHYSICS_CODE\]/g,
        code.physicsConfig
      );
    }

    // Replace level design
    if (code.levelDesign) {
      processed = processed.replace(
        /\/\/ \[LEVEL_CODE\][^]*/m,
        code.levelDesign
      );
    }

    return processed;
  }

  /**
   * Update HTML with metadata
   */
  private updateHTML(html: string, metadata: AssemblyParts["metadata"]): string {
    logger.info("Assembler: Updating HTML");

    let processed = html;

    // Update title
    processed = processed.replace(
      /<title>.*?<\/title>/,
      `<title>${metadata.theme} - ${metadata.gameType}</title>`
    );

    // Add meta tags
    const metaTags = `
  <meta name="description" content="AI-generated ${metadata.gameType} game with ${metadata.theme} theme">
  <meta name="author" content="${metadata.author}">
  <meta name="generator" content="AI Game Generator Factory">
  <meta name="created" content="${metadata.createdAt}">`;

    processed = processed.replace("</head>", `${metaTags}\n</head>`);

    return processed;
  }

  /**
   * Generate README with metadata
   */
  private generateREADME(
    template: string,
    metadata: AssemblyParts["metadata"]
  ): string {
    logger.info("Assembler: Generating README");

    const additionalInfo = `
---

## Game Details

- **Type**: ${metadata.gameType}
- **Theme**: ${metadata.theme}
- **Difficulty**: ${metadata.difficulty}
- **Created**: ${metadata.createdAt}
- **Generated by**: ${metadata.author}

## Quick Start

\`\`\`bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
\`\`\`

Then open http://localhost:8000 in your browser.

## Features

This game was generated using AI and includes:
- Custom sprite artwork created by DALL-E 3
- Game mechanics powered by GPT-4
- Phaser 3 game engine
- Responsive controls
- Score tracking
- Win/lose conditions

## Credits

Powered by **AI Game Generator Factory**
- Visual AI: DALL-E 3
- Code AI: GPT-4o-mini
- Game Engine: Phaser 3
`;

    return template + additionalInfo;
  }

  /**
   * Generate package.json
   */
  private generatePackageJson(metadata: AssemblyParts["metadata"]): string {
    return JSON.stringify(
      {
        name: `${metadata.gameType}-${metadata.theme.replace(/\s+/g, "-").toLowerCase()}`,
        version: "1.0.0",
        description: `AI-generated ${metadata.gameType} game with ${metadata.theme} theme`,
        main: "index.html",
        scripts: {
          start: "npx http-server -p 8000",
        },
        keywords: [
          "game",
          metadata.gameType,
          "phaser",
          "ai-generated",
          metadata.theme,
        ],
        author: metadata.author,
        license: "MIT",
        dependencies: {},
        devDependencies: {},
      },
      null,
      2
    );
  }

  /**
   * Download and process sprite assets
   */
  private async processAssets(
    sprites: AssemblyParts["sprites"]
  ): Promise<{ [key: string]: Buffer }> {
    logger.info("Assembler: Processing assets", {
      spriteCount: Object.keys(sprites).length,
    });

    const assets: { [key: string]: Buffer } = {};

    try {
      // Download player sprite
      if (sprites.player) {
        assets["assets/player.png"] = await this.downloadAsset(sprites.player);
      }

      // Download background
      if (sprites.background) {
        assets["assets/background.png"] = await this.downloadAsset(
          sprites.background
        );
      }

      // Download enemy sprites
      if (sprites.enemies && sprites.enemies.length > 0) {
        for (let i = 0; i < sprites.enemies.length; i++) {
          assets[`assets/enemy${i}.png`] = await this.downloadAsset(
            sprites.enemies[i]
          );
        }
      }

      logger.info("Assembler: Assets processed", {
        assetCount: Object.keys(assets).length,
      });

      return assets;
    } catch (error) {
      logger.error("Assembler: Failed to process assets", { error });
      throw new Error(`Failed to process assets: ${error}`);
    }
  }

  /**
   * Download asset from URL
   */
  private async downloadAsset(url: string): Promise<Buffer> {
    logger.info("Assembler: Downloading asset", { url });

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      logger.error("Assembler: Failed to download asset", { url, error });
      throw new Error(`Failed to download asset from ${url}: ${error}`);
    }
  }

  /**
   * Create ZIP file from assembled game
   * Note: This requires a ZIP library like JSZip or archiver
   */
  async createZip(assembled: AssembledGame): Promise<Buffer> {
    logger.info("Assembler: Creating ZIP archive", {
      filesCount: assembled.manifest.filesCount,
    });

    // TODO: Implement ZIP creation using JSZip or archiver
    // For now, return a placeholder

    throw new Error("ZIP creation not yet implemented - install JSZip first");

    // Example with JSZip:
    // const JSZip = require('jszip');
    // const zip = new JSZip();
    //
    // for (const [filename, content] of Object.entries(assembled.files)) {
    //   zip.file(filename, content);
    // }
    //
    // return await zip.generateAsync({ type: 'nodebuffer' });
  }
}

// Singleton instance
export const gameAssembler = new GameAssembler();
