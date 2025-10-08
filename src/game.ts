// Main game logic

import type { Player, Bullet, Zombie, GameState, Gate } from "./types";
import { ZombieType, GateType } from "./types";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BASE_ZOMBIES_PER_WAVE,
  WAVE_ZOMBIE_INCREASE,
  WAVE_DELAY,
  ZOMBIE_SPAWN_INTERVAL,
  DEATH_RESPAWN_DELAY,
  PLAYER_INVULNERABLE_TIME,
  BULLET_LIFETIME,
  GATE_SPAWN_INTERVAL,
  GATE_SPEED,
  SHOTGUN_SOUND_INTERVAL,
} from "./constants";
import {
  createPlayer,
  createBullet,
  createRandomZombie,
  createGate,
  updateZombieAI,
  damageZombie,
} from "./entities";
import { Renderer } from "./renderer";
import { EffectsManager } from "./effects";
import { checkRectCircleCollision, checkRectCollision } from "./utils";

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private effects: EffectsManager;
  private renderer: Renderer;

  private player: Player;
  private bullets: Bullet[] = [];
  private zombies: Zombie[] = [];
  private gates: Gate[] = [];

  private gameState: GameState;
  private keys: Record<string, boolean> = {};

  private lastTime: number = 0;
  private lastZombieSpawnTime: number = 0;
  private lastGateSpawnTime: number = 0;
  private deathTime: number = 0;
  private isDead: boolean = false;
  private lastShotgunSoundTime: number = 0;
  private shotgunSound: HTMLAudioElement;
  private soundEnabled: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    // Set canvas size
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    // Initialize systems
    this.effects = new EffectsManager();
    this.renderer = new Renderer(this.ctx, this.effects);

    // Initialize game state
    this.gameState = {
      isPlaying: true,
      isPaused: false,
      currentWave: 1,
      zombiesKilled: 0,
      zombiesInWave: BASE_ZOMBIES_PER_WAVE,
      zombiesSpawned: 0,
      waveStartTime: Date.now(),
      waveActive: true,
      explorationMode: false,
      currentLevel: 1,
    };

    // Create player
    this.player = createPlayer();

    // Setup input handlers
    this.setupInputHandlers();

    // Initialize gate spawn time
    this.lastGateSpawnTime = Date.now();

    // Load shotgun sound
    this.shotgunSound = new Audio("/zombie/shotgun.wav");
    this.shotgunSound.volume = 0.3;
    this.lastShotgunSoundTime = Date.now();

    // Start game loop
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  private setupInputHandlers(): void {
    // Keyboard
    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
      // Enable sound on first key press
      if (!this.soundEnabled) {
        this.soundEnabled = true;
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Enable sound on first click
    window.addEventListener(
      "click",
      () => {
        if (!this.soundEnabled) {
          this.soundEnabled = true;
        }
      },
      { once: true }
    );
  }

  private gameLoop(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (!this.gameState.isPaused && this.gameState.isPlaying) {
      if (this.isDead) {
        this.updateDeath(currentTime);
      } else {
        this.update(currentTime, deltaTime);
      }
    }

    this.render();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  private update(currentTime: number, deltaTime: number): void {
    // Play shotgun sound periodically (only if sound is enabled)
    if (
      this.soundEnabled &&
      currentTime - this.lastShotgunSoundTime > SHOTGUN_SOUND_INTERVAL
    ) {
      this.shotgunSound.currentTime = 0;
      this.shotgunSound.play().catch(() => {
        // Ignore errors (e.g., autoplay policy)
      });
      this.lastShotgunSoundTime = currentTime;
    }

    // Update player
    this.updatePlayer(currentTime, deltaTime);

    // Update bullets
    this.updateBullets(currentTime);

    // Update zombies
    this.updateZombies(currentTime, deltaTime);

    // Spawn zombies
    this.updateZombieSpawning(currentTime);

    // Update wave system
    this.updateWaveSystem(currentTime);

    // Update gates
    this.updateGates(currentTime);

    // Spawn gates
    this.updateGateSpawning(currentTime);

    // Update effects
    this.effects.updateMuzzleFlashes(deltaTime);
    this.effects.updateExplosions(currentTime);

    // Check collisions
    this.checkCollisions(currentTime);

    // Check gate collisions
    this.checkGateCollisions();
  }

  private updatePlayer(currentTime: number, deltaTime: number): void {
    // Update invulnerability
    if (this.player.invulnerableTime > 0) {
      this.player.invulnerableTime -= deltaTime;
    }

    // Update damage flash
    if (this.player.damageFlashTime > 0) {
      this.player.damageFlashTime -= deltaTime;
    }

    // Handle free horizontal movement (A/D or Arrow Keys)
    if (this.keys["a"] || this.keys["arrowleft"]) {
      this.player.x -= this.player.speed;
    }
    if (this.keys["d"] || this.keys["arrowright"]) {
      this.player.x += this.player.speed;
    }

    // Keep player within canvas bounds (horizontal)
    if (this.player.x < 0) {
      this.player.x = 0;
    }
    if (this.player.x > CANVAS_WIDTH - this.player.width) {
      this.player.x = CANVAS_WIDTH - this.player.width;
    }

    // Keep player locked at bottom of screen
    this.player.y = CANVAS_HEIGHT - this.player.height - 20;

    // Player always aims upward (straight up)
    this.player.rotation = -Math.PI / 2; // Point straight up

    // Auto-shoot
    if (currentTime - this.player.lastShootTime > this.player.shootInterval) {
      this.shootBullet(currentTime);
      this.player.lastShootTime = currentTime;
    }
  }

  private shootBullet(currentTime: number): void {
    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;

    // Shoot multiple bullets based on shooter count
    const spreadAngle = Math.PI / 8; // 22.5 degrees spread
    const bulletsToShoot = Math.min(this.player.shooterCount, 10); // Max 10 bullets

    for (let i = 0; i < bulletsToShoot; i++) {
      // Calculate spread for multiple bullets
      const offset =
        ((i - (bulletsToShoot - 1) / 2) * spreadAngle) /
        Math.max(1, bulletsToShoot - 1);
      const rotation = this.player.rotation + offset;

      // Calculate gun position
      const gunLength = 25;
      const gunX = playerCenterX + Math.cos(rotation) * gunLength;
      const gunY = playerCenterY + Math.sin(rotation) * gunLength;

      const bullet = createBullet(gunX, gunY, rotation, currentTime);
      this.bullets.push(bullet);

      // Create muzzle flash effect
      this.effects.createMuzzleFlash(gunX, gunY, rotation);
    }
  }

  private updateBullets(currentTime: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      // Update position
      bullet.x += bullet.velocityX;
      bullet.y += bullet.velocityY;

      // Check if bullet is out of bounds or expired
      if (
        bullet.x < -50 ||
        bullet.x > CANVAS_WIDTH + 50 ||
        bullet.y < -50 ||
        bullet.y > CANVAS_HEIGHT + 50 ||
        currentTime - bullet.createdAt > BULLET_LIFETIME
      ) {
        this.bullets.splice(i, 1);
      }
    }
  }

  private updateZombies(currentTime: number, deltaTime: number): void {
    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zombie = this.zombies[i];

      // Update AI
      updateZombieAI(zombie, playerCenterX, playerCenterY);

      // Update blood particles
      this.effects.updateBloodParticles(zombie.bloodParticles, deltaTime);

      // Handle spitter zombie special attack
      if (zombie.type === ZombieType.SPITTER) {
        if (
          zombie.lastSpitTime === undefined ||
          currentTime - zombie.lastSpitTime > (zombie.spitCooldown || 2500)
        ) {
          this.zombieSpitterAttack(
            zombie,
            playerCenterX,
            playerCenterY,
            currentTime
          );
          zombie.lastSpitTime = currentTime;
        }
      }

      // Remove zombies that go off the bottom of the screen (they escaped)
      if (zombie.y > CANVAS_HEIGHT + zombie.radius) {
        // Zombie escaped - player takes damage
        this.damagePlayer(5);
        this.zombies.splice(i, 1);
      }
    }
  }

  private zombieSpitterAttack(
    zombie: Zombie,
    targetX: number,
    targetY: number,
    currentTime: number
  ): void {
    // Create a projectile toward the player
    const angle = Math.atan2(targetY - zombie.y, targetX - zombie.x);
    const bullet = createBullet(zombie.x, zombie.y, angle, currentTime);
    bullet.damage = zombie.damage;
    bullet.velocityX *= 0.5; // Slower projectile
    bullet.velocityY *= 0.5;

    // Store as enemy bullet (we'll need to track this separately)
    // For simplicity, we'll handle this in collision detection
    this.bullets.push(bullet);
  }

  private updateZombieSpawning(currentTime: number): void {
    if (!this.gameState.waveActive) return;

    // Check if we need to spawn more zombies
    if (
      this.gameState.zombiesSpawned < this.gameState.zombiesInWave &&
      currentTime - this.lastZombieSpawnTime > ZOMBIE_SPAWN_INTERVAL
    ) {
      const zombie = createRandomZombie();
      this.zombies.push(zombie);
      this.gameState.zombiesSpawned++;
      this.lastZombieSpawnTime = currentTime;
    }
  }

  private updateWaveSystem(currentTime: number): void {
    // Check if wave is complete
    if (
      this.gameState.waveActive &&
      this.gameState.zombiesSpawned >= this.gameState.zombiesInWave &&
      this.zombies.length === 0
    ) {
      this.completeWave(currentTime);
    }

    // Check if wave delay is over
    if (
      !this.gameState.waveActive &&
      currentTime - this.gameState.waveStartTime > WAVE_DELAY
    ) {
      this.startNextWave(currentTime);
    }
  }

  private completeWave(currentTime: number): void {
    this.gameState.waveActive = false;
    this.gameState.waveStartTime = currentTime;
    this.gameState.explorationMode = true;

    // Heal player slightly
    this.player.health = Math.min(
      this.player.health + 20,
      this.player.maxHealth
    );
  }

  private startNextWave(currentTime: number): void {
    this.gameState.currentWave++;
    this.gameState.zombiesInWave =
      BASE_ZOMBIES_PER_WAVE +
      (this.gameState.currentWave - 1) * WAVE_ZOMBIE_INCREASE;
    this.gameState.zombiesSpawned = 0;
    this.gameState.zombiesKilled = 0;
    this.gameState.waveActive = true;
    this.gameState.explorationMode = false;
    this.gameState.waveStartTime = currentTime;
    this.lastZombieSpawnTime = currentTime;
  }

  private checkCollisions(currentTime: number): void {
    // Bullet vs Zombie collisions
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      let bulletHit = false;

      for (let j = this.zombies.length - 1; j >= 0; j--) {
        const zombie = this.zombies[j];

        // Check collision
        if (
          checkRectCircleCollision(bullet, zombie.x, zombie.y, zombie.radius)
        ) {
          // Damage zombie
          const died = damageZombie(zombie, bullet.damage);

          // Create blood particles
          const bloodParticles = this.effects.createBloodParticles(
            zombie.x,
            zombie.y
          );
          zombie.bloodParticles.push(...bloodParticles);

          if (died) {
            // Zombie died
            this.handleZombieDeath(zombie);
            this.zombies.splice(j, 1);
            this.gameState.zombiesKilled++;
          }

          bulletHit = true;
          break;
        }
      }

      if (bulletHit) {
        this.bullets.splice(i, 1);
      }
    }

    // Zombie vs Player collisions
    if (this.player.invulnerableTime <= 0) {
      for (const zombie of this.zombies) {
        if (
          checkRectCircleCollision(
            this.player,
            zombie.x,
            zombie.y,
            zombie.radius
          ) &&
          currentTime - zombie.lastAttackTime > zombie.attackCooldown
        ) {
          this.damagePlayer(zombie.damage);
          zombie.lastAttackTime = currentTime;
        }
      }
    }
  }

  private handleZombieDeath(zombie: Zombie): void {
    // Create more blood particles
    const bloodParticles = this.effects.createBloodParticles(
      zombie.x,
      zombie.y
    );
    zombie.bloodParticles.push(...bloodParticles);
  }

  private damagePlayer(damage: number): void {
    if (this.player.invulnerableTime > 0) return;

    this.player.health -= damage;
    this.player.damageFlashTime = 200;
    this.player.invulnerableTime = PLAYER_INVULNERABLE_TIME;

    if (this.player.health <= 0) {
      this.handlePlayerDeath();
    }
  }

  private handlePlayerDeath(): void {
    this.isDead = true;
    this.deathTime = Date.now();
  }

  private updateDeath(currentTime: number): void {
    // Wait for respawn delay
    if (currentTime - this.deathTime > DEATH_RESPAWN_DELAY) {
      this.respawnPlayer();
    }
  }

  private respawnPlayer(): void {
    this.isDead = false;

    // Reset player position and health (bottom center)
    this.player.x = CANVAS_WIDTH / 2 - this.player.width / 2;
    this.player.y = CANVAS_HEIGHT - this.player.height - 20;
    this.player.health = this.player.maxHealth;
    this.player.invulnerableTime = 2000; // 2 seconds of invulnerability after respawn

    // Clear enemies and bullets
    this.zombies = [];
    this.bullets = [];
    this.effects.clear();

    // Reset wave but keep progress
    this.gameState.zombiesSpawned = 0;
    this.gameState.waveActive = true;
  }

  private updateGates(_currentTime: number): void {
    for (let i = this.gates.length - 1; i >= 0; i--) {
      const gate = this.gates[i];

      // Move gate down
      gate.y += GATE_SPEED;

      // Remove gates that are off screen
      if (gate.y > CANVAS_HEIGHT + gate.height) {
        this.gates.splice(i, 1);
      }
    }
  }

  private updateGateSpawning(currentTime: number): void {
    if (currentTime - this.lastGateSpawnTime > GATE_SPAWN_INTERVAL) {
      // Create gates for both lanes
      const leftLaneType =
        Math.random() > 0.5 ? GateType.ADD : GateType.MULTIPLY;
      const rightLaneType =
        Math.random() > 0.5 ? GateType.ADD : GateType.MULTIPLY;

      // Random values
      const leftValue =
        leftLaneType === GateType.ADD
          ? Math.floor(Math.random() * 3) + 1 // +1 to +3
          : Math.floor(Math.random() * 2) + 2; // x2 to x3

      const rightValue =
        rightLaneType === GateType.ADD
          ? Math.floor(Math.random() * 3) + 1 // +1 to +3
          : Math.floor(Math.random() * 2) + 2; // x2 to x3

      const leftGate = createGate(0, leftLaneType, leftValue);
      const rightGate = createGate(1, rightLaneType, rightValue);

      this.gates.push(leftGate);
      this.gates.push(rightGate);

      console.log(
        `Spawned gates: Left ${leftGate.type} ${leftValue} at (${leftGate.x}, ${leftGate.y}), Right ${rightGate.type} ${rightValue} at (${rightGate.x}, ${rightGate.y})`
      );

      this.lastGateSpawnTime = currentTime;
    }
  }

  private checkGateCollisions(): void {
    for (const gate of this.gates) {
      if (gate.passed || !gate.active) continue;

      // Check if player collides with gate
      if (checkRectCollision(this.player, gate)) {
        gate.passed = true;

        // Apply gate effect
        if (gate.type === GateType.ADD) {
          this.player.shooterCount += gate.value;
        } else if (gate.type === GateType.MULTIPLY) {
          this.player.shooterCount *= gate.value;
        }

        // Cap shooter count at reasonable maximum
        this.player.shooterCount = Math.min(this.player.shooterCount, 50);
      }
    }
  }

  private render(): void {
    // Clear canvas
    this.renderer.clear();

    // Render game entities
    this.renderer.renderGates(this.gates);
    this.renderer.renderBullets(this.bullets);
    this.renderer.renderZombies(this.zombies);
    this.renderer.renderPlayer(this.player);

    // Render effects
    this.renderer.renderEffects();

    // Render UI
    this.renderer.renderUI(this.player, this.gameState, this.soundEnabled);

    // Render death screen if dead
    if (this.isDead) {
      this.renderer.renderGameOver(this.player, this.gameState);
    }
  }
}
