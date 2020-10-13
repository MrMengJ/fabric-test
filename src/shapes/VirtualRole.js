import { fabric } from 'fabric';
import { DIRECTION } from '../constants/shapes';
import Text from "../objects/Text";

export const VirtualRole = fabric.util.createClass(Text, {
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
    text:"虚拟角色",
    type:'VirtualRole',
    _render: function (ctx) {
        let w = this.width,
            h = this.height,
            x = -this.width / 2,
            y = -this.height / 2;

        ctx.beginPath();
        ctx.setLineDash([20, 10]);
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y);
        ctx.closePath();

        this._renderPaintInOrder(ctx);
        this.callSuper('_render', ctx);
    },
});

VirtualRole.fromObject = (options, callback) => {
    return callback(new VirtualRole(options));
};

window.fabric.VirtualRole = VirtualRole;
