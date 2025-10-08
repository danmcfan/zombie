// Game constants and configuration

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 800;

// Player constants
export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 40;
export const PLAYER_SPEED = 4;
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_SHOOT_INTERVAL = 150; // milliseconds
export const PLAYER_INVULNERABLE_TIME = 1000; // milliseconds after taking damage

// Bullet constants
export const BULLET_WIDTH = 6;
export const BULLET_HEIGHT = 12;
export const BULLET_SPEED = 10;
export const BULLET_DAMAGE = 20;
export const BULLET_LIFETIME = 2000; // milliseconds

// Zombie constants
export const ZOMBIE_SPAWN_MARGIN = 50; // pixels from edge

// Zombie type configurations
export const ZOMBIE_CONFIGS: Record<
  string,
  {
    health: number;
    speed: number;
    damage: number;
    radius: number;
    attackCooldown: number;
    color: string;
    resourceDrop: number;
    spawnWeight: number;
    spitCooldown?: number;
    explosionRadius?: number;
  }
> = {
  standard: {
    health: 60,
    speed: 1.2,
    damage: 10,
    radius: 18,
    attackCooldown: 1000,
    color: "#4a7c4e",
    resourceDrop: 5,
    spawnWeight: 50,
  },
  runner: {
    health: 30,
    speed: 3.5,
    damage: 8,
    radius: 15,
    attackCooldown: 800,
    color: "#7c4e4a",
    resourceDrop: 8,
    spawnWeight: 25,
  },
  tank: {
    health: 200,
    speed: 0.6,
    damage: 25,
    radius: 28,
    attackCooldown: 1500,
    color: "#3d5a3d",
    resourceDrop: 15,
    spawnWeight: 10,
  },
  spitter: {
    health: 45,
    speed: 0.9,
    damage: 12,
    radius: 16,
    attackCooldown: 2000,
    spitCooldown: 2500,
    color: "#7c7c4a",
    resourceDrop: 10,
    spawnWeight: 10,
  },
  exploder: {
    health: 40,
    speed: 2.0,
    damage: 35,
    radius: 20,
    explosionRadius: 100,
    attackCooldown: 500,
    color: "#7c4a4a",
    resourceDrop: 12,
    spawnWeight: 5,
  },
};

// Wave system constants
export const BASE_ZOMBIES_PER_WAVE = 10;
export const WAVE_ZOMBIE_INCREASE = 5;
export const WAVE_DELAY = 5000; // milliseconds between waves
export const ZOMBIE_SPAWN_INTERVAL = 800; // milliseconds between spawns in a wave

// Resource constants
export const RESOURCE_NODE_SIZE = 30;
export const RESOURCES_PER_NODE = 10;
export const RESOURCE_NODES_PER_LEVEL = 5;

// Visual effects constants
export const MUZZLE_FLASH_LIFETIME = 50; // milliseconds
export const BLOOD_PARTICLE_COUNT = 8;
export const BLOOD_PARTICLE_LIFETIME = 800; // milliseconds
export const EXPLOSION_LIFETIME = 500; // milliseconds

// Death penalty constants
export const DEATH_RESOURCE_LOSS_PERCENT = 0.5; // Lose 50% of resources on death
export const DEATH_RESPAWN_DELAY = 2000; // milliseconds

// Lane system constants
export const NUM_LANES = 2;
export const LANE_WIDTH = CANVAS_WIDTH / NUM_LANES;
export const LANE_DIVIDER_X = CANVAS_WIDTH / 2;

// Gate constants
export const GATE_WIDTH = LANE_WIDTH * 0.8;
export const GATE_HEIGHT = 60;
export const GATE_SPAWN_INTERVAL = 3000; // milliseconds between gate spawns
export const GATE_SPEED = 3; // pixels per frame
export const INITIAL_SHOOTER_COUNT = 1;
