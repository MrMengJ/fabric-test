import { fabric } from 'fabric';

import { DIRECTION } from '../constants/shapes';
import Text from "../objects/Text";

export const Customer = fabric.util.createClass(Text, {
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
    startColor: '#9494ff',
    endColor: '#cacaff',
    text:"客户",
    _render: function (ctx) {
        let w = this.width,
            h = this.height,
            x = -this.width / 2,
            y = -this.height / 2;

        ctx.beginPath();
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
