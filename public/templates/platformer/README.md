# Platformer Game Template

This is a complete 2D platformer game template built with Phaser 3.

## Features

- **Physics-based gameplay** - Arcade physics with gravity and collisions
- **Player controls** - Arrow keys for movement and jumping
- **Enemy AI** - Patrolling enemies with collision detection
- **Score system** - Track points by defeating enemies
- **Win/Lose conditions** - Game over states and restart functionality

## Placeholders

This template uses placeholders that are replaced by AI-generated content:

### Sprites
- `[PLAYER_SPRITE_PATH]` - Player character sprite
- `[BG_SPRITE_PATH]` - Background image
- `[ENEMY_SPRITE_PATHS]` - Array of enemy sprites

### Code
- `[PLAYER_LOGIC_CODE]` - Custom player mechanics
- `[ENEMY_LOGIC_CODE]` - Custom enemy AI
- `[PHYSICS_CODE]` - Physics configuration
- `[LEVEL_CODE]` - Level design and layout

## How to Use

1. **Development**: Open `index.html` in a modern web browser
2. **Production**: Serve files with any HTTP server (e.g., `npx http-server`)

## Customization

The template includes default implementations for all placeholders, so it works out of the box. The AI replaces these with custom content based on user specifications.

## Game Flow

1. **Preload**: Load all sprites and assets
2. **Create**: Initialize game world, player, enemies, platforms
3. **Update**: Game loop handling movement, collisions, scoring
4. **Game Over**: Detect win/lose conditions and show restart option

## Controls

- **←/→ Arrow Keys**: Move left/right
- **↑ Arrow Key**: Jump
- **Click "Restart"**: Reset game after game over

## Winning

Score 100 points by defeating enemies to win the game!

## Technical Details

- **Engine**: Phaser 3.55.2
- **Physics**: Arcade physics
- **Resolution**: 800x600px
- **Frame Rate**: 60 FPS (default)

## License

This template is part of the AI Game Generator Factory project.
