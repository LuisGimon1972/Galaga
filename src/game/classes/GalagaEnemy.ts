import { EnemyType } from '../galagaConstants';

export class GalagaEnemy {
  public x: number;
  public y: number;
  public width = 36;
  public height = 36;
  public type: EnemyType;
  public hp: number;
  public scoreValue: number;

  constructor(x: number, y: number, type: EnemyType) {
    this.x = x;
    this.y = y;
    this.type = type;

    // Define os pontos e vida consoante o tipo de inimigo
    if (type === EnemyType.BOSS) {
      this.hp = 2;
      this.scoreValue = 150;
    } else if (type === EnemyType.BUTTERFLY) {
      this.hp = 1;
      this.scoreValue = 100;
    } else {
      this.hp = 1;
      this.scoreValue = 50;
    }
  }

  public update(): void {
    // A movimentação grupal é gerida diretamente pelo motor principal (GalagaEngine).
    // Este método pode ser usado para animações internas futuras (ex: animação de asas).
  }
}
