// Rendering system

import type { Player, Bullet, Zombie, GameState, Gate } from "./types";
import { GateType } from "./types";
import { CANVAS_WIDTH, CANVAS_HEIGHT, LANE_DIVIDER_X } from "./constants";
import { getZombieColor } from "./entities";
import { EffectsManager } from "./effects";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private effects: EffectsManager;
  private zombieImage: HTMLImageElement;
  private zombieImageLoaded: boolean = false;

  constructor(ctx: CanvasRenderingContext2D, effects: EffectsManager) {
    this.ctx = ctx;
    this.effects = effects;

    // Load zombie image
    this.zombieImage = new Image();
    this.zombieImage.src = "/zombie.png";
    this.zombieImage.onload = () => {
      this.zombieImageLoaded = true;
    };
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    // Dark background
    this.ctx.fillStyle = "#1a1a1a";
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid for depth
    this.drawGrid();
  }

  /**
   * Draw background grid and lane divider
   */
  private drawGrid(): void {
    this.ctx.strokeStyle = "#2a2a2a";
    this.ctx.lineWidth = 1;

    const gridSize = 50;

    // Vertical lines
    for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, CANVAS_HEIGHT);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(CANVAS_WIDTH, y);
      this.ctx.stroke();
    }

    // Draw lane divider (more visible)
    this.ctx.strokeStyle = "#ffff00";
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 10]);
    this.ctx.beginPath();
    this.ctx.moveTo(LANE_DIVIDER_X, 0);
    this.ctx.lineTo(LANE_DIVIDER_X, CANVAS_HEIGHT);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  /**
   * Render the player
   */
  renderPlayer(player: Player): void {
    this.ctx.save();

    // Translate to player center
    this.ctx.translate(
      player.x + player.width / 2,
      player.y + player.height / 2
    );

    // Apply damage flash effect
    if (player.damageFlashTime > 0) {
      this.ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.3;
    }

    // Rotate to face mouse
    this.ctx.rotate(player.rotation);

    // Draw player body (rectangle)
    this.ctx.fillStyle = player.invulnerableTime > 0 ? "#ffff00" : "#4a9eff";
    this.ctx.fillRect(
      -player.width / 2,
      -player.height / 2,
      player.width,
      player.height
    );

    // Draw player "face" direction indicator
    this.ctx.fillStyle = "#ffffff";
    this.ctx.beginPath();
    this.ctx.moveTo(player.width / 2 - 5, 0);
    this.ctx.lineTo(player.width / 2 + 5, -5);
    this.ctx.lineTo(player.width / 2 + 5, 5);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw gun
    this.ctx.fillStyle = "#333333";
    this.ctx.fillRect(player.width / 2 - 8, -3, 20, 6);

    this.ctx.restore();

    // Draw health bar above player
    this.renderHealthBar(
      player.x + player.width / 2,
      player.y - 10,
      player.health,
      player.maxHealth,
      50
    );
  }

  /**
   * Render bullets
   */
  renderBullets(bullets: Bullet[]): void {
    this.ctx.fillStyle = "#ffff00";

    for (const bullet of bullets) {
      if (!bullet.active) continue;

      this.ctx.save();
      this.ctx.translate(bullet.x, bullet.y);

      // Rotate bullet based on velocity
      const angle = Math.atan2(bullet.velocityY, bullet.velocityX);
      this.ctx.rotate(angle);

      // Draw bullet as elongated rectangle
      this.ctx.fillRect(
        -bullet.width / 2,
        -bullet.height / 2,
        bullet.width,
        bullet.height
      );

      // Draw bullet glow
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = "#ffff00";
      this.ctx.fillRect(
        -bullet.width / 2,
        -bullet.height / 2,
        bullet.width,
        bullet.height
      );
      this.ctx.shadowBlur = 0;

      this.ctx.restore();
    }
  }

  /**
   * Render zombies
   */
  renderZombies(zombies: Zombie[]): void {
    for (const zombie of zombies) {
      if (!zombie.active) continue;

      // Render blood particles first (behind zombie)
      this.effects.renderBloodParticles(this.ctx, zombie.bloodParticles);

      // Draw zombie image if loaded, otherwise fallback to circle
      if (this.zombieImageLoaded) {
        this.ctx.save();

        // Calculate size based on zombie radius (diameter)
        const size = zombie.radius * 2;

        // Apply health-based tint
        const healthPercent = zombie.health / zombie.maxHealth;
        if (healthPercent < 0.5) {
          this.ctx.globalAlpha = 0.7 + healthPercent * 0.6;
        }

        // Apply type-based color tint
        const color = getZombieColor(zombie);
        if (color !== "#ff4444") {
          // Only tint if not standard zombie color
          this.ctx.globalCompositeOperation = "multiply";
          this.ctx.fillStyle = color;
          this.ctx.fillRect(
            zombie.x - size / 2,
            zombie.y - size / 2,
            size,
            size
          );
          this.ctx.globalCompositeOperation = "source-over";
        }

        // Draw the zombie image centered at zombie position
        this.ctx.drawImage(
          this.zombieImage,
          zombie.x - size / 2,
          zombie.y - size / 2,
          size,
          size
        );

        this.ctx.restore();
      } else {
        // Fallback to circle rendering if image not loaded
        const color = getZombieColor(zombie);
        this.ctx.fillStyle = color;

        this.ctx.beginPath();
        this.ctx.arc(zombie.x, zombie.y, zombie.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw zombie outline
        this.ctx.strokeStyle = "#000000";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw zombie eyes
        this.ctx.fillStyle = "#ff0000";
        const eyeOffset = zombie.radius * 0.4;
        this.ctx.beginPath();
        this.ctx.arc(
          zombie.x - eyeOffset / 2,
          zombie.y - eyeOffset / 2,
          3,
          0,
          Math.PI * 2
        );
        this.ctx.arc(
          zombie.x + eyeOffset / 2,
          zombie.y - eyeOffset / 2,
          3,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
      }

      // Draw type indicator
      this.drawZombieTypeIndicator(zombie);

      // Draw health bar
      this.renderHealthBar(
        zombie.x,
        zombie.y - zombie.radius - 10,
        zombie.health,
        zombie.maxHealth,
        zombie.radius * 2
      );
    }
  }

  /**
   * Draw zombie type indicator
   */
  private drawZombieTypeIndicator(zombie: Zombie): void {
    let symbol = "";

    switch (zombie.type) {
      case "runner":
        symbol = "⚡";
        break;
      case "tank":
        symbol = "🛡";
        break;
      case "spitter":
        symbol = "💧";
        break;
      case "exploder":
        symbol = "💣";
        break;
      default:
        return;
    }

    this.ctx.font = "16px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(symbol, zombie.x, zombie.y);
  }

  /**
   * Render health bar
   */
  private renderHealthBar(
    x: number,
    y: number,
    health: number,
    maxHealth: number,
    width: number
  ): void {
    const height = 6;
    const healthPercent = health / maxHealth;

    // Background
    this.ctx.fillStyle = "#333333";
    this.ctx.fillRect(x - width / 2, y, width, height);

    // Health
    const healthColor =
      healthPercent > 0.5
        ? "#00ff00"
        : healthPercent > 0.25
        ? "#ffff00"
        : "#ff0000";
    this.ctx.fillStyle = healthColor;
    this.ctx.fillRect(x - width / 2, y, width * healthPercent, height);

    // Border
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - width / 2, y, width, height);
  }

  /**
   * Render gates
   */
  renderGates(gates: Gate[]): void {
    const time = Date.now();

    for (const gate of gates) {
      if (!gate.active) continue;

      // Pulsing animation for active gates
      const pulseScale = gate.passed ? 0 : Math.sin(time * 0.005) * 0.1 + 1;

      this.ctx.save();
      this.ctx.translate(gate.x + gate.width / 2, gate.y + gate.height / 2);
      this.ctx.scale(pulseScale, pulseScale);

      // Draw gate shadow for depth
      if (!gate.passed) {
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor =
          gate.type === GateType.ADD ? "#00ff00" : "#ff6600";
      }

      // Draw gate background with gradient
      const gradient = this.ctx.createLinearGradient(
        -gate.width / 2,
        -gate.height / 2,
        gate.width / 2,
        gate.height / 2
      );

      if (gate.passed) {
        gradient.addColorStop(0, "#666666");
        gradient.addColorStop(1, "#444444");
      } else if (gate.type === GateType.ADD) {
        gradient.addColorStop(0, "#00ff00");
        gradient.addColorStop(0.5, "#00cc00");
        gradient.addColorStop(1, "#009900");
      } else {
        gradient.addColorStop(0, "#ff6600");
        gradient.addColorStop(0.5, "#ff5500");
        gradient.addColorStop(1, "#ff4400");
      }

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(
        -gate.width / 2,
        -gate.height / 2,
        gate.width,
        gate.height
      );

      // Draw gate border with glow
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 4;
      this.ctx.strokeRect(
        -gate.width / 2,
        -gate.height / 2,
        gate.width,
        gate.height
      );

      // Reset shadow
      this.ctx.shadowBlur = 0;

      // Draw symbol and value with text shadow
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "bold 42px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      // Text shadow for better visibility
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = "#000000";

      const symbol = gate.type === GateType.ADD ? "+" : "×";
      const text = `${symbol}${gate.value}`;

      this.ctx.fillText(text, 0, 0);

      this.ctx.shadowBlur = 0;
      this.ctx.restore();
    }
  }

  /**
   * Render UI
   */
  renderUI(player: Player, gameState: GameState): void {
    // Top left - Player stats
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 20px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText(
      `Health: ${Math.ceil(player.health)}/${player.maxHealth}`,
      20,
      30
    );
    this.ctx.fillText(`Shooters: ${player.shooterCount}`, 20, 60);
    this.ctx.fillText(`Wave: ${gameState.currentWave}`, 20, 90);

    // Wave progress
    if (gameState.waveActive) {
      const zombiesRemaining =
        gameState.zombiesInWave - gameState.zombiesKilled;
      this.ctx.fillText(`Zombies: ${zombiesRemaining}`, 20, 120);
    } else {
      this.ctx.fillText("WAVE COMPLETE!", 20, 120);
    }

    // Top right - Instructions
    this.ctx.textAlign = "right";
    this.ctx.font = "16px Arial";
    this.ctx.fillStyle = "#aaaaaa";
    this.ctx.fillText("A/D or ← → - Move Left/Right", CANVAS_WIDTH - 20, 30);
    this.ctx.fillText("Auto-Shoot", CANVAS_WIDTH - 20, 55);

    // Highlight gate instructions
    this.ctx.font = "bold 18px Arial";
    this.ctx.fillStyle = "#ffff00";
    this.ctx.fillText("⚡ COLLECT COLORED GATES! ⚡", CANVAS_WIDTH - 20, 80);
    this.ctx.font = "16px Arial";
    this.ctx.fillStyle = "#00ff00";
    this.ctx.fillText(
      "🟩 GREEN = Add Shooters (+1, +2, +3)",
      CANVAS_WIDTH - 20,
      105
    );
    this.ctx.fillStyle = "#ff6600";
    this.ctx.fillText(
      "🟧 ORANGE = Multiply Shooters (×2, ×3)",
      CANVAS_WIDTH - 20,
      130
    );

    // Center - Mode indicator
    this.ctx.textAlign = "center";
    this.ctx.font = "bold 24px Arial";
    if (gameState.explorationMode) {
      this.ctx.fillStyle = "#ffd700";
      this.ctx.fillText("WAVE COMPLETE!", CANVAS_WIDTH / 2, 40);
      this.ctx.font = "16px Arial";
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillText("Next wave incoming...", CANVAS_WIDTH / 2, 65);
    }
  }

  /**
   * Render game over screen
   */
  renderGameOver(_player: Player, gameState: GameState): void {
    // Semi-transparent overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Game Over text
    this.ctx.fillStyle = "#ff0000";
    this.ctx.font = "bold 72px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("YOU DIED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 100);

    // Stats
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "32px Arial";
    this.ctx.fillText(
      `Wave Reached: ${gameState.currentWave}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2
    );
    this.ctx.fillText(
      `Zombies Killed: ${gameState.zombiesKilled}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 50
    );

    // Respawn message
    this.ctx.fillStyle = "#aaaaaa";
    this.ctx.font = "20px Arial";
    this.ctx.fillText(
      "Respawning...",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 100
    );
  }

  /**
   * Render effects
   */
  renderEffects(): void {
    this.effects.renderMuzzleFlashes(this.ctx);
    this.effects.renderExplosions(this.ctx);
  }
}
