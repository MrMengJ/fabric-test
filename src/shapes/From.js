import { fabric } from 'fabric';
import { DIRECTION } from '../constants/shapes';
import Text from "../objects/Text";

export const From = fabric.util.createClass(Text, {
  isEditingText: false,
  scalePercent: 1,
  thumbnail: false,
  readonly: false,
  hasText: true,
  minimal: false,
  x: 0,
  y: 0,
  width: 50,
  height: 50,
  radius: 25,
  fill: '#fff',
  stroke: '#000',
  direction: DIRECTION.BOTTOM,
  startColor: '#71afff',
  endColor: '#71afff',
    text:"From",
  _render: function (ctx) {
    let w = this.radius,
      h = this.radius,
      x = -this.radius / 2,
      y = -this.radius / 2;

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
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();

    this._renderPaintInOrder(ctx);
    this.callSuper('_render', ctx);
  },
});
