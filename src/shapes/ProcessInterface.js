import { fabric } from 'fabric';

import { DIRECTION } from '../constants/shapes';
import Text from '../objects/Text';

export const ProcessInterface = fabric.util.createClass(Text, {
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
  type: 'ProcessInterface',

  _strokeEdge: function (ctx) {
    let w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2,
      rx = this.scalePercent * 5,
      ry = this.scalePercent * 5,
      k = 1 - 0.5522847498,
      rw = this.width * 0.7,
      rh = this.height * 0.8;

    const offSet = 10 * this.scalePercent;
    ctx.beginPath();
    ctx.moveTo(x + rx, y);
    ctx.lineTo(x + rw - rx, y);
    ctx.bezierCurveTo(x + rw - k * rx, y, x + rw, y + k * ry, x + rw, y + ry);
    ctx.lineTo(x + rw, y + h * 0.2);
    ctx.lineTo(x + (w - offSet), y + h * 0.2);
    ctx.lineTo(x + w, y + h * 0.6);
    ctx.lineTo(x + (w - offSet), y + h);
    ctx.lineTo(x + w * 0.2 + offSet, y + h);
    ctx.lineTo(x + w * 0.25, y + rh);
    ctx.lineTo(x + rx, y + rh);
    ctx.bezierCurveTo(x + k * rx, y + rh, x, y + rh - k * ry, x, y + rh - ry);
    ctx.lineTo(x, y + ry);
    ctx.bezierCurveTo(x, y + k * ry, x + k * rx, y, x + rx, y);
  },
  _render: function (ctx) {
    let w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2,
      rx = this.scalePercent * 5,
      ry = this.scalePercent * 5,
      k = 1 - 0.5522847498,
      rw = this.width * 0.7,
      rh = this.height * 0.8;

    const offSet = 10 * this.scalePercent;

    ctx.beginPath();
    ctx.moveTo(x + rx, y);
    ctx.lineTo(x + rw - rx, y);
    ctx.bezierCurveTo(x + rw - k * rx, y, x + rw, y + k * ry, x + rw, y + ry);
    ctx.lineTo(x + rw, y + h * 0.2);
    ctx.lineTo(x + (w - offSet), y + h * 0.2);
    ctx.lineTo(x + w, y + h * 0.6);
    ctx.lineTo(x + (w - offSet), y + h);
    ctx.lineTo(x + w * 0.2 + offSet, y + h);
    ctx.lineTo(x + w * 0.25, y + rh);
    ctx.lineTo(x + rx, y + rh);
    ctx.bezierCurveTo(x + k * rx, y + rh, x, y + rh - k * ry, x, y + rh - ry);
    ctx.lineTo(x, y + ry);
    ctx.bezierCurveTo(x, y + k * ry, x + k * rx, y, x + rx, y);

    ctx.moveTo(x + rw, y + ry);
    ctx.lineTo(x + rw, y + rh - ry);
    ctx.bezierCurveTo(
      x + rw,
      y + rh - k * ry,
      x + rw - k * rx,
      y + rh,
      x + rw - rx,
      y + rh
    );
    ctx.lineTo(x + w * 0.25, y + rh);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.stroke();
    this.callSuper('_render', ctx);
  },
});

ProcessInterface.fromObject = (options, callback) => {
  return callback(new ProcessInterface(options));
};

window.fabric.ProcessInterface = ProcessInterface;