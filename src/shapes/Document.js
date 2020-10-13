import { fabric } from 'fabric';

import { DIRECTION } from '../constants/shapes';
import Text from '../objects/Text';

export const Document = fabric.util.createClass(Text, {
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
  startColor: '#ffff00',
  endColor: '#ffff00',
  text: '文档',
  type: 'Document',
  _render: function (ctx) {
    let w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h * 0.85);
    ctx.quadraticCurveTo(x + w * 0.2, y + h + 1.1, x + w * 0.5, y + h * 0.8);
    ctx.bezierCurveTo(
      x + w * 0.8,
      y + h * 0.5,
      x + w * 0.8,
      y + h * 0.5,
      x + w,
      y + h * 0.8
    );
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y);
    ctx.closePath();

    this._renderPaintInOrder(ctx);
    this.callSuper('_render', ctx);
  },
});

Document.fromObject = (options, callback) => {
  return callback(new Document(options));
};

window.fabric.Document = Document;