// Entity management and AI

import type { Player, Bullet, Zombie, Gate } from "./types";
import { ZombieType, GateType } from "./types";
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_MAX_HEALTH,
  PLAYER_SHOOT_INTERVAL,
  BULLET_WIDTH,
  BULLET_HEIGHT,
  BULLET_SPEED,
  BULLET_DAMAGE,
  BULLET_LIFETIME,
  ZOMBIE_CONFIGS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GATE_WIDTH,
  GATE_HEIGHT,
  INITIAL_SHOOTER_COUNT,
} from "./constants";
import { weightedRandomZombieType } from "./utils";

/**
 * Create a new player
 */
export function createPlayer(): Player {
  return {
    x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2, // Start in center
    y: CANVAS_HEIGHT - PLAYER_HEIGHT - 20, // Position at bottom of screen
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    health: PLAYER_MAX_HEALTH,
    maxHealth: PLAYER_MAX_HEALTH,
    speed: PLAYER_SPEED,
    velocityX: 0,
    velocityY: 0,
    rotation: 0,
    isShooting: false,
    lastShootTime: 0,
    shootInterval: PLAYER_SHOOT_INTERVAL,
    active: true,
    damageFlashTime: 0,
    invulnerableTime: 0,
    shooterCount: INITIAL_SHOOTER_COUNT,
    currentLane: 0, // Kept for compatibility but not used for lane switching
  };
}

/**
 * Create a new bullet
 */
export function createBullet(
  x: number,
  y: number,
  rotation: number,
  currentTime: number
): Bullet {
  const velocityX = Math.cos(rotation) * BULLET_SPEED;
  const velocityY = Math.sin(rotation) * BULLET_SPEED;

  return {
    x,
    y,
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    velocityX,
    velocityY,
    damage: BULLET_DAMAGE,
    lifetime: BULLET_LIFETIME,
    createdAt: currentTime,
    active: true,
  };
}

/**
 * Create a new zombie in a specific lane
 */
export function createZombie(type: ZombieType, lane?: number): Zombie {
  const config = ZOMBIE_CONFIGS[type];

  // If no lane specified, pick a random lane (0 or 1)
  const selectedLane =
    lane !== undefined ? lane : Math.floor(Math.random() * 2);

  // Spawn zombies at random X position within the lane
  const numLanes = 2;
  const laneWidth = CANVAS_WIDTH / numLanes;
  const laneStart = selectedLane * laneWidth;
  const spawnX =
    laneStart + Math.random() * (laneWidth - config.radius * 2) + config.radius;

  return {
    x: spawnX,
    y: -config.radius * 2, // Spawn just above the screen at top
    width: config.radius * 2,
    height: config.radius * 2,
    type,
    health: config.health,
    maxHealth: config.health,
    speed: config.speed,
    damage: config.damage,
    radius: config.radius,
    velocityX: 0,
    velocityY: 0,
    lastAttackTime: 0,
    attackCooldown: config.attackCooldown,
    bloodParticles: [],
    active: true,
    ...(type === ZombieType.SPITTER && {
      spitCooldown: config.spitCooldown,
      lastSpitTime: 0,
    }),
  };
}

/**
 * Create a random zombie based on weighted spawn chances
 */
export function createRandomZombie(): Zombie {
  const weights: Record<string, number> = {};

  for (const [type, config] of Object.entries(ZOMBIE_CONFIGS)) {
    weights[type] = config.spawnWeight;
  }

  const selectedType = weightedRandomZombieType(weights) as ZombieType;
  return createZombie(selectedType);
}

/**
 * Update zombie AI - move straight down toward player
 */
export function updateZombieAI(
  zombie: Zombie,
  _targetX: number,
  _targetY: number
): void {
  // Zombies move straight down (north to south)
  // Only Y velocity, moving downward
  zombie.velocityX = 0;
  zombie.velocityY = zombie.speed;

  // Different behaviors for different types
  if (zombie.type === ZombieType.SPITTER) {
    // Spitters move slower
    zombie.velocityY = zombie.speed * 0.7;
  } else if (zombie.type === ZombieType.RUNNER) {
    // Runners move faster
    zombie.velocityY = zombie.speed * 1.2;
  }

  // Update position
  zombie.x += zombie.velocityX;
  zombie.y += zombie.velocityY;
}

/**
 * Damage a zombie and return true if it died
 */
export function damageZombie(zombie: Zombie, damage: number): boolean {
  zombie.health -= damage;

  if (zombie.health <= 0) {
    zombie.health = 0;
    zombie.deathTime = Date.now();
    return true;
  }

  return false;
}

/**
 * Get zombie color based on type and health
 */
export function getZombieColor(zombie: Zombie): string {
  const config = ZOMBIE_CONFIGS[zombie.type];
  const healthPercent = zombie.health / zombie.maxHealth;

  // Darken color as health decreases
  const baseColor = config.color;

  if (healthPercent < 0.5) {
    return baseColor.replace(/[0-9a-f]{2}/gi, (match) => {
      const val = parseInt(match, 16);
      return Math.floor(val * 0.7)
        .toString(16)
        .padStart(2, "0");
    });
  }

  return baseColor;
}

/**
 * Create a gate
 */
export function createGate(lane: number, type: GateType, value: number): Gate {
  // Calculate gate position - spread gates across screen width
  const numLanes = 2;
  const laneWidth = CANVAS_WIDTH / numLanes;
  const laneStart = lane * laneWidth;
  const gateX = laneStart + (laneWidth - GATE_WIDTH) / 2;

  return {
    x: gateX,
    y: -GATE_HEIGHT - 20, // Start above screen
    width: GATE_WIDTH,
    height: GATE_HEIGHT,
    lane,
    type,
    value,
    active: true,
    passed: false,
  };
}
