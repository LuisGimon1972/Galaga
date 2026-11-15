import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SPEED } from '../galagaConstants';

export class PlayerShip {
  public x: number;
  public y: number;
  public width = 36;
  public height = 36;
  public isAlive = true;
  public hasDoubleLaser = false;

  constructor() {
    this.x = CANVAS_WIDTH / 2 - this.width / 2;
    this.y = CANVAS_HEIGHT - 60;
  }

  public move(dir: number): void {
    this.x += dir * PLAYER_SPEED;
    if (this.x < 10) this.x = 10;
    if (this.x > CANVAS_WIDTH - this.width - 10) {
      this.x = CANVAS_WIDTH - this.width - 10;
    }
  }

  public reset(): void {
    this.x = CANVAS_WIDTH / 2 - this.width / 2;
    this.y = CANVAS_HEIGHT - 60;
    this.isAlive = true;
    this.hasDoubleLaser = false;
  }
}
