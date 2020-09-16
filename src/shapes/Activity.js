import { fabric } from 'fabric';
import EditableTextShape from '../objects/EditableTextShape';
import { DIRECTION } from '../constants/shapes';

export const Activity = fabric.util.createClass(EditableTextShape, {
  isEditingText: false,
  scalePercent: 1,
  thumbnail: false,
  readonly: false,
  hasText: true,
  minimal: false,
  width: 100,
  height: 60,
  x: 0,
  y: 0,
  rx: 8,
  ry: 8,
  fill: '#fff',
  stroke: '#000',
  direction: DIRECTION.BOTTOM,
  startColor: '#71afff',
  endColor: '#bddaff',
  _render: function (ctx) {
    let rx = this.rx ? Math.min(this.rx, this.width / 2) : 0,
      ry = this.ry ? Math.min(this.ry, this.height / 2) : 0,
      w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2,
      isRounded = rx !== 0 || ry !== 0,
      k = 1 - 0.5522847498;

    const getGradientParam = () => {
      switch (this.direction) {
        case DIRECTION.TOP:
          return [x, y + h, x, y];
        case DIRECTION.TOP_RIGHT:
          return [x, y + h, x + w, y];
        case DIRECTION.TOP_LEFT:
          return [x + w, y + h, x, y];
        case DIRECTION.LEFT:
          return [x + w, y, x, y];
        case DIRECTION.RIGHT:
          return [x, y, x + w, y];
        case DIRECTION.BOTTOM:
          return [x, y, x, y + h];
        case DIRECTION.BOTTOM_LEFT:
          return [x + w, y, x, y + h];
        case DIRECTION.BOTTOM_RIGHT:
          return [x, y, x + w, y + h];
        default:
          return [x, y, x, y + h];
      }
    };

    //默认渐变
    const gradientParam = getGradientParam();
    let gradient = ctx.createLinearGradient(...gradientParam);
    gradient.addColorStop(0, this.startColor);
    gradient.addColorStop(1, this.endColor);
    ctx.fillStyle = gradient;
    ctx.beginPath();

    ctx.moveTo(x + rx, y);

    ctx.lineTo(x + w - rx, y);
    isRounded && ctx.bezierCurveTo(x + w - k * rx, y, x + w, y + k * ry, x + w, y + ry);

    ctx.lineTo(x + w, y + h - ry);
    isRounded &&
      ctx.bezierCurveTo(x + w, y + h - k * ry, x + w - k * rx, y + h, x + w - rx, y + h);

    ctx.lineTo(x + rx, y + h);
    isRounded && ctx.bezierCurveTo(x + k * rx, y + h, x, y + h - k * ry, x, y + h - ry);

    ctx.lineTo(x, y + ry);
    isRounded && ctx.bezierCurveTo(x, y + k * ry, x + k * rx, y, x + rx, y);

    ctx.moveTo(x, y + h / 3);
    ctx.lineTo(x + w, y + h / 3);

    ctx.closePath();

    this._renderPaintInOrder(ctx);
    this.callSuper('_render', ctx);
  },
});
