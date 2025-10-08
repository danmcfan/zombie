// Core game types and interfaces

export interface Vector2D {
  x: number;
  y: number;
}

export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

export interface Player extends Entity {
  health: number;
  maxHealth: number;
  speed: number;
  velocityX: number;
  velocityY: number;
  rotation: number; // Angle in radians for aiming
  isShooting: boolean;
  lastShootTime: number;
  shootInterval: number;
  damageFlashTime: number;
  invulnerableTime: number;
  shooterCount: number; // Number of shooters
  currentLane: number; // 0 = left lane, 1 = right lane (kept for compatibility)
}

export interface Bullet extends Entity {
  velocityX: number;
  velocityY: number;
  damage: number;
  lifetime: number;
  createdAt: number;
}

export const ZombieType = {
  STANDARD: "standard",
  RUNNER: "runner",
  TANK: "tank",
  SPITTER: "spitter",
} as const;

export type ZombieType = (typeof ZombieType)[keyof typeof ZombieType];

export interface Zombie extends Entity {
  type: ZombieType;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  lastAttackTime: number;
  attackCooldown: number;
  bloodParticles: BloodParticle[];
  deathTime?: number;
  spitCooldown?: number; // For spitter type
  lastSpitTime?: number;
}

export interface BloodParticle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
  lifetime: number;
  alpha: number;
}

export interface MuzzleFlash {
  x: number;
  y: number;
  rotation: number;
  lifetime: number;
  size: number;
}

export interface ResourceNode extends Entity {
  resourceAmount: number;
  collected: boolean;
}

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  currentWave: number;
  zombiesKilled: number;
  zombiesInWave: number;
  zombiesSpawned: number;
  waveStartTime: number;
  waveActive: boolean;
  explorationMode: boolean;
  currentLevel: number;
}

export interface ExplosionEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  lifetime: number;
  createdAt: number;
}

export const GateType = {
  ADD: "add",
  MULTIPLY: "multiply",
} as const;

export type GateType = (typeof GateType)[keyof typeof GateType];

export interface Gate {
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number; // 0 = left, 1 = right
  type: GateType;
  value: number;
  active: boolean;
  passed: boolean;
}
