import { fabric } from 'fabric';
import { forEach, head, last } from 'lodash';

const ARROW_TYPE = {
  none: 'none',
  normal: 'normal',
  'double-sided': 'double-sided',
};

const DIRECTION = {
  left: 'left',
  right: 'right',
  top: 'top',
  bottom: 'bottom',
};

const ConnectionLine = fabric.util.createClass(fabric.Object, {
  type: 'ConnectionLine',

  /**
   * When set to `false`, an object can not be a target of events. All events propagate through it. Introduced in v1.3.4
   * @type Boolean
   * @default
   */
  evented: true,

  /**
   * When set to `false`, an object can not be selected for modification (using either point-click-based or group-based selection).
   * But events still fire on it.
   * @type Boolean
   * @default
   */
  selectable: true,

  /**
   * When set to `false`, object's controls are not displayed and can not be used to manipulate object
   * @type Boolean
   * @default
   */
  hasControls: false,

  /**
   * When set to `false`, object's controlling borders are not rendered
   * @type Boolean
   * @default
   */
  hasBorders: false,

  /**
   * Points array
   * @type Array
   * @default
   */
  points: null,

  /**
   * Width of a stroke used to render this object
   * @type Number
   * @default
   */
  strokeWidth: 2,

  /**
   * stroke style
   * @type String
   * @default
   */
  stroke: '#000',

  cacheProperties: fabric.Object.prototype.cacheProperties.concat('points'),

  /**
   * connection arrow type,  Possible values: "normal", "double-sided", "none"
   * @type string
   * @default
   */
  arrowType: 'normal',

  /**
   * connection arrow width
   * @type Number
   * @default
   */
  arrowWidth: 8,

  /**
   * When `true`, object is cached on an additional canvas.
   * When `false`, object is not cached unless necessary ( clipPath )
   * default to true
   * @since 1.7.0
   * @type Boolean
   * @default false
   */
  objectCaching: false,

  /**
   * from element point direction
   * @type string
   */
  _fromDirection: DIRECTION.right,

  /**
   * to element point direction
   * @type string
   */
  _toDirection: DIRECTION.left,

  /**
   * Constructor
   * @param {Array} points Array of points (where each point is an object with x and y)
   * @param {Object} [options] Options object
   * @return {fabric.Polyline} thisArg
   */
  initialize: function (points, options) {
    options = options || {};
    this.points = points || [];
    this.callSuper('initialize', options);
    this._initDirection();
  },

  _renderFromArrow: function (ctx) {
    let extensionDirection = this._getExtensionDirection(this._fromDirection);
    const firstPoint = head(this.points);
    const startPoint = {
      x: firstPoint.x - this.strokeWidth / 2,
      y: firstPoint.y - this.strokeWidth / 2,
    };
    this._drawArrow(ctx, extensionDirection, startPoint);
  },

  _renderToArrow: function (ctx) {
    let extensionDirection = this._getExtensionDirection(this._toDirection);
    const lastPoint = last(this.points);
    const startPoint = {
      x: lastPoint.x - this.strokeWidth / 2,
      y: lastPoint.y - this.strokeWidth / 2,
    };
    this._drawArrow(ctx, extensionDirection, startPoint);
  },

  /**
   * render arrow
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderArrow: function (ctx) {
    if (this.arrowType === ARROW_TYPE.none) {
      return;
    }
    if (this.arrowType === ARROW_TYPE.normal) {
      this._renderToArrow(ctx);
    } else if (this.arrowType === ARROW_TYPE['double-sided']) {
      this._renderToArrow(ctx);
      this._renderFromArrow(ctx);
    }
  },

  /**
   * render translate line to make connection lien easy to select
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderEasySelectableLine: function (ctx) {
    ctx.save();
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'transparent';
    ctx.beginPath();
    ctx.moveTo(
      this.points[0].x - this.strokeWidth / 2,
      this.points[0].y - this.strokeWidth / 2
    );
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      ctx.lineTo(point.x - this.strokeWidth / 2, point.y - this.strokeWidth / 2);
    }
    ctx.stroke();
    ctx.restore();
  },

  /**
   * render control
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderControl: function (ctx) {
    ctx.save();
    this._drawStartPoint(ctx);
    this._drawEndPoint(ctx);
    this._drawControlPoints(ctx);
    ctx.restore();
  },

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _render: function (ctx) {
    let len = this.points.length;

    if (len <= 1) {
      // do not draw if no points or single point
      return;
    }
    ctx.lineWidth = this.strokeWidth;
    ctx.beginPath();
    ctx.moveTo(
      this.points[0].x - this.strokeWidth / 2,
      this.points[0].y - this.strokeWidth / 2
    );
    for (let i = 0; i < len; i++) {
      let point = this.points[i];
      ctx.lineTo(point.x - this.strokeWidth / 2, point.y - this.strokeWidth / 2);
    }
    this._renderStroke(ctx);

    this._renderArrow(ctx);
    this._renderEasySelectableLine(ctx);
    this._renderControl(ctx);
  },

  /**
   * @private
   * @param {String} direction FromDirection or _toDirection
   * @return {String} connection line extension direction
   */
  _getExtensionDirection: function (direction) {
    let extensionDirection;
    switch (direction) {
      case DIRECTION.right:
        extensionDirection = DIRECTION.left;
        break;
      case DIRECTION.left:
        extensionDirection = DIRECTION.right;
        break;
      case DIRECTION.top:
        extensionDirection = DIRECTION.bottom;
        break;
      case DIRECTION.bottom:
        extensionDirection = DIRECTION.top;
        break;
      default:
        break;
    }
    return extensionDirection;
  },

  _updateDirection: function () {},

  /**
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {String} extensionDirection Connection Line extension direction
   * @param {String} startPoint Ctx begin path start point
   * initialize direction
   */
  _drawArrow: function (ctx, extensionDirection, startPoint) {
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    switch (extensionDirection) {
      case DIRECTION.right:
        ctx.lineTo(startPoint.x - this.arrowWidth, startPoint.y - this.arrowWidth / 2);
        ctx.lineTo(startPoint.x - this.arrowWidth, startPoint.y + this.arrowWidth / 2);
        break;
      case DIRECTION.left:
        ctx.lineTo(startPoint.x + this.arrowWidth, startPoint.y - this.arrowWidth / 2);
        ctx.lineTo(startPoint.x + this.arrowWidth, startPoint.y + this.arrowWidth / 2);
        break;

      case DIRECTION.top:
        ctx.lineTo(startPoint.x - this.arrowWidth / 2, startPoint.y + this.arrowWidth);
        ctx.lineTo(startPoint.x + this.arrowWidth / 2, startPoint.y + this.arrowWidth);
        break;

      case DIRECTION.bottom:
        ctx.lineTo(startPoint.x - this.arrowWidth / 2, startPoint.y - this.arrowWidth);
        ctx.lineTo(startPoint.x + this.arrowWidth / 2, startPoint.y - this.arrowWidth);
        break;
      default:
        break;
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  },

  /**
   * initialize from direction
   * @private
   * @return {String} from direction
   */
  _initFromDirection: function () {
    let fromDirection = this._fromDirection;
    const firstPoint = head(this.points);
    const secondPoint = this.points[1];
    const isHorizontal = secondPoint.y === firstPoint.y;
    if (isHorizontal) {
      if (secondPoint.x > firstPoint.x) {
        fromDirection = DIRECTION.right;
      } else if (secondPoint.x < firstPoint.x) {
        fromDirection = DIRECTION.left;
      }
    } else {
      if (secondPoint.y > firstPoint.y) {
        fromDirection = DIRECTION.bottom;
      } else if (secondPoint.y < firstPoint.y) {
        fromDirection = DIRECTION.top;
      }
    }
    this._fromDirection = fromDirection;
    return fromDirection;
  },

  /**
   * initialize to direction
   * @private
   * @return {String} to direction
   */
  _initToDirection: function () {
    let toDirection = this._toDirection;
    const lastPoint = last(this.points);
    const secondLastPoint = this.points[this.points.length - 2];
    const isVertical = secondLastPoint.x === lastPoint.x;
    if (isVertical) {
      if (lastPoint.y > secondLastPoint.y) {
        toDirection = DIRECTION.top;
      } else if (lastPoint.y < secondLastPoint.y) {
        toDirection = DIRECTION.bottom;
      }
    } else {
      if (lastPoint.x > secondLastPoint.x) {
        toDirection = DIRECTION.left;
      } else if (lastPoint.x < secondLastPoint.x) {
        toDirection = DIRECTION.right;
      }
    }
    this._toDirection = toDirection;
    return toDirection;
  },

  /**
   * initialize direction
   * @private
   */
  _initDirection: function () {
    if (this.points.length <= 1) {
      return;
    }
    this._initFromDirection();
    this._initToDirection();
  },

  /**
   * initialize direction
   * @private
   * @return {Array} control points
   */
  _getControlPoints: function () {
    const result = [];
    forEach(this.points, (item, index) => {
      if (index < this.points.length - 1) {
        const nextOne = this.points[index + 1];
        result[index] = {
          x: (item.x + nextOne.x) / 2,
          y: (item.y + nextOne.y) / 2,
        };
      }
    });
    return result;
  },

  _drawStartPoint: function (ctx) {
    ctx.strokeStyle = '#137CBD';
    ctx.fillStyle = '#137CBD';
    ctx.beginPath();
    const firstPoint = head(this.points);
    ctx.arc(
      firstPoint.x - this.strokeWidth / 2,
      firstPoint.y - this.strokeWidth / 2,
      5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  },

  _drawEndPoint: function (ctx) {
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#137CBD';
    ctx.lineWidth = 2;
    const lastPoint = last(this.points);
    ctx.arc(
      lastPoint.x - this.strokeWidth / 2,
      lastPoint.y - this.strokeWidth / 2,
      4,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#137CBD';
    ctx.lineWidth = 0;
    ctx.arc(
      lastPoint.x - this.strokeWidth / 2,
      lastPoint.y - this.strokeWidth / 2,
      2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  },

  _drawControlPoints: function (ctx) {
    ctx.save();
    const points = this._getControlPoints();
    forEach(points, (item) => {
      ctx.beginPath();
      ctx.fillStyle = '#137CBD';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.arc(
        item.x - this.strokeWidth / 2,
        item.y - this.strokeWidth / 2,
        5,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  },
});

export default ConnectionLine;
