# Game Assembler

The Game Assembler is responsible for combining AI-generated assets with game templates to create complete, downloadable game packages.

## Overview

The assembler follows a multi-step process:

1. **Load Template** - Fetch the appropriate game template files
2. **Inject Sprites** - Replace sprite placeholders with AI-generated images
3. **Inject Code** - Replace code placeholders with AI-generated logic
4. **Update Metadata** - Add game information to HTML and README
5. **Process Assets** - Download and optimize sprite images
6. **Create Package** - Bundle everything into a ZIP file

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Game Assembler                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Input: AssemblyParts                                       │
│  ├─ Template (platformer/puzzle/shooter/racing/custom)      │
│  ├─ Sprites (player, background, enemies)                   │
│  ├─ Code (player logic, enemy AI, physics, level design)    │
│  └─ Metadata (author, theme, difficulty)                    │
│                                                             │
│  Process:                                                   │
│  1. Load template files (HTML, JS, README)                  │
│  2. Replace sprite placeholders                             │
│  3. Inject AI-generated code                                │
│  4. Update HTML metadata                                    │
│  5. Generate enhanced README                                │
│  6. Download and process sprites                            │
│  7. Create file structure                                   │
│  8. Package into ZIP                                        │
│                                                             │
│  Output: AssembledGame                                      │
│  ├─ files: { [filename]: content }                          │
│  └─ manifest: { version, gameType, filesCount, totalSize }  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Usage

```typescript
import { gameAssembler, AssemblyParts } from "./game-assembler";

// Prepare parts
const parts: AssemblyParts = {
  template: {
    type: "platformer",
    files: { /* loaded template files */ }
  },
  sprites: {
    player: "https://..../player.png",
    background: "https://..../background.png",
    enemies: ["https://..../enemy1.png"]
  },
  code: {
    playerLogic: "// Player code...",
    enemyLogic: "// Enemy AI...",
    physicsConfig: "{ gravity: { y: 800 } }",
    levelDesign: "// Level layout..."
  },
  metadata: {
    gameType: "platformer",
    theme: "cyberpunk city",
    author: "user@example.com",
    difficulty: "medium",
    createdAt: new Date().toISOString()
  }
};

// Assemble game
const assembled = await gameAssembler.assemble(parts);

// Create ZIP
const zipBuffer = await gameAssembler.createZip(assembled);

// Upload or serve the ZIP file
```

## Template Placeholders

### Sprite Placeholders
- `[PLAYER_SPRITE_PATH]` - Player sprite URL
- `[BG_SPRITE_PATH]` - Background image URL
- `[ENEMY_SPRITE_PATHS]` - Array of enemy sprite URLs

### Code Placeholders
- `[PLAYER_LOGIC_CODE]` - Player mechanics and controls
- `[ENEMY_LOGIC_CODE]` - Enemy AI and behaviors
- `[PHYSICS_CODE]` - Physics configuration object
- `[LEVEL_CODE]` - Level design and layout

## File Structure

The assembled game has the following structure:

```
game-package/
├── index.html          # Main HTML file with game container
├── game.js             # Complete Phaser game code
├── README.md           # Game documentation
├── package.json        # NPM package file
└── assets/             # Game assets directory
    ├── player.png      # Player sprite
    ├── background.png  # Background image
    ├── enemy0.png      # Enemy sprite 1
    └── enemy1.png      # Enemy sprite 2
```

## Error Handling

The assembler includes comprehensive error handling:

- **Template not found**: Falls back to default template
- **Asset download failure**: Uses placeholder images
- **Code injection error**: Keeps default template code
- **ZIP creation failure**: Returns file list instead

## Performance

Optimization strategies:

- **Parallel downloads**: Assets are downloaded concurrently
- **Streaming**: Large files are streamed, not loaded into memory
- **Caching**: Templates are cached after first load
- **Compression**: Assets are optimized before packaging

## Future Enhancements

- [ ] Image optimization (resize, compress, format conversion)
- [ ] Code minification for production builds
- [ ] Asset validation and sanitization
- [ ] Support for additional file types (audio, fonts)
- [ ] Template versioning and migration
- [ ] Custom template creation API
- [ ] Multi-language support in README
- [ ] Progressive web app (PWA) manifest generation
