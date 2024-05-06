import { fabric } from 'fabric';
import Text from '../objects/Text';

export const KeyCompliancePoint2 = fabric.util.createClass(Text, {
  x: 0,
  y: 0,
  width: 100,
  height: 60,
  rx: 50,
  ry: 30,
  fill: null,
  stroke: '#ff1010',
  strokeDashArray: [5, 5],
  text: 'KCQ',
  type: 'KCQ',
  _strokeEdge: function (ctx) {
    ctx.beginPath();
    ctx.transform(1, 0, 0, this.ry / this.rx, 0, 0);
    ctx.arc(0, 0, this.rx, 0, Math.PI * 2, false);
    ctx.closePath();
  },
  _render: function (ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.transform(1, 0, 0, this.ry / this.rx, 0, 0);
    ctx.setLineDash([5, 5]);
    console.log('ctx', ctx);
    ctx.arc(0, 0, this.rx, 0, Math.PI * 2, false);
    // ctx.stroke();
    // this._renderPaintInOrder(ctx);
    ctx.restore();
    // ctx.closePath();
    this.callSuper('_render', ctx);
  },
});

KeyCompliancePoint2.fromObject = (options, callback) => {
  return callback(new KeyCompliancePoint2(options));
};

window.fabric.KCP = KeyCompliancePoint2;
