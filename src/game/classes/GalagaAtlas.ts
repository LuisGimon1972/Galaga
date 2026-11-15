export class GalagaAtlas {
  private image: HTMLImageElement;
  private isLoaded = false;
  private readonly cols = 13;
  private readonly rows = 15;
  private cellWidth = 0;
  private cellHeight = 0;

  constructor(imageSrc: string) {
    this.image = new Image();
    this.image.src = imageSrc;
    this.image.onload = () => {
      this.isLoaded = true;
      this.cellWidth = this.image.width / this.cols;
      this.cellHeight = this.image.height / this.rows;
    };
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    row: number,
    column: number,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number,
    offsetY: number = 0, // Novo parâmetro opcional (por defeito é 0)
  ): boolean {
    if (!this.isLoaded) return false;

    const sx = column * this.cellWidth;
    const sy = row * this.cellHeight - offsetY; // Aplica o offset apenas se for passado

    ctx.drawImage(
      this.image,
      sx,
      sy,
      this.cellWidth,
      this.cellHeight,
      Math.round(dx),
      Math.round(dy),
      dWidth,
      dHeight,
    );
    return true;
  }
}
