import { fabric } from 'fabric';

import { DIRECTION } from '../constants/shapes';
import Text from '../objects/Text';

export const BackOut = fabric.util.createClass(Text, {
  isEditingText: false,
  scalePercent: 1,
  thumbnail: false,
  readonly: false,
  hasText: true,
  minimal: false,
  width: 50,
  height: 60,
  x: 0,
  y: 0,
  fill: '#fff',
  stroke: '#000',
  direction: DIRECTION.BOTTOM,
  startColor: '#9aff9a',
  endColor: '#9aff9a',
  text: '',
  type:'BackOut',
  _render: function (ctx) {
    let w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2;

    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x, y + h / 2);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(x + w / 2, y + h / 2);

    this._renderPaintInOrder(ctx);
    this.callSuper('_render', ctx);
  },
});

BackOut.fromObject = (options, callback) => {
  return callback(new BackOut(options));
};

window.fabric.BackOut = BackOut;