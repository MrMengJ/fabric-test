import { fabric } from 'fabric';

export const Grid = fabric.util.createClass(fabric.Object, {
  isEditingText: false,
  scalePercent: 1,
  thumbnail: false,
  readonly: true,
  minimal: false,
  width: 800,
  height: 500,
  x: 0,
  y: 0,
  fill: '#fff',
  stroke: '#ECF3FE',
  selectable: false,
  evented: false,
  grid: 20,
  _render: function (ctx) {
    let w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2,
      remainderW = this.width % this.grid,
      remainderH = this.height % this.grid,
      w_padding = Math.floor(this.grid + remainderW / 2),
      h_padding = Math.floor(this.grid + remainderH / 2),
      w_gridLength = Math.floor((w - 2 * w_padding) / this.grid),
      h_gridLength = Math.floor((h - 2 * h_padding) / this.grid);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i <= w_gridLength; i++) {
      ctx.moveTo(x + w_padding + i * this.grid, y + h_padding);
      ctx.lineTo(x + w_padding + i * this.grid, y + h - h_padding);
    }
    for (let i = 0; i <= h_gridLength; i++) {
      ctx.moveTo(x + w_padding, y + h_padding + i * this.grid);
      ctx.lineTo(x + w - w_padding, y + h_padding + i * this.grid);
    }
    ctx.fillStyle = '#ECF3FE';
    ctx.strokeStyle = '#ECF3FE';
    ctx.lineWidth = 1;
    this._renderPaintInOrder(ctx);
    this.callSuper('_render', ctx);
  },
});
