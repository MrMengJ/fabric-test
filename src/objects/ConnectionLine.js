import { fabric } from 'fabric';
import {
  findIndex,
  forEach,
  head,
  isEqual,
  isNaN,
  last,
  max,
  reverse,
  toInteger,
  map,
  includes,
} from 'lodash';

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

const EASY_SELECTABLE_LINE_WIDTH = 12;

const MIN_DISTANCE_AROUND_SHAPE = 10;

const DRAGGING_OBJECT_TYPE = {
  startPort: 'startPort',
  endPort: 'endPort',
  line: 'line',
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
   * When `true`, the connection is selected
   * @type Boolean
   * @default false
   */
  selected: false,

  /**
   * Indicates whether the line is dragging
   * @type Boolean
   * @default false
   */
  _isDragging: false,

  /**
   * from element point direction
   * @type string
   */
  fromDirection: DIRECTION.right,

  /**
   * to element point direction
   * @type string
   */
  toDirection: DIRECTION.left,

  /**
   * from element point
   * @type Object
   */
  fromPoint: null,

  /**
   * to element point
   * @type Object
   */
  toPoint: null,

  /**
   * dragging line or point info
   * @type Object
   */
  _draggingObject: null,

  /**
   * dragging line matched point index that need changed
   * @type Array
   */
  _dragLineMatchedPointIndexs: null,

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
    this.initBehavior();
  },

  _renderFromArrow: function (ctx) {
    let extensionDirection = this._getExtensionDirection(this.fromDirection);
    const firstPoint = head(this.points);
    const startPoint = {
      x: firstPoint.x - this.strokeWidth / 2,
      y: firstPoint.y - this.strokeWidth / 2,
    };
    this._drawArrow(ctx, extensionDirection, startPoint);
  },

  _renderToArrow: function (ctx) {
    let extensionDirection = this._getExtensionDirection(this.toDirection);
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
   * render connection line
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderLine: function (ctx) {
    ctx.save();
    ctx.lineWidth = this.strokeWidth;
    this._drawLine(ctx);
    this._renderStroke(ctx);
    ctx.restore();
  },

  /**
   * render control
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderControl: function (ctx) {
    if (this.selected) {
      ctx.save();
      this._drawStartPoint(ctx);
      this._drawEndPoint(ctx);
      this._drawControlPoints(ctx);
      ctx.restore();
    }
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

    this._renderLine(ctx);
    this._renderArrow(ctx);
    this._renderControl(ctx);
  },

  /**
   * @private
   * @param {String} direction FromDirection or toDirection
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

  /**
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {String} extensionDirection Connection Line extension direction
   * @param {Object} startPoint Ctx begin path start point
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
    let fromDirection = this.fromDirection;
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
    this.fromDirection = fromDirection;
    return fromDirection;
  },

  /**
   * initialize to direction
   * @private
   * @return {String} to direction
   */
  _initToDirection: function () {
    let toDirection = this.toDirection;
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
    this.toDirection = toDirection;
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

  /**
   * draw line
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _drawLine: function (ctx) {
    ctx.beginPath();
    ctx.moveTo(
      this.points[0].x - this.strokeWidth / 2,
      this.points[0].y - this.strokeWidth / 2
    );
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      ctx.lineTo(point.x - this.strokeWidth / 2, point.y - this.strokeWidth / 2);
    }
  },

  /**
   * Initializes all the interactive behavior
   */
  initBehavior: function () {
    this._initAddedHandler();
    this._initRemovedHandler();
  },

  /**
   * Initializes "added" event handler
   * @private
   */
  _initAddedHandler: function () {
    const _this = this;
    this.on('added', function () {
      const canvas = _this.canvas;
      if (canvas && !canvas._hasConnectionLineHandlers) {
        canvas._hasConnectionLineHandlers = true;
        _this._initCanvasHandlers(canvas);
      }
      canvas._connectionLineInstances = canvas._connectionLineInstances || [];
      canvas._connectionLineInstances.push(_this);
    });
  },

  /**
   * Initializes "removed" event handler
   * @private
   */
  _initRemovedHandler: function () {
    const _this = this;
    this.on('removed', function () {
      const canvas = _this.canvas;
      if (canvas) {
        canvas._connectionLineInstances = canvas._connectionLineInstances || [];
        fabric.util.removeFromArray(canvas._connectionLineInstances, _this);
        if (canvas._connectionLineInstances.length === 0) {
          canvas._hasConnectionLineHandlers = false;
          _this._removeCanvasHandlers(canvas);
        }
      }
    });
  },

  /**
   * Initializes canvas event handler
   * @private
   */
  _initCanvasHandlers: function (canvas) {
    this._canvasMouseDownHandler = this._canvasMouseDownHandler.bind(this);
    this._canvasMouseMoveHandler = this._canvasMouseMoveHandler.bind(this);
    this._canvasMouseUpHandler = this._canvasMouseUpHandler.bind(this);

    canvas.on('mouse:down', this._canvasMouseDownHandler);
    canvas.on('mouse:move', this._canvasMouseMoveHandler);
    canvas.on('mouse:up', this._canvasMouseUpHandler);
  },

  /**
   * remove canvas event to manage exiting on other instances
   * @private
   */
  _removeCanvasHandlers: function (canvas) {
    canvas.off('mouse:down', this._canvasMouseDownHandler);
    canvas.off('mouse:move', this._canvasMouseMoveHandler);
    canvas.off('mouse:up', this._canvasMouseUpHandler);
  },

  _canvasMouseDownHandler: function (options) {
    const { pointer } = options;
    const isDragStartPort = this._startPortContainsPoint(pointer);
    const isDragEndPort = this._endPortContainsPoint(pointer);
    const draggingLine = this._linesContainsPoint(pointer);

    // select or unselect
    if (isDragStartPort || isDragEndPort || draggingLine) {
      this.canvas._isOperateConnectionLine = true;
      if (!this.selected) {
        this.selected = true;
        this.canvas.requestRenderAll();
      }
    } else {
      if (this.selected) {
        this.selected = false;
        this.canvas.requestRenderAll();
      }
    }

    // start dragging
    const isNotDraggingExtremeLine =
      draggingLine && !draggingLine.isFirstLine && !draggingLine.isLastLine;
    if (isDragStartPort || isDragEndPort || isNotDraggingExtremeLine) {
      this._startDragging(isDragStartPort, isDragEndPort, draggingLine, pointer);
    }
  },

  /**
   * Set line hover cursor
   * @param point point of mouse coordinates
   */
  _setHoverCursor: function (point) {
    if (!this._isDragging && this.canvas) {
      if (this._startPortContainsPoint(point) || this._endPortContainsPoint(point)) {
        const cursor = 'move';
        this.canvas.setCursor(cursor);
      } else {
        const line = this._linesContainsPoint(point);
        if (line) {
          const cursor =
            line.isFirstLine || line.isLastLine
              ? 'pointer'
              : line.isHorizontal
              ? 's-resize'
              : 'e-resize';
          this.canvas.setCursor(cursor);
        }
      }
    }
  },

  _canvasMouseMoveHandler: function (options) {
    this._setHoverCursor(options.pointer);
    if (this._isDragging) {
      const zoom = this.canvas.getZoom();
      const point = {
        x: options.pointer.x / zoom,
        y: options.pointer.y / zoom,
      };
      if (this._draggingObject.type === DRAGGING_OBJECT_TYPE.startPort) {
        this.fromPoint = point;
        this.fromDirection = this._getDirection(this.toPoint, this.toDirection, point);
        this._updatePoints();
      } else if (this._draggingObject.type === DRAGGING_OBJECT_TYPE.endPort) {
        this.toPoint = point;
        this.toDirection = this._getDirection(this.fromPoint, this.fromDirection, point);
        this._updatePoints();
      } else if (this._draggingObject.type === DRAGGING_OBJECT_TYPE.line) {
        const { isHorizontal } = this._draggingObject.line;
        if (isHorizontal) {
          this.points = map(this.points, (item, index) => {
            const matched = includes(this._dragLineMatchedPointIndexs, index);
            return matched ? { x: item.x, y: point.y } : item;
          });
        } else {
          this.points = map(this.points, (item, index) => {
            const matched = includes(this._dragLineMatchedPointIndexs, index);
            return matched ? { x: point.x, y: item.y } : item;
          });
        }
        this._initDirection();
        this.canvas.requestRenderAll();
      }
    }
  },

  _canvasMouseUpHandler: function () {
    if (this._isDragging) {
      this._endDragging();
    }
  },

  /**
   * Get line paths
   * @return {Array} the line paths
   */
  _getLinePathArray: function () {
    const result = [];
    const lineWidth = max([
      EASY_SELECTABLE_LINE_WIDTH,
      this.strokeWidth * this.canvas.getZoom(),
    ]);
    const zoom = this.canvas.getZoom();
    forEach(this.points, (currentOne, index) => {
      if (index < this.points.length - 1) {
        const nextOne = this.points[index + 1];
        const isHorizontal = currentOne.y === nextOne.y;
        if (isHorizontal) {
          result.push({
            tl: {
              x: currentOne.x * zoom,
              y: currentOne.y * zoom - lineWidth / 2,
            },
            tr: {
              x: nextOne.x * zoom,
              y: nextOne.y * zoom - lineWidth / 2,
            },
            bl: {
              x: currentOne.x * zoom,
              y: currentOne.y * zoom + lineWidth / 2,
            },
            br: {
              x: nextOne.x * zoom,
              y: nextOne.y * zoom + lineWidth / 2,
            },
            isHorizontal: true,
            points: [currentOne, nextOne],
            isFirstLine: index === 0,
            isLastLine: index === this.points.length - 2,
            // x: currentOne.x,
            // y: currentOne.x - lineWidth / 2,
            // width: nextOne.x - currentOne.x,
            // height: lineWidth,
          });
        } else {
          result.push({
            tl: {
              x: currentOne.x * zoom - lineWidth / 2,
              y: currentOne.y * zoom,
            },
            tr: {
              x: currentOne.x * zoom + lineWidth / 2,
              y: currentOne.y * zoom,
            },
            bl: {
              x: nextOne.x * zoom - lineWidth / 2,
              y: nextOne.y * zoom,
            },
            br: {
              x: nextOne.x * zoom + lineWidth / 2,
              y: nextOne.y * zoom,
            },
            isHorizontal: false,
            points: [currentOne, nextOne],
            isFirstLine: index === 0,
            isLastLine: index === this.points.length - 2,
            // x: currentOne.x - lineWidth / 2,
            // y: currentOne.y,
            // width: lineWidth,
            // height: nextOne.y - currentOne.y,
          });
        }
      }
    });
    return result;
  },

  /**
   * Checks if point is inside the object
   * @param {fabric.Point} point Point to check against
   * @param {Object} coords object corner coords
   * @param {Object} [lines] object returned from @method _getImageLines
   * @return {Boolean} true if point is inside the object
   */
  _containsPoint: function (point, coords, lines) {
    const theLines = lines || this._getImageLines(coords);
    const xPoints = this._findCrossPoints(point, theLines);
    // if xPoints is odd then point is inside the object
    return xPoints !== 0 && xPoints % 2 === 1;
  },

  /**
   * Checks if point is inside the lines
   * @return {Object} the line
   */
  _linesContainsPoint: function (point) {
    let result = null;
    forEach(this._getLinePathArray(), (item) => {
      if (this._containsPoint(point, item)) {
        result = item;
        return false;
      }
    });
    return result;
  },

  /**
   * Get port corner coords
   * @param port port coords
   * @return {Object} corner coords
   */
  _getPortCornerCoords: function (port) {
    const zoom = this.canvas.getZoom();
    const extraScope = this.arrowWidth * 2 * zoom;
    return {
      tl: {
        x: port.x * zoom - extraScope / 2,
        y: port.y * zoom - extraScope / 2,
      },
      tr: {
        x: port.x * zoom + extraScope / 2,
        y: port.y * zoom - extraScope / 2,
      },
      bl: {
        x: port.x * zoom - extraScope / 2,
        y: port.y * zoom + extraScope / 2,
      },
      br: {
        x: port.x * zoom + extraScope / 2,
        y: port.y * zoom + extraScope / 2,
      },
    };
  },

  _getStartPortCornerCoords: function () {
    return this._getPortCornerCoords(head(this.points));
  },

  _getEndPortCornerCoords: function () {
    return this._getPortCornerCoords(last(this.points));
  },

  /**
   * Checks if point is inside the start port
   * @return {Boolean} true if point is inside the object
   */
  _startPortContainsPoint: function (point) {
    const portCornerCoords = this._getStartPortCornerCoords();
    return this._containsPoint(point, portCornerCoords);
  },

  /**
   * Checks if point is inside the end port
   * @return {Boolean} true if point is inside the object
   */
  _endPortContainsPoint: function (point) {
    const portCornerCoords = this._getEndPortCornerCoords();
    return this._containsPoint(point, portCornerCoords);
  },

  /**
   * Set dragging object info
   */
  _setDraggingObject: function (isDragStartPort, isDragEndPort, draggingLine) {
    const result = {};
    if (isDragStartPort) {
      result.type = DRAGGING_OBJECT_TYPE.startPort;
    } else if (isDragEndPort) {
      result.type = DRAGGING_OBJECT_TYPE.endPort;
    } else if (draggingLine) {
      result.type = DRAGGING_OBJECT_TYPE.line;
      result.line = draggingLine;
    }
    this._draggingObject = result;
  },

  /**
   * Start dragging
   */
  _startDragging: function (isDragStartPort, isDragEndPort, draggingLine) {
    this._isDragging = true;
    this._setDraggingObject(isDragStartPort, isDragEndPort, draggingLine);

    if (draggingLine) {
      const { points } = draggingLine;
      const matchedPointIndexs = [];
      forEach(points, (item1) => {
        const matchedIndex = findIndex(this.points, (item2) => {
          return isEqual(item1, item2);
        });
        if (matchedIndex > -1) {
          matchedPointIndexs.push(matchedIndex);
        }
      });
      this._dragLineMatchedPointIndexs = matchedPointIndexs;
    }
  },

  /**
   * End dragging
   */
  _endDragging: function () {
    this._isDragging = false;
    this.canvas._isOperateConnectionLine = false;
    this._draggingObject = null;
    this._dragLineMatchedPointIndexs = null;
  },

  /**
   * Get from direction or to direction
   * @param {Object} fromPoint from point
   * @param {String} fromDirection from direction
   * @param {Object} toPoint to point
   * @return {String} new direction
   */
  _getDirection: function (fromPoint, fromDirection, toPoint) {
    if (
      Math.abs(fromPoint.x - toPoint.x) <= MIN_DISTANCE_AROUND_SHAPE ||
      Math.abs(fromPoint.y - toPoint.y) <= MIN_DISTANCE_AROUND_SHAPE
    ) {
      return this._reverseDirection(fromDirection);
    } else {
      return this._calculateDirection(fromPoint.x, fromPoint.y, toPoint.x, toPoint.y);
    }
  },

  /**
   * reverse direction
   * @param {String} direction
   * @return {String} new direction
   */
  _reverseDirection: function (direction) {
    if (direction === DIRECTION.right) {
      return DIRECTION.left;
    } else if (direction === DIRECTION.left) {
      return DIRECTION.right;
    } else if (direction === DIRECTION.top) {
      return DIRECTION.bottom;
    }
    return DIRECTION.top;
  },

  /**
   * Calculate from direction or to direction
   * @return {String} new direction
   */
  _calculateDirection: function (x1, y1, x2, y2) {
    const degree = this._getAngle(x1, y1, x2, y2);

    if (degree > 70 && degree <= 110) {
      return DIRECTION.left;
    } else if (degree > 110 && degree <= 250) {
      return DIRECTION.top;
    } else if (degree > 250 && degree <= 290) {
      return DIRECTION.right;
    } else if (degree <= 70 || degree > 290) {
      return DIRECTION.bottom;
    }
  },

  _getAngle: function (x1, y1, x2, y2) {
    const x = x1 - x2;
    const y = y1 - y2;
    if (!x && !y) {
      return 0;
    }
    return toInteger((90 + (Math.atan2(-y, -x) * 180) / Math.PI + 360) % 360);
  },

  /**
   * Create manhattan route
   * @param {Object} fromPoint
   * @param {String} fromDirection
   * @param {Object} toPoint
   * @param {String} toDirection
   * @return {Object} manhattan route
   */
  _createManhattanRoute: function (fromPoint, fromDirection, toPoint, toDirection) {
    const points = [];
    this._route(points, fromPoint, fromDirection, toPoint, toDirection);
    return reverse(points);
  },

  _route: function (points, fromPt, fromDirection, toPt, toDirection) {
    const TOL = 0.1;
    const TOLxTOL = 0.01;

    // Minimum distance used in the algorithm
    const MIN_DISTANCE = 16;

    const { left, right, top, bottom } = DIRECTION;
    let nextPt;
    let nextDirection;

    const xDiff = fromPt.x - toPt.x;
    const yDiff = fromPt.y - toPt.y;

    if (isNaN(xDiff) || isNaN(yDiff)) {
      return;
    }

    if (xDiff * xDiff < TOLxTOL && yDiff * yDiff < TOLxTOL) {
      points.push(toPt);
      return;
    }

    switch (fromDirection) {
      case left:
        if (xDiff > 0 && yDiff * yDiff < TOL && toDirection === right) {
          nextPt = toPt;
          nextDirection = toDirection;
        } else {
          if (xDiff < 0) {
            nextPt = { x: fromPt.x - MIN_DISTANCE, y: fromPt.y };
          } else if (
            (yDiff > 0 && toDirection === bottom) ||
            (yDiff < 0 && toDirection === top)
          ) {
            nextPt = { x: toPt.x, y: fromPt.y };
          } else if (fromDirection === toDirection) {
            nextPt = {
              x: Math.min(fromPt.x, toPt.x) - MIN_DISTANCE,
              y: fromPt.y,
            };
          } else {
            nextPt = { x: fromPt.x - xDiff / 2, y: fromPt.y };
          }

          if (yDiff > 0) {
            nextDirection = top;
          } else {
            nextDirection = bottom;
          }
        }
        break;
      case right:
        if (xDiff < 0 && yDiff * yDiff < TOL && toDirection === left) {
          nextPt = toPt;
          nextDirection = toDirection;
        } else {
          if (xDiff > 0) {
            nextPt = { x: fromPt.x + MIN_DISTANCE, y: fromPt.y };
          } else if (
            (yDiff > 0 && toDirection === bottom) ||
            (yDiff < 0 && toDirection === top)
          ) {
            nextPt = { x: toPt.x, y: fromPt.y };
          } else if (fromDirection === toDirection) {
            nextPt = {
              x: Math.max(fromPt.x, toPt.x) + MIN_DISTANCE,
              y: fromPt.y,
            };
          } else {
            nextPt = { x: fromPt.x - xDiff / 2, y: fromPt.y };
          }

          if (yDiff > 0) {
            nextDirection = top;
          } else {
            nextDirection = bottom;
          }
        }
        break;
      case bottom:
        if (xDiff * xDiff < TOL && yDiff < 0 && toDirection === top) {
          nextPt = toPt;
          nextDirection = toDirection;
        } else {
          if (yDiff > 0) {
            nextPt = { x: fromPt.x, y: fromPt.y + MIN_DISTANCE };
          } else if (
            (xDiff > 0 && toDirection === right) ||
            (xDiff < 0 && toDirection === left)
          ) {
            nextPt = { x: fromPt.x, y: toPt.y };
          } else if (fromDirection === toDirection) {
            nextPt = {
              x: fromPt.x,
              y: Math.max(fromPt.y, toPt.y) + MIN_DISTANCE,
            };
          } else {
            nextPt = { x: fromPt.x, y: fromPt.y - yDiff / 2 };
          }

          if (xDiff > 0) {
            nextDirection = left;
          } else {
            nextDirection = right;
          }
        }
        break;
      case top:
        if (xDiff * xDiff < TOL && yDiff > 0 && toDirection === bottom) {
          nextPt = toPt;
          nextDirection = toDirection;
        } else {
          if (yDiff < 0) {
            nextPt = { x: fromPt.x, y: fromPt.y - MIN_DISTANCE };
          } else if (
            (xDiff > 0 && toDirection === right) ||
            (xDiff < 0 && toDirection === left)
          ) {
            nextPt = { x: fromPt.x, y: toPt.y };
          } else if (fromDirection === toDirection) {
            nextPt = {
              x: fromPt.x,
              y: Math.min(fromPt.y, toPt.y) - MIN_DISTANCE,
            };
          } else {
            nextPt = { x: fromPt.x, y: fromPt.y - yDiff / 2 };
          }

          if (xDiff > 0) {
            nextDirection = left;
          } else {
            nextDirection = right;
          }
        }
        break;
      default:
        throw new Error('direction can not been null');
    }
    this._route(points, nextPt, nextDirection, toPt, toDirection);
    points.push(fromPt);
  },

  /**
   * Update points
   * @private
   */

  _updatePoints: function () {
    this.points = this._createManhattanRoute(
      this.fromPoint,
      this.fromDirection,
      this.toPoint,
      this.toDirection
    );
    this.canvas.requestRenderAll();
  },
});

export default ConnectionLine;
