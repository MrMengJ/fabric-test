import { fabric } from 'fabric';
import { DIRECTION } from '../constants/shapes';
import Text from '../objects/Text';

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
  text: 'From',
  type: 'From',
  _render: function (ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();

    this._renderPaintInOrder(ctx);
    this.callSuper('_render', ctx);
  },
});

From.fromObject = (options, callback) => {
  return callback(new From(options));
};

window.fabric.From = From;