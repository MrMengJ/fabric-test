import { fabric } from 'fabric';
import { DIRECTION } from '../constants/shapes';
import Text from '../objects/Text';

export const KeyCompliancePoint = fabric.util.createClass(Text, {
  isEditingText: false,
  scalePercent: 1,
  thumbnail: false,
  readonly: false,
  hasText: true,
  minimal: false,
  x: 0,
  y: 0,
  width: 100,
  height: 60,
  radiusX: 50,
  radiusY: 30,
  rotation: 0,
  fill: null,
  stroke: '#000',
  direction: DIRECTION.BOTTOM,
  startColor: '#fff',
  endColor: '#fff',
  text: 'KCP',
  type:'KeyCompliancePoint',
  _render: function (ctx) {
    let x = this.x,
      y = this.y,
      rx = this.radiusX,
      ry = this.radiusY;

    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();

    this._renderPaintInOrder(ctx);
    this.callSuper('_render', ctx);
  },
});

KeyCompliancePoint.fromObject = (options, callback) => {
  return callback(new KeyCompliancePoint(options));
};

window.fabric.KeyCompliancePoint = KeyCompliancePoint;
