import type { GameTemplate } from "../types/game";

type TemplateKey = Extract<GameTemplate, "platformer" | "puzzle" | "shooter" | "racing">;

interface GameTemplateDefinition {
  /**
   * Self-contained Phaser 3 game script that can be mounted directly.
   */
  baseCode: string;
  /**
   * Optional placeholder values that downstream generators can replace.
   */
  placeholder: {
    colors: Record<string, number>;
  };
}

export const GAME_TEMPLATES: Record<TemplateKey, GameTemplateDefinition> = {
  platformer: {
    baseCode: `// Phaser 3 Platformer template
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 300 },
      debug: false,
    },
  },
  scene: { preload, create, update },
  backgroundColor: 0x87ceeb,
};

let player;
let platforms;
let cursors;
let score = 0;
let scoreText;

// No assets to preload because rectangles are generated procedurally.
function preload() {}

function create() {
  const groundHeight = 32;

  // Static group for ground and floating platforms.
  platforms = this.physics.add.staticGroup();

  // Ground spanning the width of the screen.
  platforms.create(400, 600 - groundHeight / 2, "ground", undefined, {
    width: 800,
    height: groundHeight,
    fillColor: 0x00ff00,
  }).setScale(1).refreshBody().setVisible(false);
  this.add
    .rectangle(400, 600 - groundHeight / 2, 800, groundHeight, 0x00ff00)
    .setOrigin(0.5, 0.5);

  // Floating platforms for navigation.
  createPlatform.call(this, 200, 450, 120, 20);
  createPlatform.call(this, 600, 350, 120, 20);
  createPlatform.call(this, 400, 250, 120, 20);

  // Player represented as a simple red rectangle.
  player = this.physics.add.sprite(100, 450, "player");
  this.add.rectangle(player.x, player.y, 32, 48, 0xff0000).setOrigin(0.5, 0.5);
  player.setDisplaySize(32, 48);
  player.setCollideWorldBounds(true);

  // Enable collision between player and platforms.
  this.physics.add.collider(player, platforms);

  // Cursor input for left/right movement and jumping.
  cursors = this.input.keyboard.createCursorKeys();

  // Display score in the top-left corner.
  scoreText = this.add.text(16, 16, "Score: 0", {
    fontSize: "24px",
    color: "#000",
  });
}

function createPlatform(x, y, width, height) {
  platforms
    .create(x, y, "platform", undefined, {
      width,
      height,
      fillColor: 0x00ff00,
    })
    .setVisible(false);
  this.add.rectangle(x, y, width, height, 0x00ff00).setOrigin(0.5, 0.5);
}

function update() {
  // Horizontal movement.
  if (cursors.left?.isDown) {
    player.setVelocityX(-160);
  } else if (cursors.right?.isDown) {
    player.setVelocityX(160);
  } else {
    player.setVelocityX(0);
  }

  // Jump when touching the ground.
  const isGrounded = player.body.blocked.down;
  if (cursors.up?.isDown && isGrounded) {
    player.setVelocityY(-330);
  }

  // Simple score to show ongoing gameplay (increment per frame).
  score += 1;
  scoreText.setText("Score: " + Math.floor(score / 10));
}

new Phaser.Game(config);`,
    placeholder: {
      colors: {
        player: 0xff0000,
        platform: 0x00ff00,
        bg: 0x87ceeb,
      },
    },
  },
  puzzle: {
    baseCode: `// Phaser 3 Puzzle (Match-3) template
const config = {
  type: Phaser.AUTO,
  width: 600,
  height: 600,
  backgroundColor: 0x1f1f2e,
  scene: { preload, create, update },
};

const GRID_SIZE = 8;
const TILE_SIZE = 64;
const COLORS = [0xff6b6b, 0x4ecdc4, 0xffd93d, 0x9d4edd];

let grid = [];
let selectedTile = null;
let isSwapping = false;
let score = 0;
let scoreText;

function preload() {}

function create() {
  const offsetX = (this.sys.game.config.width - GRID_SIZE * TILE_SIZE) / 2;
  const offsetY = (this.sys.game.config.height - GRID_SIZE * TILE_SIZE) / 2;

  for (let row = 0; row < GRID_SIZE; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      const colorIndex = Phaser.Math.Between(0, COLORS.length - 1);
      const rect = this.add.rectangle(
        offsetX + col * TILE_SIZE + TILE_SIZE / 2,
        offsetY + row * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE - 8,
        TILE_SIZE - 8,
        COLORS[colorIndex]
      );
      rect.setData("row", row);
      rect.setData("col", col);
      rect.setData("colorIndex", colorIndex);
      rect.setInteractive();
      rect.on("pointerdown", () => selectTile.call(this, rect));
      grid[row][col] = rect;
    }
  }

  scoreText = this.add.text(16, 16, "Score: 0", {
    fontSize: "24px",
    color: "#ffffff",
  });
}

function update() {}

function selectTile(tile) {
  if (isSwapping) return;

  if (!selectedTile) {
    selectedTile = tile;
    tile.setStrokeStyle(4, 0xffffff);
    return;
  }

  if (tile === selectedTile) {
    tile.setStrokeStyle();
    selectedTile = null;
    return;
  }

  const areAdjacent =
    (tile.getData("row") === selectedTile.getData("row") &&
      Math.abs(tile.getData("col") - selectedTile.getData("col")) === 1) ||
    (tile.getData("col") === selectedTile.getData("col") &&
      Math.abs(tile.getData("row") - selectedTile.getData("row")) === 1);

  if (!areAdjacent) {
    selectedTile.setStrokeStyle();
    selectedTile = tile;
    tile.setStrokeStyle(4, 0xffffff);
    return;
  }

  swapTiles.call(this, tile, selectedTile);
}

function swapTiles(tileA, tileB) {
  isSwapping = true;

  const colA = tileA.getData("col");
  const rowA = tileA.getData("row");
  const colB = tileB.getData("col");
  const rowB = tileB.getData("row");

  const posA = { x: tileA.x, y: tileA.y };
  const posB = { x: tileB.x, y: tileB.y };

  this.tweens.add({
    targets: tileA,
    x: posB.x,
    y: posB.y,
    duration: 200,
    onComplete: () => {
      tileA.setData("row", rowB);
      tileA.setData("col", colB);
    },
  });

  this.tweens.add({
    targets: tileB,
    x: posA.x,
    y: posA.y,
    duration: 200,
    onComplete: () => {
      tileB.setData("row", rowA);
      tileB.setData("col", colA);
      finalizeSwap.call(this, tileA, tileB);
    },
  });
}

function finalizeSwap(tileA, tileB) {
  tileA.setStrokeStyle();
  tileB.setStrokeStyle();
  selectedTile = null;

  const matches = findMatches();
  if (matches.length === 0) {
    // Revert swap if no matches.
    swapTiles.call(this, tileA, tileB);
    return;
  }

  score += matches.length * 10;
  scoreText.setText("Score: " + score);
  removeMatches(matches);
  refillGrid.call(this);
  isSwapping = false;
}

function findMatches() {
  const matches = [];

  // Horizontal matches.
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE - 2; col++) {
      const tileA = grid[row][col];
      const tileB = grid[row][col + 1];
      const tileC = grid[row][col + 2];
      if (
        tileA.getData("colorIndex") === tileB.getData("colorIndex") &&
        tileA.getData("colorIndex") === tileC.getData("colorIndex")
      ) {
        matches.push(tileA, tileB, tileC);
      }
    }
  }

  // Vertical matches.
  for (let col = 0; col < GRID_SIZE; col++) {
    for (let row = 0; row < GRID_SIZE - 2; row++) {
      const tileA = grid[row][col];
      const tileB = grid[row + 1][col];
      const tileC = grid[row + 2][col];
      if (
        tileA.getData("colorIndex") === tileB.getData("colorIndex") &&
        tileA.getData("colorIndex") === tileC.getData("colorIndex")
      ) {
        matches.push(tileA, tileB, tileC);
      }
    }
  }

  return matches;
}

function removeMatches(matches) {
  matches.forEach((tile) => {
    tile.setFillStyle(0x444444);
  });
}

function refillGrid() {
  matchesCleanup();

  const offsetX = (this.sys.game.config.width - GRID_SIZE * TILE_SIZE) / 2;
  const offsetY = (this.sys.game.config.height - GRID_SIZE * TILE_SIZE) / 2;

  for (let row = GRID_SIZE - 1; row >= 0; row--) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col].getFillColor() === 0x444444) {
        for (let shiftRow = row; shiftRow > 0; shiftRow--) {
          const aboveTile = grid[shiftRow - 1][col];
          grid[shiftRow][col].setFillStyle(aboveTile.getFillColor());
          grid[shiftRow][col].setData("colorIndex", aboveTile.getData("colorIndex"));
        }
        const colorIndex = Phaser.Math.Between(0, COLORS.length - 1);
        grid[0][col].setFillStyle(COLORS[colorIndex]);
        grid[0][col].setData("colorIndex", colorIndex);
      }
    }
  }

  // Recalculate matches after refill.
  if (findMatches().length > 0) {
    refillGrid.call(this);
  }
}

function matchesCleanup() {
  grid.flat().forEach((tile) => {
    if (tile.getFillColor() === 0x444444) {
      tile.setFillStyle(COLORS[Phaser.Math.Between(0, COLORS.length - 1)]);
    }
  });
}

new Phaser.Game(config);`,
    placeholder: {
      colors: {
        tile1: 0xff6b6b,
        tile2: 0x4ecdc4,
        tile3: 0xffd93d,
        tile4: 0x9d4edd,
        bg: 0x1f1f2e,
      },
    },
  },
  shooter: {
    baseCode: `// Phaser 3 Top-down Shooter template
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: { preload, create, update },
  backgroundColor: 0x0f1c2c,
};

let player;
let cursors;
let bullets;
let enemies;
let lastShot = 0;
let lastSpawn = 0;
let score = 0;
let scoreText;

function preload() {}

function create() {
  player = this.add.rectangle(400, 520, 32, 48, 0x00aaff);
  this.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);

  cursors = this.input.keyboard.createCursorKeys();
  bullets = this.physics.add.group();
  enemies = this.physics.add.group();

  scoreText = this.add.text(16, 16, "Score: 0", {
    fontSize: "24px",
    color: "#ffffff",
  });

  this.physics.add.overlap(bullets, enemies, handleBulletHit, undefined, this);
  this.physics.add.overlap(player, enemies, handlePlayerHit, undefined, this);
}

function update(time) {
  handleMovement();
  handleShooting.call(this, time);
  spawnEnemies.call(this, time);
  cleanupProjectiles();
  cleanupEnemies();
}

function handleMovement() {
  player.body.setVelocity(0);

  if (cursors.left?.isDown) {
    player.body.setVelocityX(-220);
  } else if (cursors.right?.isDown) {
    player.body.setVelocityX(220);
  }

  if (cursors.up?.isDown) {
    player.body.setVelocityY(-220);
  } else if (cursors.down?.isDown) {
    player.body.setVelocityY(220);
  }
}

function handleShooting(time) {
  if (!cursors.space?.isDown || time < lastShot + 250) {
    return;
  }

  const bullet = this.add.rectangle(player.x, player.y - 28, 6, 16, 0xffff66);
  this.physics.add.existing(bullet);
  bullet.body.setVelocityY(-420);
  bullet.body.setCollideWorldBounds(false);
  bullets.add(bullet);
  lastShot = time;
}

function spawnEnemies(time) {
  if (time < lastSpawn + 900) {
    return;
  }

  const x = Phaser.Math.Between(40, 760);
  const enemy = this.add.rectangle(x, -40, 36, 36, 0xff4444);
  this.physics.add.existing(enemy);
  enemy.body.setVelocityY(Phaser.Math.Between(90, 150));
  enemies.add(enemy);
  lastSpawn = time;
}

function cleanupProjectiles() {
  bullets.children.each((child) => {
    const bullet = child;
    if (bullet.y < -60) {
      bullet.destroy();
    }
  });
}

function cleanupEnemies() {
  enemies.children.each((child) => {
    const enemy = child;
    if (enemy.y > 660) {
      enemy.destroy();
    }
  });
}

function handleBulletHit(bullet, enemy) {
  bullet.destroy();
  enemy.destroy();
  score += 10;
  scoreText.setText("Score: " + score);
}

function handlePlayerHit(playerRect, enemy) {
  enemy.destroy();
  scoreText.setText("Score: " + score + " - Hit!");
}

new Phaser.Game(config);`,
    placeholder: {
      colors: {
        player: 0x00aaff,
        bullet: 0xffff66,
        enemy: 0xff4444,
        bg: 0x0f1c2c,
      },
    },
  },
  racing: {
    baseCode: `// Phaser 3 Top-down Racing template
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: { preload, create, update },
  backgroundColor: 0x0b0d16,
};

let car;
let cursors;
let rivals;
let lapTime = 0;
let lapText;

function preload() {}

function create() {
  drawTrack.call(this);

  car = this.add.rectangle(400, 520, 32, 52, 0xffaa00);
  this.physics.add.existing(car);
  car.body.setCollideWorldBounds(true);

  cursors = this.input.keyboard.createCursorKeys();
  rivals = this.physics.add.group();

  lapText = this.add.text(16, 16, "Lap Time: 0.0s", {
    fontSize: "24px",
    color: "#ffffff",
  });

  this.physics.add.overlap(car, rivals, handleCrash, undefined, this);

  this.time.addEvent({
    delay: 1400,
    loop: true,
    callback: spawnRival,
    callbackScope: this,
  });
}

function update(_time, delta) {
  handleDrive(delta);
  lapTime += delta / 1000;
  lapText.setText("Lap Time: " + lapTime.toFixed(1) + "s");
  cleanupRivals();
}

function drawTrack() {
  const borderWidth = 20;
  this.add.rectangle(400, 300, 760, 560, 0x112233).setOrigin(0.5, 0.5);
  this.add.rectangle(400, 300, 720, 520, 0x0b0d16).setOrigin(0.5, 0.5);

  const checkpoints = [120, 240, 360, 480];
  checkpoints.forEach((y) => {
    this.add.rectangle(400, y, 200, 8, 0xffffff).setAlpha(0.2);
  });

  this.physics.world.setBounds(borderWidth, borderWidth, 800 - borderWidth * 2, 600 - borderWidth * 2);
}

function handleDrive(delta) {
  const acceleration = 12;
  const maxSpeed = 260;

  if (cursors.up?.isDown) {
    car.body.velocity.y = Phaser.Math.Clamp(car.body.velocity.y - acceleration, -maxSpeed, maxSpeed);
  } else if (cursors.down?.isDown) {
    car.body.velocity.y = Phaser.Math.Clamp(car.body.velocity.y + acceleration, -maxSpeed, maxSpeed);
  } else {
    car.body.velocity.y *= 0.95;
  }

  if (cursors.left?.isDown) {
    car.body.velocity.x = Phaser.Math.Clamp(car.body.velocity.x - acceleration, -maxSpeed, maxSpeed);
  } else if (cursors.right?.isDown) {
    car.body.velocity.x = Phaser.Math.Clamp(car.body.velocity.x + acceleration, -maxSpeed, maxSpeed);
  } else {
    car.body.velocity.x *= 0.95;
  }

  car.body.velocity.x = Phaser.Math.Clamp(car.body.velocity.x, -maxSpeed, maxSpeed);
  car.body.velocity.y = Phaser.Math.Clamp(car.body.velocity.y, -maxSpeed, maxSpeed);
}

function spawnRival() {
  const x = Phaser.Math.Between(260, 540);
  const rival = this.add.rectangle(x, -40, 28, 48, 0xff3366);
  this.physics.add.existing(rival);
  rival.body.setVelocityY(Phaser.Math.Between(160, 220));
  rivals.add(rival);
}

function cleanupRivals() {
  rivals.children.each((child) => {
    const rival = child;
    if (rival.y > 660) {
      rival.destroy();
    }
  });
}

function handleCrash(_car, rival) {
  rival.destroy();
  lapTime = 0;
  car.setPosition(400, 520);
  car.body.setVelocity(0);
}

new Phaser.Game(config);`,
    placeholder: {
      colors: {
        player: 0xffaa00,
        rival: 0xff3366,
        track: 0x112233,
        bg: 0x0b0d16,
      },
    },
  },
};

export function getTemplateCode(template: string): string {
  const key = template as TemplateKey;
  if (key in GAME_TEMPLATES) {
    return GAME_TEMPLATES[key].baseCode;
  }
  throw new Error(
    `Unsupported template "${template}". Available options are platformer, puzzle, shooter, and racing.`
  );
}
