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
  type: 'DataStore',
  _strokeEdge: function (ctx) {
    const w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2;
    ctx.beginPath();
    ctx.moveTo(x, y + h / 3 / 2);
    ctx.bezierCurveTo(
      x + w * 0.1,
      y + (h / 6 + h / 5),
      x + w * 0.9,
      y + (h / 6 + h / 5),
      x + w,
      y + h / 3 / 2
    );
    ctx.moveTo(x, y + h / 3 / 2);
    ctx.lineTo(x, y + (h - h / 5));
    ctx.bezierCurveTo(x + w * 0.1, y + h, x + w * 0.9, y + h, x + w, y + (h - h / 5));
    ctx.lineTo(x + w, y + h / 3 / 2);
    ctx.bezierCurveTo(
      x + w * 0.9,
      y + (h / 6 - h / 5),
      x + w * 0.1,
      y + (h / 6 - h / 5),
      x,
      y + h / 3 / 2
    );
  },
  _render: function (ctx) {
    let w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2;
    ctx.beginPath();
    ctx.moveTo(x, y + h / 3 / 2);
    ctx.bezierCurveTo(
      x + w * 0.1,
      y + (h / 6 + h / 5),
      x + w * 0.9,
      y + (h / 6 + h / 5),
      x + w,
      y + h / 3 / 2
    );
    ctx.moveTo(x, y + h / 3 / 2);
    ctx.lineTo(x, y + (h - h / 5));
    ctx.bezierCurveTo(x + w * 0.1, y + h, x + w * 0.9, y + h, x + w, y + (h - h / 5));
    ctx.lineTo(x + w, y + h / 3 / 2);
    ctx.bezierCurveTo(
      x + w * 0.9,
      y + (h / 6 - h / 5),
      x + w * 0.1,
      y + (h / 6 - h / 5),
      x,
      y + h / 3 / 2
    );

    this._renderPaintInOrder(ctx);
    this.callSuper('_render', ctx);
  },
});

DataStore.fromObject = (options, callback) => {
  return callback(new DataStore(options));
};

window.fabric.DataStore = DataStore;
