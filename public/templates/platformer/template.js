/**
 * Platformer Game Template
 *
 * This is a complete Phaser 3 platformer game template with placeholders
 * for AI-generated content.
 *
 * Placeholders:
 * - [PLAYER_SPRITE_PATH]: URL to player sprite image
 * - [BG_SPRITE_PATH]: URL to background image
 * - [ENEMY_SPRITE_PATHS]: Array of enemy sprite URLs
 * - [PLAYER_LOGIC_CODE]: Player mechanics code
 * - [ENEMY_LOGIC_CODE]: Enemy AI code
 * - [PHYSICS_CODE]: Custom physics configuration
 * - [LEVEL_CODE]: Level design code
 */

// Game configuration
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: [PHYSICS_CODE]
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  backgroundColor: '#87CEEB'
};

// Initialize game
const game = new Phaser.Game(config);

// Game variables
let player;
let platforms;
let enemies;
let cursors;
let score = 0;
let scoreText;
let gameOver = false;

/**
 * Preload assets
 */
function preload() {
  // Load player sprite
  this.load.image('player', '[PLAYER_SPRITE_PATH]');

  // Load background
  this.load.image('background', '[BG_SPRITE_PATH]');

  // Load enemy sprites
  const enemySprites = [ENEMY_SPRITE_PATHS];
  enemySprites.forEach((sprite, index) => {
    this.load.image(`enemy${index}`, sprite);
  });

  // Load platform (create a simple rectangle if not provided)
  this.load.image('platform', createPlatformTexture());
}

/**
 * Create game objects
 */
function create() {
  // Add background
  const bg = this.add.image(400, 300, 'background');
  bg.setDisplaySize(800, 600);

  // Create platforms group
  platforms = this.physics.add.staticGroup();

  // [LEVEL_CODE]
  // Default level design if not provided
  createDefaultLevel(platforms);

  // Create player
  player = this.physics.add.sprite(100, 450, 'player');
  player.setScale(0.1); // Scale down from DALL-E size
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);

  // [PLAYER_LOGIC_CODE]
  // Default player controls if not provided
  setupDefaultPlayerControls(this);

  // Create enemies
  enemies = this.physics.add.group();

  // [ENEMY_LOGIC_CODE]
  // Default enemy spawning if not provided
  createDefaultEnemies(this, enemies);

  // Add collisions
  this.physics.add.collider(player, platforms);
  this.physics.add.collider(enemies, platforms);
  this.physics.add.overlap(player, enemies, hitEnemy, null, this);

  // Create score text
  scoreText = this.add.text(16, 16, 'Score: 0', {
    fontSize: '32px',
    fill: '#000'
  });

  // Input
  cursors = this.input.keyboard.createCursorKeys();
}

/**
 * Game loop
 */
function update() {
  if (gameOver) {
    return;
  }

  // Player movement
  if (cursors.left.isDown) {
    player.setVelocityX(-160);
  } else if (cursors.right.isDown) {
    player.setVelocityX(160);
  } else {
    player.setVelocityX(0);
  }

  // Jump
  if (cursors.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }

  // Update enemies
  enemies.children.entries.forEach((enemy) => {
    // Simple back-and-forth movement
    if (enemy.body.velocity.x === 0) {
      enemy.setVelocityX(50);
    }

    // Reverse direction at edges
    if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
      enemy.setVelocityX(-enemy.body.velocity.x);
    }
  });

  // Check win condition
  if (score >= 100) {
    winGame(this);
  }
}

/**
 * Create default level layout
 */
function createDefaultLevel(platforms) {
  // Ground
  platforms.create(400, 568, 'platform').setScale(2, 1).refreshBody();

  // Platforms
  platforms.create(600, 400, 'platform');
  platforms.create(50, 250, 'platform');
  platforms.create(750, 220, 'platform');
  platforms.create(400, 350, 'platform');
}

/**
 * Setup default player controls
 */
function setupDefaultPlayerControls(scene) {
  // Player animations could be added here
  // For now, basic physics is handled in update()
}

/**
 * Create default enemies
 */
function createDefaultEnemies(scene, enemiesGroup) {
  // Create 3 enemies
  for (let i = 0; i < 3; i++) {
    const x = Phaser.Math.Between(200, 700);
    const enemy = enemiesGroup.create(x, 0, `enemy${i % 2}`);
    enemy.setScale(0.08);
    enemy.setBounce(0.5);
    enemy.setCollideWorldBounds(true);
    enemy.setVelocity(Phaser.Math.Between(-100, 100), 20);

    // Set patrol boundaries
    enemy.minX = x - 100;
    enemy.maxX = x + 100;
  }
}

/**
 * Handle player hitting enemy
 */
function hitEnemy(player, enemy) {
  // Check if player is jumping on enemy
  if (player.body.velocity.y > 0) {
    // Player defeated enemy
    enemy.destroy();
    player.setVelocityY(-200);
    score += 10;
    scoreText.setText('Score: ' + score);
  } else {
    // Enemy hit player
    this.physics.pause();
    player.setTint(0xff0000);
    gameOver = true;

    // Show game over text
    const gameOverText = this.add.text(400, 300, 'GAME OVER', {
      fontSize: '64px',
      fill: '#ff0000'
    });
    gameOverText.setOrigin(0.5);

    // Restart button
    const restartText = this.add.text(400, 400, 'Click to Restart', {
      fontSize: '32px',
      fill: '#000'
    });
    restartText.setOrigin(0.5);
    restartText.setInteractive();
    restartText.on('pointerdown', () => {
      this.scene.restart();
      score = 0;
      gameOver = false;
    });
  }
}

/**
 * Win game
 */
function winGame(scene) {
  scene.physics.pause();
  gameOver = true;

  const winText = scene.add.text(400, 300, 'YOU WIN!', {
    fontSize: '64px',
    fill: '#00ff00'
  });
  winText.setOrigin(0.5);

  const restartText = scene.add.text(400, 400, 'Click to Play Again', {
    fontSize: '32px',
    fill: '#000'
  });
  restartText.setOrigin(0.5);
  restartText.setInteractive();
  restartText.on('pointerdown', () => {
    scene.scene.restart();
    score = 0;
    gameOver = false;
  });
}

/**
 * Create a simple platform texture
 */
function createPlatformTexture() {
  // This would create a simple colored rectangle
  // In practice, we'd use a proper asset
  return 'platform';
}
