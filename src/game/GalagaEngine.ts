import { CANVAS_WIDTH, CANVAS_HEIGHT, BULLET_SPEED, EnemyType } from './galagaConstants';
import { PlayerShip } from './classes/PlayerShip';
import { GalagaEnemy } from './classes/GalagaEnemy';
import { GalagaAtlas } from './classes/GalagaAtlas';

type Bullet = { x: number; y: number; vx?: number; isPlayer: boolean };
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
};
type BonusItem = {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  isInvincibility?: boolean;
};

export class GalagaEngine {
  public player: PlayerShip;
  public enemies: (GalagaEnemy & { isBossSprite?: boolean })[] = [];
  public bullets: Bullet[] = [];
  public particles: Particle[] = [];
  public bonuses: BonusItem[] = [];

  public score = 0;
  public lives = 7;
  public wave = 1;
  public isGameOver = false;
  public isVictory = false;
  public moveDir = 0;

  private currentBossMaxHp = 60;

  private lastShotTime = 0;
  private enemyShootTimer = 0;
  private invulnerableTimer = 0;
  private bossMusicTimer = 0;
  private invincibilityDropTimer = 0;
  private starfield: { x: number; y: number; size: number; speed: number }[] = [];
  private readonly galagaAtlas: GalagaAtlas;
  private readonly bossAtlas: GalagaAtlas;
  private groupDx: number = 1.2;

  private audioCtx: AudioContext | null = null;

  constructor() {
    this.player = new PlayerShip();
    this.galagaAtlas = new GalagaAtlas('images/AtlasGalaga.png');
    this.bossAtlas = new GalagaAtlas('images/BossGalaga.png');
    this.initStarfield();
    this.initWave();
    this.initAudio();
  }

  private initAudio(): void {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    } catch {
      // Ignora se bloqueado
    }
  }

  private playExplosionSound(): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    try {
      const bufferSize = this.audioCtx.sampleRate * 0.3;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(50, this.audioCtx.currentTime + 0.3);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      noise.start();
    } catch {
      // Ignora
    }
  }

  private playPlayerDeathSound(): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    try {
      const bufferSize = this.audioCtx.sampleRate * 0.6;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, this.audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(20, this.audioCtx.currentTime + 0.6);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.7, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.6);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      noise.start();
    } catch {
      // Ignora
    }
  }

  private playPowerupSupportOrInvincibility(isInvincibility?: boolean): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = isInvincibility ? 'square' : 'triangle';
      if (isInvincibility) {
        osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, this.audioCtx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 0.25);
      }

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioCtx.currentTime + (isInvincibility ? 0.35 : 0.25),
      );

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + (isInvincibility ? 0.35 : 0.25));
    } catch {
      // Ignora
    }
  }

  private playBossSuspenseBeat(): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65.41, t);
      osc.frequency.setValueAtTime(92.5, t + 0.2);
      osc.frequency.setValueAtTime(58.27, t + 0.4);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.55);
    } catch {
      // Ignora
    }
  }

  private playWaveStartSound(): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    try {
      const t = this.audioCtx.currentTime;

      if (this.wave >= 4) {
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';

        osc1.frequency.setValueAtTime(120, t);
        osc1.frequency.linearRampToValueAtTime(70, t + 0.6);

        osc2.frequency.setValueAtTime(124, t);
        osc2.frequency.linearRampToValueAtTime(72, t + 0.6);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.8);
        osc2.stop(t + 0.8);
      } else {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(580, t + 0.4);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(t);
        osc.stop(t + 0.4);
      }
    } catch {
      // Ignora
    }
  }

  private initStarfield(): void {
    for (let i = 0; i < 60; i++) {
      this.starfield.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 2 + 0.5,
      });
    }
  }

  public initWave(): void {
    this.enemies = [];
    this.bonuses = [];
    this.invulnerableTimer = 120;
    this.bossMusicTimer = 0;
    this.invincibilityDropTimer = 0;

    this.playWaveStartSound();

    if (this.wave === 4) {
      const boss = new GalagaEnemy(CANVAS_WIDTH / 2 - 54, 60, EnemyType.BOSS) as any;
      boss.width = 108;
      boss.height = 108;
      boss.hp = 60;
      boss.scoreValue = 5000;
      boss.isBossSprite = true;
      this.currentBossMaxHp = 60;
      this.enemies.push(boss);
      return;
    }

    if (this.wave === 5) {
      const boss1 = new GalagaEnemy(CANVAS_WIDTH / 2 - 120, 60, EnemyType.BOSS) as any;
      boss1.width = 108;
      boss1.height = 108;
      boss1.hp = 60;
      boss1.scoreValue = 6000;
      boss1.isBossSprite = true;

      const boss2 = new GalagaEnemy(CANVAS_WIDTH / 2 + 12, 60, EnemyType.BOSS) as any;
      boss2.width = 108;
      boss2.height = 108;
      boss2.hp = 60;
      boss2.scoreValue = 6000;
      boss2.isBossSprite = true;

      this.currentBossMaxHp = 120;
      this.enemies.push(boss1);
      this.enemies.push(boss2);
      return;
    }

    const rows = 4;
    const cols = 8;
    const startX = 40;
    const startY = 50;
    const spacingX = 52;
    const spacingY = 36;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type = EnemyType.BEE;
        if (r === 0) type = EnemyType.BOSS;
        else if (r === 1) type = EnemyType.BUTTERFLY;

        const gridX = startX + c * spacingX;
        const gridY = startY + r * spacingY;
        this.enemies.push(new GalagaEnemy(gridX, gridY, type));
      }
    }
  }

  public shoot(): void {
    const now = performance.now();
    if (now - this.lastShotTime < 220) return;
    this.lastShotTime = now;

    if (!this.player.isAlive || this.isGameOver) return;

    if (this.wave >= 4) {
      this.bullets.push({ x: this.player.x + 4, y: this.player.y, vx: -0.8, isPlayer: true });
      this.bullets.push({
        x: this.player.x + this.player.width / 2 - 2,
        y: this.player.y,
        vx: 0,
        isPlayer: true,
      });
      this.bullets.push({
        x: this.player.x + this.player.width - 8,
        y: this.player.y,
        vx: 0.8,
        isPlayer: true,
      });
    } else {
      this.bullets.push({
        x: this.player.x + this.player.width / 2 - 2,
        y: this.player.y,
        vx: 0,
        isPlayer: true,
      });
    }
  }

  public update(): void {
    if (this.isGameOver || this.isVictory) return;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer--;
    }

    if (this.wave === 4 || this.wave === 5) {
      this.bossMusicTimer++;
      if (this.bossMusicTimer >= 50) {
        this.bossMusicTimer = 0;
        this.playBossSuspenseBeat();
      }

      this.invincibilityDropTimer++;
      if (this.invincibilityDropTimer >= 420) {
        this.invincibilityDropTimer = 0;
        this.bonuses.push({
          x: Math.random() * (CANVAS_WIDTH - 60) + 30,
          y: -20,
          width: 22,
          height: 22,
          speed: 1.2,
          isInvincibility: true,
        });
      }
    }

    for (const star of this.starfield) {
      star.y += star.speed;
      if (star.y > CANVAS_HEIGHT) star.y = 0;
    }

    if (this.moveDir !== 0) {
      this.player.move(this.moveDir);
    }

    let hitWall = false;
    const margin = 20;

    for (const enemy of this.enemies) {
      const nextX = enemy.x + this.groupDx;
      if (nextX < margin || nextX > CANVAS_WIDTH - enemy.width - margin) {
        hitWall = true;
      }
    }

    if (hitWall) {
      this.groupDx *= -1;
    }

    for (const enemy of this.enemies) {
      enemy.x += this.groupDx;
      enemy.update();
    }

    if (this.enemies.length > 0) {
      this.enemyShootTimer++;
      const shootInterval = this.wave === 5 ? 14 : this.wave === 4 ? 18 : 60;
      if (this.enemyShootTimer > shootInterval) {
        this.enemyShootTimer = 0;
        const randomEnemy = this.enemies[Math.floor(Math.random() * this.enemies.length)];
        if (randomEnemy) {
          if (this.wave === 4 || this.wave === 5) {
            this.bullets.push({
              x: randomEnemy.x + 20,
              y: randomEnemy.y + randomEnemy.height,
              isPlayer: false,
            });
            this.bullets.push({
              x: randomEnemy.x + randomEnemy.width - 24,
              y: randomEnemy.y + randomEnemy.height,
              isPlayer: false,
            });
          } else {
            this.bullets.push({
              x: randomEnemy.x + randomEnemy.width / 2 - 2,
              y: randomEnemy.y + randomEnemy.height,
              isPlayer: false,
            });
          }
        }
      }
    }

    for (let i = this.bonuses.length - 1; i >= 0; i--) {
      const bonus = this.bonuses[i];
      if (!bonus) continue;
      bonus.y += bonus.speed;

      if (bonus.y > CANVAS_HEIGHT) {
        this.bonuses.splice(i, 1);
        continue;
      }

      if (
        this.player.isAlive &&
        bonus.x < this.player.x + this.player.width &&
        bonus.x + bonus.width > this.player.x &&
        bonus.y < this.player.y + this.player.height &&
        bonus.y + bonus.height > this.player.y
      ) {
        this.playPowerupSupportOrInvincibility(bonus.isInvincibility);

        if (bonus.isInvincibility) {
          this.invulnerableTimer = 180;
          this.createExplosion(
            bonus.x + bonus.width / 2,
            bonus.y + bonus.height / 2,
            '#38bdf8',
            20,
            2.5,
          );
        } else {
          this.lives++;
          this.createExplosion(
            bonus.x + bonus.width / 2,
            bonus.y + bonus.height / 2,
            '#22c55e',
            15,
            2,
          );
        }

        this.bonuses.splice(i, 1);
      }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b) continue;
      b.y += b.isPlayer ? -BULLET_SPEED : BULLET_SPEED * 0.7;
      if (b.vx) b.x += b.vx;

      if (b.y < 0 || b.y > CANVAS_HEIGHT) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.isPlayer) {
        let bulletRemoved = false;
        for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
          const enemy = this.enemies[eIdx];
          if (!enemy) continue;
          if (
            b.x >= enemy.x &&
            b.x <= enemy.x + enemy.width &&
            b.y >= enemy.y &&
            b.y <= enemy.y + enemy.height
          ) {
            enemy.hp--;
            bulletRemoved = true;

            this.createExplosion(
              enemy.x + enemy.width / 2,
              enemy.y + enemy.height / 2,
              '#38bdf8',
              5,
              2,
            );

            if (enemy.hp <= 0) {
              this.score += enemy.scoreValue;
              this.playExplosionSound();

              const dropChance = enemy.type === EnemyType.BOSS ? 0.4 : 0.05;
              if (Math.random() < dropChance) {
                this.bonuses.push({
                  x: enemy.x + enemy.width / 2 - 10,
                  y: enemy.y,
                  width: 20,
                  height: 20,
                  speed: 1.5,
                });
              }

              this.createExplosion(
                enemy.x + enemy.width / 2,
                enemy.y + enemy.height / 2,
                enemy.type === EnemyType.BOSS ? '#fbbf24' : '#f43f5e',
                25,
                4,
              );

              this.enemies.splice(eIdx, 1);
            }
            break;
          }
        }
        if (bulletRemoved) {
          this.bullets.splice(i, 1);
        }
      } else {
        // CORREÇÃO DA COLISÃO NAS BORDAS: Expandida ligeiramente a tolerância de deteção de impacto (`b.x` considerando a largura da bala)
        const bulletWidth = 4;
        if (
          this.player.isAlive &&
          this.invulnerableTimer === 0 &&
          b.x + bulletWidth >= this.player.x &&
          b.x <= this.player.x + this.player.width &&
          b.y + 10 >= this.player.y &&
          b.y <= this.player.y + this.player.height
        ) {
          this.bullets.splice(i, 1);
          this.lives--;
          this.invulnerableTimer = 90;
          this.playPlayerDeathSound();
          this.createExplosion(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            '#ef4444',
            25,
            3,
          );

          if (this.lives <= 0) {
            this.player.isAlive = false;
            this.isGameOver = true;
          } else {
            this.player.reset();
            this.bullets = this.bullets.filter((bullet) => bullet.isPlayer);
          }
        }
      }
    }

    if (this.enemies.length === 0) {
      this.wave++;
      if (this.wave > 5) {
        this.isVictory = true;
      } else {
        this.initWave();
      }
    }

    for (let p = this.particles.length - 1; p >= 0; p--) {
      const part = this.particles[p];
      if (!part) continue;
      part.x += part.vx;
      part.y += part.vy;
      part.life -= 0.025;
      if (part.life <= 0) this.particles.splice(p, 1);
    }
  }

  private createExplosion(x: number, y: number, color: string, count = 15, maxSpeed = 3): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * maxSpeed + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1.2,
        size: Math.random() * 2.5 + 1.5,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#ffffff';
    for (const star of this.starfield) {
      ctx.globalAlpha = star.size / 3;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }

    for (const bonus of this.bonuses) {
      ctx.save();
      const bonusColor = bonus.isInvincibility ? '#38bdf8' : '#22c55e';
      ctx.fillStyle = bonusColor;
      ctx.shadowColor = bonusColor;
      ctx.shadowBlur = 12;
      ctx.fillRect(bonus.x, bonus.y, bonus.width, bonus.height);

      ctx.fillStyle = '#ffffff';
      if (bonus.isInvincibility) {
        ctx.fillRect(bonus.x + 6, bonus.y + 6, 10, 10);
      } else {
        ctx.fillRect(bonus.x + 8, bonus.y + 4, 4, 12);
        ctx.fillRect(bonus.x + 4, bonus.y + 8, 12, 4);
      }
      ctx.restore();
    }

    for (const enemy of this.enemies) {
      if ((enemy as any).isBossSprite) {
        const img = (this.bossAtlas as any).image;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, enemy.x, enemy.y, enemy.width, enemy.height);
        } else {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
      } else {
        let row = 8;
        let col = 0;

        if (enemy.type === EnemyType.BOSS) {
          row = 8;
          col = 0;
        } else if (enemy.type === EnemyType.BUTTERFLY) {
          row = 9;
          col = 0;
        } else {
          row = Math.floor(enemy.x / 50) % 2 === 0 ? 8 : 9;
          col = 0;
        }

        const customOffset = enemy.width > 50 ? 90 : 34;

        const drawn = this.galagaAtlas.draw(
          ctx,
          row,
          col,
          enemy.x,
          enemy.y,
          enemy.width,
          enemy.height,
          customOffset,
        );

        if (!drawn) {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
      }
    }

    if ((this.wave === 4 || this.wave === 5) && this.enemies.length > 0) {
      const totalHp = this.enemies.reduce((sum, e) => sum + e.hp, 0);
      const barWidth = 240;
      const barHeight = 12;
      const barX = CANVAS_WIDTH / 2 - barWidth / 2;
      const barY = 20;

      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      const healthRatio = Math.max(0, totalHp / this.currentBossMaxHp);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      const label =
        this.wave === 5
          ? `DUPLO CHEFE: ${totalHp} / ${this.currentBossMaxHp}`
          : `CHEFE SUPREMO: ${totalHp} / ${this.currentBossMaxHp}`;
      ctx.fillText(label, CANVAS_WIDTH / 2, barY - 4);
    }

    for (const b of this.bullets) {
      ctx.fillStyle = b.isPlayer ? '#38bdf8' : '#ef4444';
      ctx.fillRect(b.x, b.y, 4, 10);
    }

    if (this.player.isAlive) {
      if (this.invulnerableTimer === 0 || Math.floor(this.invulnerableTimer / 4) % 2 === 0) {
        const playerRow = this.wave >= 4 ? 3 : 1;
        const playerCol = 0;

        const drawnPlayer = this.galagaAtlas.draw(
          ctx,
          playerRow,
          playerCol,
          this.player.x,
          this.player.y,
          this.player.width,
          this.player.height,
        );

        if (!drawnPlayer) {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        }
      }
    }
  }
}
