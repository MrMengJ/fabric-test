import { fabric } from 'fabric';

import { DIRECTION } from '../constants/shapes';
import Text from '../objects/Text';

export const Decision = fabric.util.createClass(Text, {
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
  fill: '#fff',
  stroke: '#000',
  direction: DIRECTION.BOTTOM,
  startColor: '#fcff7b',
  endColor: '#ffffc6',
  text: '决策',
  type: 'Decision',
  _strokeEdge: function (ctx) {
    let w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2;

    ctx.beginPath();

    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x, y + h / 2);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();
  },
  _render: function (ctx) {
    let w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2;

    ctx.beginPath();

    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x, y + h / 2);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();

    this._renderPaintInOrder(ctx);
    this.callSuper('_render', ctx);
  },
});

Decision.fromObject = (options, callback) => {
  return callback(new Decision(options));
};

window.fabric.Decision = Decision;
