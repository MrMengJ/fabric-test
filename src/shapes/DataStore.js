import { fabric } from 'fabric';

import { DIRECTION } from '../constants/shapes';
import Text from '../objects/Text';

export const DataStore = fabric.util.createClass(Text, {
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
  startColor: '#fff',
  endColor: '#fff',
  text: '',
  type:'DataStore',
  _render: function (ctx) {
    let w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2;

    ctx.beginPath();
    ctx.moveTo(x, y + h / 3 / 2);

    ctx.lineTo(x, y + (h - h / 5));
    ctx.bezierCurveTo(x + w * 0.1, y + h, x + w * 0.9, y + h, x + w, y + (h - h / 5));

    ctx.lineTo(x + w, y + h / 3 / 2);
    ctx.ellipse(x + w / 2, y + h / 3 / 2, w / 2, h / 3 / 2,0,0,2*Math.PI);

    this._renderPaintInOrder(ctx);
    this.callSuper('_render', ctx);
  },
});

DataStore.fromObject = (options, callback) => {
  return callback(new DataStore(options));
};

window.fabric.DataStore = DataStore;