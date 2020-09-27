import { fabric } from 'fabric';
import { DIRECTION } from '../constants/shapes';

const BaseObject = fabric.util.createClass(fabric.Object, {
  /**
   * Color of controlling borders of an object (when it's active)
   * @type String
   * @default
   */
  borderColor: '#4285F4',

  /**
   * Array specifying dash pattern of an object's borders (hasBorder must be true)
   * @since 1.6.2
   * @type Array
   */
  borderDashArray: [8, 5],

  /**
   * Opacity of object's controlling borders when object is active and moving
   * @type Number
   * @default
   */
  borderOpacityWhenMoving: 0.4,

  /**
   * Color of controlling corners of an object (when it's active)
   * @type String
   * @default
   */
  cornerColor: '#fff',

  /**
   * Color of controlling corners of an object (when it's active and transparentCorners false)
   * @since 1.6.2
   * @type String
   * @default
   */
  cornerStrokeColor: '#4285F4',

  /**
   * Specify style of control, 'rect' or 'circle'
   * @since 1.6.2
   * @type String
   */
  cornerStyle: 'rect',

  /**
   * Array specifying dash pattern of an object's control (hasBorder must be true)
   * @since 1.6.2
   * @type Array
   */
  cornerDashArray: null,

  /**
   * When true, object's controlling corners are rendered as transparent inside (i.e. stroke instead of fill)
   * @type Boolean
   * @default
   */
  transparentCorners: false,

  _render: function (ctx) {
    if (this.gradient) {
      const gradientParam = this.getGradientParam(this);
      let gradient = ctx.createLinearGradient(...gradientParam);
      gradient.addColorStop(0, this.startColor);
      gradient.addColorStop(1, this.endColor);
      ctx.fillStyle = gradient;
      ctx.fill();
    } else {
      ctx.fillStyle = this.fill;
      this.fill !== null && ctx.fill();
    }
  },

  getGradientParam: (obj) => {
    let w = obj.width,
      h = obj.height,
      x = -obj.width / 2,
      y = -obj.height / 2;
    switch (obj.direction) {
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
  },
});

export default BaseObject;
