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
    _render: function (ctx) {
        let w = this.width,
            h = this.height,
            x = -this.width / 2,
            y = -this.height / 2;

        const getGradientParam = () => {
            switch (this.direction) {
                case DIRECTION.TOP:
                    return [x, y + h, x, y];
                case DIRECTION.TOP_RIGHT:
                    return [x, y + h, x + w, y];
                case DIRECTION.TOP_LEFT:
                    return [x + w, y + h, x, y];
                case DIRECTION.LEFT:
                    return [x + w, y, x, y];
                case DIRECTION.RIGHT:
                    return [x, y, x + w, y];
                case DIRECTION.BOTTOM:
                    return [x, y, x, y + h];
                case DIRECTION.BOTTOM_LEFT:
                    return [x + w, y, x, y + h];
                case DIRECTION.BOTTOM_RIGHT:
                    return [x, y, x + w, y + h];
                default:
                    return [x, y, x, y + h];
            }
        };

        //默认渐变
        const gradientParam = getGradientParam();
        let gradient = ctx.createLinearGradient(...gradientParam);
        gradient.addColorStop(0, this.startColor);
        gradient.addColorStop(1, this.endColor);
        ctx.fillStyle = gradient;

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
