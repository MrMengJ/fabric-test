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
  filter,
  cloneDeep,
  get,
} from 'lodash';

import BaseObject from './BaseObject';

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
  controlPoint: 'controlPoint',
  line: 'line',
};

const MIN_DRAG_DISTANCE = 2;

const defaultTextStyle = {
  stroke: null,
  strokeWidth: 1,
  strokeDashArray: null,
  fill: '#000',
  backgroundColor: '#fff',
};

const ConnectionLine = fabric.util.createClass(BaseObject, {
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

  /**
   * fill style
   * @type String
   * @default
   */
  fill: null,

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
   * record the mouse coords when start dragging
   * @type Object
   */
  _startDraggingPoint: null,

  /**
   * Constructor
   * @param {Array} points Array of points (where each point is an object with x and y)
   * @param {Object} [options] Options object
   * @return {fabric.Polyline} thisArg
   */
  initialize: function (points, options) {
    options = options || {};
    this.points = points || [];

    this.__skipDimension = true;
    this.callSuper('initialize', options);
    this.__skipDimension = false;
    this._initTextStyle();
    this.initDimensions();
    this.initTextBehavior();

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
    this.callSuper('_render', ctx);

    let len = this.points.length;
    if (len <= 1) {
      // do not draw if no points or single point
      return;
    }

    this._renderLine(ctx);
    this._renderArrow(ctx);
    this._renderControl(ctx);

    this._renderTextBackground(ctx);
    this._renderText(ctx);
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
        if (!canvas._hasITextHandlers) {
          canvas._hasITextHandlers = true;
        }
        canvas._hasConnectionLineHandlers = true;
        _this._initCanvasHandlers(canvas);
      }
      canvas._connectionLineInstances = canvas._connectionLineInstances || [];
      canvas._connectionLineInstances.push(_this);
      canvas._iTextInstances = canvas._iTextInstances || [];
      canvas._iTextInstances.push(_this);
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

        canvas._iTextInstances = canvas._iTextInstances || [];
        fabric.util.removeFromArray(canvas._iTextInstances, _this);
        if (canvas._iTextInstances.length === 0) {
          canvas._hasITextHandlers = false;
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
    this._canvasMouseUpHandler = this._canvasMouseUpHandler.bind(this, canvas);
    this._canvasMouseDblclickHandler = this._canvasMouseDblclickHandler.bind(this);

    canvas.on('mouse:down', this._canvasMouseDownHandler);
    canvas.on('mouse:move', this._canvasMouseMoveHandler);
    canvas.on('mouse:up', this._canvasMouseUpHandler);
    canvas.on('mouse:dblclick', this._canvasMouseDblclickHandler);
  },

  /**
   * remove canvas event to manage exiting on other instances
   * @private
   */
  _removeCanvasHandlers: function (canvas) {
    canvas.off('mouse:down', this._canvasMouseDownHandler);
    canvas.off('mouse:move', this._canvasMouseMoveHandler);
    canvas.off('mouse:up', this._canvasMouseUpHandler);
    canvas.off('mouse:dblclick', this._canvasMouseDblclickHandler);
  },

  _canvasMouseDownHandler: function (options) {
    const { pointer } = options;
    const isDragStartPort = this._startPortContainsPoint(pointer);
    const isDragEndPort = this._endPortContainsPoint(pointer);
    const draggingControlPoint = this._controlPointsContainsPoint(pointer);
    const draggingLine = this._linesContainsPoint(pointer);

    if (isDragStartPort || isDragEndPort || draggingControlPoint || draggingLine) {
      this._startDraggingPoint = pointer;
      this._startDragging(
        isDragStartPort,
        isDragEndPort,
        draggingControlPoint,
        draggingLine
      );
      this.canvas._isDraggingConnectionLine = true;
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
  },

  /**
   * Set line hover cursor
   * @param point point of mouse coordinates
   */
  _setHoverCursor: function (point) {
    if (!this._isDragging && this.canvas) {
      // start port cursor , end port cursor
      if (this._startPortContainsPoint(point) || this._endPortContainsPoint(point)) {
        const cursor = 'move';
        this.canvas.setCursor(cursor);
        return;
      }

      // control point cursor
      if (this.selected) {
        const hoveredControlPoint = this._controlPointsContainsPoint(point);
        if (hoveredControlPoint) {
          const matchedLinePoints = this._getControlPointCorrespondingLinePathPoints(
            hoveredControlPoint
          );
          if (matchedLinePoints.length === 2) {
            const isHorizontal = head(matchedLinePoints).y === last(matchedLinePoints).y;
            const cursor = isHorizontal ? 's-resize' : 'e-resize';
            this.canvas.setCursor(cursor);
          }
          return;
        }
      }

      // line cursor
      const line = this._linesContainsPoint(point);
      if (line) {
        const cursor = 'pointer';
        this.canvas.setCursor(cursor);
      }
    }
  },

  _dragFirstLine: function (point) {
    const { controlPoint, originalPoints, isHorizontal } = this._draggingObject;
    let newPoints = cloneDeep(originalPoints);
    if (isHorizontal) {
      newPoints[1].y = point.y;
      const addedPoints = [
        {
          x: (controlPoint.x + head(originalPoints).x) / 2,
          y: controlPoint.y,
        },
        {
          x: (controlPoint.x + head(originalPoints).x) / 2,
          y: point.y,
        },
      ];
      newPoints.splice(1, 0, addedPoints[0], addedPoints[1]);
      this.points = newPoints;
    } else {
      newPoints[1].x = point.x;
      const addedPoints = [
        {
          x: controlPoint.x,
          y: (controlPoint.y + head(originalPoints).y) / 2,
        },
        {
          x: point.x,
          y: (controlPoint.y + head(originalPoints).y) / 2,
        },
      ];
      newPoints.splice(1, 0, addedPoints[0], addedPoints[1]);
      this.points = newPoints;
    }
  },

  _dragLastLine: function (point) {
    const { controlPoint, originalPoints, isHorizontal } = this._draggingObject;
    let newPoints = cloneDeep(originalPoints);
    if (isHorizontal) {
      newPoints[originalPoints.length - 2].y = point.y;
      const addedPoints = [
        {
          x: (controlPoint.x + last(originalPoints).x) / 2,
          y: point.y,
        },
        {
          x: (controlPoint.x + last(originalPoints).x) / 2,
          y: controlPoint.y,
        },
      ];
      newPoints.splice(-1, 0, addedPoints[0], addedPoints[1]);
      this.points = newPoints;
    } else {
      newPoints[originalPoints.length - 2].x = point.x;
      const addedPoints = [
        {
          x: point.x,
          y: (controlPoint.y + last(originalPoints).y) / 2,
        },
        {
          x: controlPoint.x,
          y: (controlPoint.y + last(originalPoints).y) / 2,
        },
      ];
      newPoints.splice(-1, 0, addedPoints[0], addedPoints[1]);
      this.points = newPoints;
    }
  },

  /**
   * Set new points when drag control point
   * @param point point of mouse coordinates
   */
  _handleDragControlPoint: function (point) {
    const {
      controlPoint,
      originalPoints,
      isHorizontal,
      isFirstLine,
      isLastLine,
    } = this._draggingObject;

    const correspondingLinePathPoints = this._getControlPointCorrespondingLinePathPoints(
      controlPoint,
      originalPoints
    );

    if (isFirstLine) {
      this._dragFirstLine(point);
    } else if (isLastLine) {
      this._dragLastLine(point);
    } else {
      if (isHorizontal) {
        this.points = map(originalPoints, (item) => {
          const matched = includes(correspondingLinePathPoints, item);
          return matched ? { x: item.x, y: point.y } : item;
        });
      } else {
        this.points = map(originalPoints, (item) => {
          const matched = includes(correspondingLinePathPoints, item);
          return matched ? { x: point.x, y: item.y } : item;
        });
      }
    }
    this._initDirection();
    this.canvas.requestRenderAll();
  },

  _canvasMouseMoveHandler: function (options) {
    this._setHoverCursor(options.pointer);
    if (this._isDragging) {
      const notDrag =
        Math.abs(options.pointer.x - this._startDraggingPoint.x) < MIN_DRAG_DISTANCE &&
        Math.abs(options.pointer.y - this._startDraggingPoint.y) < MIN_DRAG_DISTANCE;
      if (notDrag) {
        return;
      }

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
      } else if (this._draggingObject.type === DRAGGING_OBJECT_TYPE.controlPoint) {
        this._handleDragControlPoint(point);
      }
    }
  },

  _canvasMouseUpHandler: function (canvas) {
    if (this._isDragging) {
      this._endDragging();
    }

    // for text
    if (canvas._iTextInstances) {
      canvas._iTextInstances.forEach(function (obj) {
        obj.__isMousedown = false;
      });
    }
  },

  _canvasMouseDblclickHandler: function (options) {
    const { pointer } = options;
    if (this._linesContainsPoint(pointer)) {
      this._isEditingText = true;
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
   * Checks if point is inside the control point
   * @return {Object} matched control point
   */
  _controlPointsContainsPoint: function (point) {
    let result = null;
    const controlPoints = this._getControlPoints();
    forEach(controlPoints, (item) => {
      const pathPointCornerCoords = this._getPortCornerCoords(item);
      if (this._containsPoint(point, pathPointCornerCoords)) {
        result = item;
        return false;
      }
    });
    return result;
  },

  _setDraggingObjectWhenDragControlPoint: function (draggingControlPoint) {
    const correspondingLinePathPoints = this._getControlPointCorrespondingLinePathPoints(
      draggingControlPoint
    );

    const isHorizontal =
      last(correspondingLinePathPoints).y === head(correspondingLinePathPoints).y;

    const matchedPointIndexs = [];
    forEach(correspondingLinePathPoints, (item1) => {
      const matchedIndex = findIndex(this.points, (item2) => {
        return isEqual(item1, item2);
      });
      if (matchedIndex > -1) {
        matchedPointIndexs.push(matchedIndex);
      }
    });

    return {
      type: DRAGGING_OBJECT_TYPE.controlPoint,
      controlPoint: draggingControlPoint,
      originalPoints: this.points,
      isHorizontal: isHorizontal,
      isFirstLine: includes(matchedPointIndexs, 0),
      isLastLine: includes(matchedPointIndexs, this.points.length - 1),
    };
  },

  /**
   * Set dragging object info
   */
  _setDraggingObject: function (
    isDragStartPort,
    isDragEndPort,
    draggingControlPoint,
    draggingLine
  ) {
    let result = {};
    if (isDragStartPort) {
      result.type = DRAGGING_OBJECT_TYPE.startPort;
    } else if (isDragEndPort) {
      result.type = DRAGGING_OBJECT_TYPE.endPort;
    } else if (draggingControlPoint) {
      result = this._setDraggingObjectWhenDragControlPoint(draggingControlPoint);
    } else if (draggingLine) {
      result.type = DRAGGING_OBJECT_TYPE.line;
      result.line = draggingLine;
    }
    this._draggingObject = result;
  },

  /**
   * Start dragging
   */
  _startDragging: function (
    isDragStartPort,
    isDragEndPort,
    draggingControlPoint,
    draggingLine
  ) {
    this._isDragging = true;
    this._setDraggingObject(
      isDragStartPort,
      isDragEndPort,
      draggingControlPoint,
      draggingLine
    );
  },

  /**
   * End dragging
   */
  _endDragging: function () {
    this._isDragging = false;
    this.canvas._isDraggingConnectionLine = false;
    this._draggingObject = null;
    this._startDraggingPoint = null;
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

  /**
   * Get control point corresponding line path points
   * @private
   * @return {Array} path points
   */
  _getControlPointCorrespondingLinePathPoints: function (
    controlPoint,
    points = this.points
  ) {
    return filter(points, (item) => {
      return item.x === controlPoint.x || item.y === controlPoint.y;
    });
  },

  // For text

  text: '',

  textStyle: defaultTextStyle,

  _isEditingText: false,

  /**
   * text position
   * @type Number
   */
  textPosition: 0.5,

  /**
   * Properties which when set cause object to change dimensions
   * @type Array
   * @private
   */
  _dimensionAffectingProps: [
    'fontSize',
    'fontWeight',
    'fontFamily',
    'fontStyle',
    'lineHeight',
    'text',
    'charSpacing',
    'textAlign',
    'styles',
  ],

  /**
   * @private
   */
  _reNewline: /\r?\n/,

  /**
   * Use this regular expression to filter for whitespaces that is not a new line.
   * Mostly used when text is 'justify' aligned.
   * @private
   */
  _reSpacesAndTabs: /[ \t\r]/g,

  /**
   * Use this regular expression to filter for whitespace that is not a new line.
   * Mostly used when text is 'justify' aligned.
   * @private
   */
  _reSpaceAndTab: /[ \t\r]/,

  /**
   * Use this regular expression to filter consecutive groups of non spaces.
   * Mostly used when text is 'justify' aligned.
   * @private
   */
  _reWords: /\S+/g,

  /**
   * Array of properties that define a style unit (of 'styles').
   * @type {Array}
   * @default
   */
  _styleProperties: [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'underline',
    'overline',
    'linethrough',
    'deltaY',
    'textBackgroundColor',
    'points',
    'textStyle',
  ],

  /**
   * Font size (in pixels)
   * @type Number
   * @default
   */
  fontSize: 14,

  /**
   * Font weight (e.g. bold, normal, 400, 600, 800)
   * @type {(Number|String)}
   * @default
   */
  fontWeight: 'normal',

  /**
   * Font family
   * @type String
   * @default
   */
  fontFamily: 'Times New Roman',

  /**
   * Text decoration underline.
   * @type Boolean
   * @default
   */
  underline: false,

  /**
   * Text decoration overline.
   * @type Boolean
   * @default
   */
  overline: false,

  /**
   * Text decoration linethrough.
   * @type Boolean
   * @default
   */
  linethrough: false,

  /**
   * Text alignment. Possible values: "left", "center", "right", "justify",
   * "justify-left", "justify-center" or "justify-right".
   * @type String
   * @default
   */
  textAlign: 'left',

  /**
   * Font style . Possible values: "", "normal", "italic" or "oblique".
   * @type String
   * @default
   */
  fontStyle: 'normal',

  /**
   * Line height
   * @type Number
   * @default
   */
  lineHeight: 1.16,

  /**
   * Superscript schema object (minimum overlap)
   * @type {Object}
   * @default
   */
  superscript: {
    size: 0.6, // fontSize factor
    baseline: -0.35, // baseline-shift factor (upwards)
  },

  /**
   * Subscript schema object (minimum overlap)
   * @type {Object}
   * @default
   */
  subscript: {
    size: 0.6, // fontSize factor
    baseline: 0.11, // baseline-shift factor (downwards)
  },

  /**
   * Background color of text lines
   * @type String
   * @default
   */
  textBackgroundColor: '',

  /**
   * List of properties to consider when checking if
   * state of an object is changed ({@link fabric.Object#hasStateChanged})
   * as well as for history (undo/redo) purposes
   * @type Array
   */
  stateProperties: fabric.Object.prototype.stateProperties.concat(
    'fontFamily',
    'fontWeight',
    'fontSize',
    'text',
    'underline',
    'overline',
    'linethrough',
    'textAlign',
    'fontStyle',
    'lineHeight',
    'textBackgroundColor',
    'charSpacing',
    'styles'
  ),

  /**
   * List of properties to consider when checking if cache needs refresh
   * @type Array
   */
  cacheProperties: fabric.Object.prototype.cacheProperties.concat(
    'fontFamily',
    'fontWeight',
    'fontSize',
    'text',
    'underline',
    'overline',
    'linethrough',
    'textAlign',
    'fontStyle',
    'lineHeight',
    'textBackgroundColor',
    'charSpacing',
    'styles'
  ),

  /**
   * @private
   */
  _fontSizeFraction: 0.222,

  /**
   * @private
   */
  offsets: {
    underline: 0.1,
    linethrough: -0.315,
    overline: -0.88,
  },

  /**
   * Text Line proportion to font Size (in pixels)
   * @type Number
   * @default
   */
  _fontSizeMult: 1.13,

  /**
   * additional space between characters
   * expressed in thousands of em unit
   * @type Number
   * @default
   */
  charSpacing: 0,

  /**
   * Object containing character styles - top-level properties -> line numbers,
   * 2nd-level properties - charater numbers
   * @type Object
   * @default
   */
  styles: null,

  /**
   * Reference to a context to measure text char or couple of chars
   * the cacheContext of the canvas will be used or a freshly created one if the object is not on canvas
   * once created it will be referenced on fabric._measuringContext to avoide creating a canvas for every
   * text object created.
   * @type {CanvasRenderingContext2D}
   * @default
   */
  _measuringContext: null,

  /**
   * Baseline shift, stlyes only, keep at 0 for the main text object
   * @type {Number}
   * @default
   */
  deltaY: 0,

  /**
   * contains characters bounding boxes
   */
  __charBounds: [],

  /**
   * use this size when measuring text. To avoid IE11 rounding errors
   * @type {Number}
   * @default
   * @readonly
   * @private
   */
  CACHE_FONT_SIZE: 400,

  /**
   * contains the min text width to avoid getting 0
   * @type {Number}
   * @default
   */
  MIN_TEXT_WIDTH: 2,

  /**
   * Index where text selection starts (or where cursor is when there is no selection)
   * @type Number
   * @default
   */
  selectionStart: 0,

  /**
   * Index where text selection ends
   * @type Number
   * @default
   */
  selectionEnd: 0,

  /**
   * Color of text selection
   * @type String
   * @default
   */
  selectionColor: 'rgba(17,119,255,0.3)',

  /**
   * Indicates whether text is in editing mode
   * @type Boolean
   * @default
   */
  isEditing: false,

  /**
   * Indicates whether a text can be edited
   * @type Boolean
   * @default
   */
  editable: true,

  /**
   * Border color of text object while it's in editing mode
   * @type String
   * @default
   */
  editingBorderColor: 'rgba(102,153,255,0.25)',

  /**
   * Width of cursor (in px)
   * @type Number
   * @default
   */
  cursorWidth: 2,

  /**
   * Color of text cursor color in editing mode.
   * if not set (default) will take color from the text.
   * if set to a color value that fabric can understand, it will
   * be used instead of the color of the text at the current position.
   * @type String
   * @default
   */
  cursorColor: '',

  /**
   * Delay between cursor blink (in ms)
   * @type Number
   * @default
   */
  cursorDelay: 1000,

  /**
   * Duration of cursor fadein (in ms)
   * @type Number
   * @default
   */
  cursorDuration: 600,

  /**
   * Indicates whether internal text char widths can be cached
   * @type Boolean
   * @default
   */
  caching: true,

  /**
   * @private
   */
  _reSpace: /\s|\n/,

  /**
   * @private
   */
  _currentCursorOpacity: 0,

  /**
   * @private
   */
  _selectionDirection: null,

  /**
   * @private
   */
  _abortCursorAnimation: false,

  /**
   * @private
   */
  __widthOfSpace: [],

  /**
   * Helps determining when the text is in composition, so that the cursor
   * rendering is altered.
   */
  inCompositionMode: false,

  /**
   * Initializes all the interactive behavior of text
   */
  initTextBehavior: function () {
    // this.initCursorSelectionHandlers();
    // this.initDoubleClickSimulation();
    // this.mouseMoveHandler = this.mouseMoveHandler.bind(this);
  },

  /**
   * Initializes event handlers related to cursor or selection
   */
  initCursorSelectionHandlers: function () {
    // this.initMousedownHandler();
    // this.initMouseupHandler();
    // this.initClicks();
  },

  /**
   * Initializes "mousedown" event handler
   //  */
  // initMousedownHandler: function () {
  //   this.on('mousedown', this._mouseDownHandler);
  // },

  /**
   * Initialize or update text dimensions.
   * Updates this.textBoxWidth and this.textBoxHeight with the proper values.
   * Does not return dimensions.
   */
  initDimensions: function () {
    if (this.__skipDimension) {
      return;
    }
    this._splitText();
    this._clearCache();
    this.textBoxWidth = this.calcTextWidth() || this.cursorWidth || this.MIN_TEXT_WIDTH;
    if (this.textAlign.indexOf('justify') !== -1) {
      // once text is measured we need to make space fatter to make justified text.
      this.enlargeSpaces();
    }
    this.textBoxHeight = this.calcTextHeight();
    this.saveState({ propertySet: '_dimensionAffectingProps' });
  },

  /**
   * @private
   */
  _clearCache: function () {
    this.__lineWidths = [];
    this.__lineHeights = [];
    this.__charBounds = [];
  },

  /**
   * calculate and return the text Width measuring each line.
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @return {Number} Maximum width of fabric.Text object
   */
  calcTextWidth: function () {
    var maxWidth = this.getLineWidth(0);
    for (var i = 1, len = this._textLines.length; i < len; i++) {
      var currentLineWidth = this.getLineWidth(i);
      if (currentLineWidth > maxWidth) {
        maxWidth = currentLineWidth;
      }
    }
    return maxWidth;
  },

  /**
   * Measure a single line given its index. Used to calculate the initial
   * text bounding box. The values are calculated and stored in __lineWidths cache.
   * @private
   * @param {Number} lineIndex line number
   * @return {Number} Line width
   */
  getLineWidth: function (lineIndex) {
    if (this.__lineWidths[lineIndex]) {
      return this.__lineWidths[lineIndex];
    }

    var width,
      line = this._textLines[lineIndex],
      lineInfo;

    if (line === '') {
      width = 0;
    } else {
      lineInfo = this.measureLine(lineIndex);
      width = lineInfo.width;
    }
    this.__lineWidths[lineIndex] = width;
    return width;
  },

  /**
   * measure a text line measuring all characters.
   * @param {Number} lineIndex line number
   * @return {Number} Line width
   */
  measureLine: function (lineIndex) {
    var lineInfo = this._measureLine(lineIndex);
    if (this.charSpacing !== 0) {
      lineInfo.width -= this._getWidthOfCharSpacing();
    }
    if (lineInfo.width < 0) {
      lineInfo.width = 0;
    }
    return lineInfo;
  },

  /**
   * measure every grapheme of a line, populating __charBounds
   * @param {Number} lineIndex
   * @return {Object} object.width total width of characters
   * @return {Object} object.widthOfSpaces length of chars that match this._reSpacesAndTabs
   */
  _measureLine: function (lineIndex) {
    var width = 0,
      i,
      grapheme,
      line = this._textLines[lineIndex],
      prevGrapheme,
      graphemeInfo,
      numOfSpaces = 0,
      lineBounds = new Array(line.length);

    this.__charBounds[lineIndex] = lineBounds;
    for (i = 0; i < line.length; i++) {
      grapheme = line[i];
      graphemeInfo = this._getGraphemeBox(grapheme, lineIndex, i, prevGrapheme);
      lineBounds[i] = graphemeInfo;
      width += graphemeInfo.kernedWidth;
      prevGrapheme = grapheme;
    }
    // this latest bound box represent the last character of the line
    // to simplify cursor handling in interactive mode.
    lineBounds[i] = {
      left: graphemeInfo ? graphemeInfo.left + graphemeInfo.width : 0,
      width: 0,
      kernedWidth: 0,
      height: this.fontSize,
    };
    return { width: width, numOfSpaces: numOfSpaces };
  },

  /**
   * return a new object that contains all the style property for a character
   * the object returned is newly created
   * @param {Number} lineIndex of the line where the character is
   * @param {Number} charIndex position of the character on the line
   * @return {Object} style object
   */
  getCompleteStyleDeclaration: function (lineIndex, charIndex) {
    var style = this._getStyleDeclaration(lineIndex, charIndex) || {},
      styleObject = {},
      prop;
    for (var i = 0; i < this._styleProperties.length; i++) {
      prop = this._styleProperties[i];
      styleObject[prop] =
        typeof style[prop] === 'undefined' ? get(this, prop) : style[prop];
    }
    return styleObject;
  },

  /**
   * get the reference, not a clone, of the style object for a given character
   * @param {Number} lineIndex
   * @param {Number} charIndex
   * @return {Object} style object
   */
  _getStyleDeclaration: function (lineIndex, charIndex) {
    var lineStyle = this.styles && this.styles[lineIndex];
    if (!lineStyle) {
      return null;
    }
    return lineStyle[charIndex];
  },

  /**
   * Measure and return the info of a single grapheme.
   * needs the the info of previous graphemes already filled
   * @private
   * @param {String} grapheme to be measured
   * @param {Number} lineIndex index of the line where the char is
   * @param {Number} charIndex position in the line
   * @param {String} [prevGrapheme] character preceding the one to be measured
   */
  _getGraphemeBox: function (grapheme, lineIndex, charIndex, prevGrapheme, skipLeft) {
    var style = this.getCompleteStyleDeclaration(lineIndex, charIndex),
      prevStyle = prevGrapheme
        ? this.getCompleteStyleDeclaration(lineIndex, charIndex - 1)
        : {},
      info = this._measureChar(grapheme, style, prevGrapheme, prevStyle),
      kernedWidth = info.kernedWidth,
      width = info.width,
      charSpacing;

    if (this.charSpacing !== 0) {
      charSpacing = this._getWidthOfCharSpacing();
      width += charSpacing;
      kernedWidth += charSpacing;
    }

    var box = {
      width: width,
      left: 0,
      height: style.fontSize,
      kernedWidth: kernedWidth,
      deltaY: style.deltaY,
    };
    if (charIndex > 0 && !skipLeft) {
      var previousBox = this.__charBounds[lineIndex][charIndex - 1];
      box.left = previousBox.left + previousBox.width + info.kernedWidth - info.width;
    }
    return box;
  },

  /**
   * measure and return the width of a single character.
   * possibly overridden to accommodate different measure logic or
   * to hook some external lib for character measurement
   * @private
   * @param {String} _char, char to be measured
   * @param {Object} charStyle style of char to be measured
   * @param {String} [previousChar] previous char
   * @param {Object} [prevCharStyle] style of previous char
   */
  _measureChar: function (_char, charStyle, previousChar, prevCharStyle) {
    // first i try to return from cache
    var fontCache = this.getFontCache(charStyle),
      fontDeclaration = this._getFontDeclaration(charStyle),
      previousFontDeclaration = this._getFontDeclaration(prevCharStyle),
      couple = previousChar + _char,
      stylesAreEqual = fontDeclaration === previousFontDeclaration,
      width,
      coupleWidth,
      previousWidth,
      fontMultiplier = charStyle.fontSize / this.CACHE_FONT_SIZE,
      kernedWidth;

    if (previousChar && fontCache[previousChar] !== undefined) {
      previousWidth = fontCache[previousChar];
    }
    if (fontCache[_char] !== undefined) {
      kernedWidth = width = fontCache[_char];
    }
    if (stylesAreEqual && fontCache[couple] !== undefined) {
      coupleWidth = fontCache[couple];
      kernedWidth = coupleWidth - previousWidth;
    }
    if (width === undefined || previousWidth === undefined || coupleWidth === undefined) {
      var ctx = this.getMeasuringContext();
      // send a TRUE to specify measuring font size CACHE_FONT_SIZE
      this._setTextStyles(ctx, charStyle, true);
    }
    if (width === undefined) {
      kernedWidth = width = ctx.measureText(_char).width;
      fontCache[_char] = width;
    }
    if (previousWidth === undefined && stylesAreEqual && previousChar) {
      previousWidth = ctx.measureText(previousChar).width;
      fontCache[previousChar] = previousWidth;
    }
    if (stylesAreEqual && coupleWidth === undefined) {
      // we can measure the kerning couple and subtract the width of the previous character
      coupleWidth = ctx.measureText(couple).width;
      fontCache[couple] = coupleWidth;
      kernedWidth = coupleWidth - previousWidth;
    }
    return { width: width * fontMultiplier, kernedWidth: kernedWidth * fontMultiplier };
  },

  /**
   * Set the font parameter of the context with the object properties or with charStyle
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Object} [charStyle] object with font style properties
   * @param {String} [charStyle.fontFamily] Font Family
   * @param {Number} [charStyle.fontSize] Font size in pixels. ( without px suffix )
   * @param {String} [charStyle.fontWeight] Font weight
   * @param {String} [charStyle.fontStyle] Font style (italic|normal)
   */
  _setTextStyles: function (ctx, charStyle, forMeasuring) {
    ctx.textBaseline = 'alphabetic';
    ctx.font = this._getFontDeclaration(charStyle, forMeasuring);
  },

  /**
   * Return a contex for measurement of text string.
   * if created it gets stored for reuse
   * @param {String} text Text string
   * @param {Object} [options] Options object
   * @return {fabric.Text} thisArg
   */
  getMeasuringContext: function () {
    // if we did not return we have to measure something.
    if (!fabric._measuringContext) {
      fabric._measuringContext =
        (this.canvas && this.canvas.contextCache) ||
        fabric.util.createCanvasElement().getContext('2d');
    }
    return fabric._measuringContext;
  },

  /**
   * @private
   * @param {Object} decl style declaration for cache
   * @param {String} decl.fontFamily fontFamily
   * @param {String} decl.fontStyle fontStyle
   * @param {String} decl.fontWeight fontWeight
   * @return {Object} reference to cache
   */
  getFontCache: function (decl) {
    var fontFamily = decl.fontFamily.toLowerCase();
    if (!fabric.charWidthsCache[fontFamily]) {
      fabric.charWidthsCache[fontFamily] = {};
    }
    var cache = fabric.charWidthsCache[fontFamily],
      cacheProp =
        decl.fontStyle.toLowerCase() + '_' + (decl.fontWeight + '').toLowerCase();
    if (!cache[cacheProp]) {
      cache[cacheProp] = {};
    }
    return cache[cacheProp];
  },

  /**
   * Enlarge space boxes and shift the others
   */
  enlargeSpaces: function () {
    var diffSpace,
      currentLineWidth,
      numberOfSpaces,
      accumulatedSpace,
      line,
      charBound,
      spaces;
    for (var i = 0, len = this._textLines.length; i < len; i++) {
      if (this.textAlign !== 'justify' && (i === len - 1 || this.isEndOfWrapping(i))) {
        continue;
      }
      accumulatedSpace = 0;
      line = this._textLines[i];
      currentLineWidth = this.getLineWidth(i);
      if (
        currentLineWidth < this.textBoxWidth &&
        (spaces = this.textLines[i].match(this._reSpacesAndTabs))
      ) {
        numberOfSpaces = spaces.length;
        diffSpace = (this.textBoxWidth - currentLineWidth) / numberOfSpaces;
        for (var j = 0, jlen = line.length; j <= jlen; j++) {
          charBound = this.__charBounds[i][j];
          if (this._reSpaceAndTab.test(line[j])) {
            charBound.width += diffSpace;
            charBound.kernedWidth += diffSpace;
            charBound.left += accumulatedSpace;
            accumulatedSpace += diffSpace;
          } else {
            charBound.left += accumulatedSpace;
          }
        }
      }
    }
  },

  /**
   * Detect if the text line is ended with an hard break
   * text and itext do not have wrapping, return false
   * @return {Boolean}
   */
  isEndOfWrapping: function (lineIndex) {
    return lineIndex === this._textLines.length - 1;
  },

  _renderText: function (ctx) {
    if (!this.text) {
      return;
    }
    ctx.save();
    const textPosition = this._getTextCoords();
    ctx.translate(textPosition.x, textPosition.y);
    if (this.paintFirst === 'stroke') {
      this._renderTextStroke(ctx);
      this._renderTextFill(ctx);
    } else {
      this._renderTextFill(ctx);
      this._renderTextStroke(ctx);
    }
    ctx.restore();
  },

  _renderTextBackground: function (ctx) {
    if (!this.text || !this.textStyle.backgroundColor) {
      return;
    }
    ctx.save();
    ctx.fillStyle = this.textStyle.backgroundColor;
    const textPosition = this._getTextCoords();
    ctx.translate(textPosition.x, textPosition.y);
    ctx.fillRect(
      -this.textBoxWidth / 2,
      -this.textBoxHeight / 2,
      this.textBoxWidth,
      this.textBoxHeight
    );
    ctx.restore();
  },

  _renderTextStroke: function (ctx) {
    if (
      (!this.textStyle.stroke || this.textStyle.strokeWidth === 0) &&
      this.isEmptyStyles()
    ) {
      return;
    }

    if (this.shadow && !this.shadow.affectStroke) {
      this._removeShadow(ctx);
    }

    ctx.save();
    this._setLineDash(ctx, this.textStyle.strokeDashArray);
    ctx.beginPath();
    this._renderTextCommon(ctx, 'strokeText');
    ctx.closePath();
    ctx.restore();
  },

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderTextFill: function (ctx) {
    if (!this.textStyle.fill) {
      return;
    }
    this._renderTextCommon(ctx, 'fillText');
  },

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {String} method Method name ("fillText" or "strokeText")
   */
  _renderTextCommon: function (ctx, method) {
    ctx.save();
    var lineHeights = 0,
      left = this._getTextLeftOffset(),
      top = this._getTextTopOffset(),
      offsets = this._applyPatternGradientTransform(
        ctx,
        method === 'fillText' ? this.textStyle.fill : this.textStyle.stroke
      );
    for (var i = 0, len = this._textLines.length; i < len; i++) {
      var heightOfLine = this.getHeightOfLine(i),
        maxHeight = heightOfLine / this.lineHeight,
        leftOffset = this._getLineLeftOffset(i);
      this._renderTextLine(
        method,
        ctx,
        this._textLines[i],
        left + leftOffset - offsets.offsetX,
        top + lineHeights + maxHeight - offsets.offsetY,
        i
      );
      lineHeights += heightOfLine;
    }
    ctx.restore();
  },

  /**
   * @private
   * @param {String} method Method name ("fillText" or "strokeText")
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {String} line Text to render
   * @param {Number} left Left position of text
   * @param {Number} top Top position of text
   * @param {Number} lineIndex Index of a line in a text
   */
  _renderTextLine: function (method, ctx, line, left, top, lineIndex) {
    this._renderChars(method, ctx, line, left, top, lineIndex);
  },

  /**
   * @private
   * @param {String} method fillText or strokeText.
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Array} line Content of the line, splitted in an array by grapheme
   * @param {Number} left
   * @param {Number} top
   * @param {Number} lineIndex
   */
  _renderChars: function (method, ctx, line, left, top, lineIndex) {
    // set proper line offset
    var lineHeight = this.getHeightOfLine(lineIndex),
      isJustify = this.textAlign.indexOf('justify') !== -1,
      actualStyle,
      nextStyle,
      charsToRender = '',
      charBox,
      boxWidth = 0,
      timeToRender,
      shortCut = !isJustify && this.charSpacing === 0 && this.isEmptyStyles(lineIndex);

    ctx.save();
    top -= (lineHeight * this._fontSizeFraction) / this.lineHeight;
    if (shortCut) {
      // render all the line in one pass without checking
      this._renderChar(method, ctx, lineIndex, 0, line.join(''), left, top, lineHeight);
      ctx.restore();
      return;
    }
    for (var i = 0, len = line.length - 1; i <= len; i++) {
      timeToRender = i === len || this.charSpacing;
      charsToRender += line[i];
      charBox = this.__charBounds[lineIndex][i];
      if (boxWidth === 0) {
        left += charBox.kernedWidth - charBox.width;
        boxWidth += charBox.width;
      } else {
        boxWidth += charBox.kernedWidth;
      }
      if (isJustify && !timeToRender) {
        if (this._reSpaceAndTab.test(line[i])) {
          timeToRender = true;
        }
      }
      if (!timeToRender) {
        // if we have charSpacing, we render char by char
        actualStyle = actualStyle || this.getCompleteStyleDeclaration(lineIndex, i);
        nextStyle = this.getCompleteStyleDeclaration(lineIndex, i + 1);
        timeToRender = this._hasStyleChanged(actualStyle, nextStyle);
      }
      if (timeToRender) {
        this._renderChar(method, ctx, lineIndex, i, charsToRender, left, top, lineHeight);
        charsToRender = '';
        actualStyle = nextStyle;
        left += boxWidth;
        boxWidth = 0;
      }
    }
    ctx.restore();
  },

  /**
   * Returns true if object has no styling or no styling in a line
   * @param {Number} lineIndex , lineIndex is on wrapped lines.
   * @return {Boolean}
   */
  isEmptyStyles: function (lineIndex) {
    if (!this.styles) {
      return true;
    }
    if (typeof lineIndex !== 'undefined' && !this.styles[lineIndex]) {
      return true;
    }
    var obj =
      typeof lineIndex === 'undefined' ? this.styles : { line: this.styles[lineIndex] };
    for (var p1 in obj) {
      for (var p2 in obj[p1]) {
        // eslint-disable-next-line no-unused-vars
        for (var p3 in obj[p1][p2]) {
          return false;
        }
      }
    }
    return true;
  },

  /**
   * @private
   * @param {Object} prevStyle
   * @param {Object} thisStyle
   */
  _hasStyleChanged: function (prevStyle, thisStyle) {
    return (
      prevStyle.fill !== thisStyle.fill ||
      prevStyle.stroke !== thisStyle.stroke ||
      prevStyle.strokeWidth !== thisStyle.strokeWidth ||
      prevStyle.fontSize !== thisStyle.fontSize ||
      prevStyle.fontFamily !== thisStyle.fontFamily ||
      prevStyle.fontWeight !== thisStyle.fontWeight ||
      prevStyle.fontStyle !== thisStyle.fontStyle ||
      prevStyle.deltaY !== thisStyle.deltaY
    );
  },

  /**
   * @private
   * @param {String} method
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Number} lineIndex
   * @param {Number} charIndex
   * @param {String} _char
   * @param {Number} left Left coordinate
   * @param {Number} top Top coordinate
   * @param {Number} lineHeight Height of the line
   */
  _renderChar: function (method, ctx, lineIndex, charIndex, _char, left, top) {
    var decl = this._getStyleDeclaration(lineIndex, charIndex),
      fullDecl = this.getCompleteStyleDeclaration(lineIndex, charIndex),
      shouldFill = method === 'fillText' && get(fullDecl, 'textStyle.fill'),
      shouldStroke =
        method === 'strokeText' &&
        get(fullDecl, 'textStyle.stroke') &&
        get(fullDecl, 'textStyle.strokeWidth');
    if (!shouldStroke && !shouldFill) {
      return;
    }
    decl && ctx.save();

    this._applyCharStyles(method, ctx, lineIndex, charIndex, fullDecl);

    if (decl && decl.textBackgroundColor) {
      this._removeShadow(ctx);
    }
    if (decl && decl.deltaY) {
      top += decl.deltaY;
    }
    // console.log('_char', _char);
    // console.log('ctx', ctx.getTransform());
    // console.log('left', left);
    // console.log('top', top);
    shouldFill && ctx.fillText(_char, left, top);
    shouldStroke && ctx.strokeText(_char, left, top);
    decl && ctx.restore();
  },

  /**
   * apply all the character style to canvas for rendering
   * @private
   * @param {String} _char
   * @param {Number} lineIndex
   * @param {Number} charIndex
   * @param {Object} [decl]
   */
  _applyCharStyles: function (method, ctx, lineIndex, charIndex, styleDeclaration) {
    this._setTextFillStyles(ctx, styleDeclaration);
    this._setTextStrokeStyles(ctx, styleDeclaration);

    ctx.font = this._getFontDeclaration(styleDeclaration);
  },

  _setTextStrokeStyles: function (ctx, decl) {
    if (decl.textStyle.stroke) {
      ctx.lineWidth = decl.strokeWidth;
      ctx.lineCap = decl.strokeLineCap;
      ctx.lineDashOffset = decl.strokeDashOffset;
      ctx.lineJoin = decl.strokeLineJoin;
      ctx.miterLimit = decl.strokeMiterLimit;
      ctx.strokeStyle = get(decl, 'textStyle.stroke.toLive')
        ? decl.textStyle.stroke.toLive(ctx, this)
        : decl.textStyle.stroke;
    }
  },

  _setTextFillStyles: function (ctx, decl) {
    if (decl.textStyle.fill) {
      ctx.fillStyle = get(decl, 'textStyle.fill.toLive')
        ? decl.textStyle.fill.toLive(ctx, this)
        : decl.textStyle.fill;
    }
  },

  /**
   * return font declaration string for canvas context
   * @param {Object} [styleObject] object
   * @returns {String} font declaration formatted for canvas context.
   */
  _getFontDeclaration: function (styleObject, forMeasuring) {
    var style = styleObject || this,
      family = this.fontFamily,
      fontIsGeneric = fabric.Text.genericFonts.indexOf(family.toLowerCase()) > -1;
    var fontFamily =
      family === undefined ||
      family.indexOf("'") > -1 ||
      family.indexOf(',') > -1 ||
      family.indexOf('"') > -1 ||
      fontIsGeneric
        ? style.fontFamily
        : '"' + style.fontFamily + '"';
    return [
      // node-canvas needs "weight style", while browsers need "style weight"
      // verify if this can be fixed in JSDOM
      fabric.isLikelyNode ? style.fontWeight : style.fontStyle,
      fabric.isLikelyNode ? style.fontStyle : style.fontWeight,
      forMeasuring ? this.CACHE_FONT_SIZE + 'px' : style.fontSize + 'px',
      fontFamily,
    ].join(' ');
  },

  /**
   * @private
   * @param {Number} lineIndex index text line
   * @return {Number} Line left offset
   */
  _getLineLeftOffset: function (lineIndex) {
    var lineWidth = this.getLineWidth(lineIndex);
    if (this.textAlign === 'center') {
      return (this.textBoxWidth - lineWidth) / 2;
    }
    if (this.textAlign === 'right') {
      return this.textBoxWidth - lineWidth;
    }
    if (this.textAlign === 'justify-center' && this.isEndOfWrapping(lineIndex)) {
      return (this.textBoxWidth - lineWidth) / 2;
    }
    if (this.textAlign === 'justify-right' && this.isEndOfWrapping(lineIndex)) {
      return this.textBoxWidth - lineWidth;
    }
    return 0;
  },

  /**
   * @private
   * @return {Number} Left offset
   */
  _getTextLeftOffset: function () {
    return -this._getActualTextWidth(true) / 2;
  },

  /**
   * Get text actual width
   * @param {Boolean} ignoreZoom
   */
  _getActualTextWidth: function (ignoreZoom = false) {
    if (ignoreZoom) {
      return this.getObjectScaling().scaleX * this.textBoxWidth;
    } else {
      const zoom = this.canvas ? this.canvas.getZoom() : 1;
      return this.getObjectScaling().scaleX * zoom * this.textBoxWidth;
    }
  },

  /**
   * Get text actual width
   * @param {Boolean} ignoreZoom
   */
  _getActualTextHeight: function (ignoreZoom = false) {
    if (ignoreZoom) {
      return this.getObjectScaling().scaleX * this.textBoxHeight;
    } else {
      const zoom = this.canvas ? this.canvas.getZoom() : 1;
      return this.getObjectScaling().scaleX * zoom * this.textBoxHeight;
    }
  },

  /**
   * @private
   * @return {Number} Top offset
   */
  _getTextTopOffset: function () {
    if (this.verticalAlign === 'top') {
      return -this._getActualTextHeight(true) / 2;
    } else if (this.verticalAlign === 'middle') {
      return -this.calcTextHeight() / 2;
    } else if (this.verticalAlign === 'bottom') {
      return -(this.calcTextHeight() - this._getActualTextHeight(true) / 2);
    }
    return -this._getActualTextHeight(true) / 2;
  },

  /**
   * Calculate text box height
   */
  calcTextHeight: function () {
    var lineHeight,
      height = 0;
    for (var i = 0, len = this._textLines.length; i < len; i++) {
      lineHeight = this.getHeightOfLine(i);
      height += i === len - 1 ? lineHeight / this.lineHeight : lineHeight;
    }
    return height;
  },

  /**
   * Calculate height of line at 'lineIndex'
   * @param {Number} lineIndex index of line to calculate
   * @return {Number}
   */
  getHeightOfLine: function (lineIndex) {
    if (this.__lineHeights[lineIndex]) {
      return this.__lineHeights[lineIndex];
    }

    var line = this._textLines[lineIndex],
      // char 0 is measured before the line cycle because it nneds to char
      // emptylines
      maxHeight = this.getHeightOfChar(lineIndex, 0);
    for (var i = 1, len = line.length; i < len; i++) {
      maxHeight = Math.max(this.getHeightOfChar(lineIndex, i), maxHeight);
    }

    return (this.__lineHeights[lineIndex] =
      maxHeight * this.lineHeight * this._fontSizeMult);
  },

  /**
   * Computes height of character at given position
   * @param {Number} line the line index number
   * @param {Number} _char the character index number
   * @return {Number} fontSize of the character
   */
  getHeightOfChar: function (line, _char) {
    return this.getValueOfPropertyAt(line, _char, 'fontSize');
  },

  /**
   * Retrieves the value of property at given character position
   * @param {Number} lineIndex the line number
   * @param {Number} charIndex the charater number
   * @param {String} property the property name
   * @returns the value of 'property'
   */
  getValueOfPropertyAt: function (lineIndex, charIndex, property) {
    var charStyle = this._getStyleDeclaration(lineIndex, charIndex);
    if (charStyle && typeof charStyle[property] !== 'undefined') {
      return charStyle[property];
    }
    return this[property];
  },

  /**
   * @private
   * Divides text into lines of text and lines of graphemes.
   */
  _splitText: function () {
    var newLines = this._splitTextIntoLines(this.text);
    this.textLines = newLines.lines;
    this._textLines = newLines.graphemeLines;
    this._unwrappedTextLines = newLines._unwrappedLines;
    this._text = newLines.graphemeText;
    return newLines;
  },

  /**
   * Gets lines of text to render in the Textbox. This function calculates
   * text wrapping on the fly every time it is called.
   * @param {String} text text to split
   * @returns {Array} Array of lines in the Textbox.
   * @override
   */
  _splitTextIntoLines: function (text) {
    var lines = text.split(this._reNewline),
      newLines = new Array(lines.length),
      newLine = ['\n'],
      newText = [];
    for (var i = 0; i < lines.length; i++) {
      newLines[i] = fabric.util.string.graphemeSplit(lines[i]);
      newText = newText.concat(newLines[i], newLine);
    }
    newText.pop();
    return {
      _unwrappedLines: newLines,
      lines: lines,
      graphemeText: newText,
      graphemeLines: newLines,
    };
  },

  _getWidthOfCharSpacing: function () {
    if (this.charSpacing !== 0) {
      return (this.fontSize * this.charSpacing) / 1000;
    }
    return 0;
  },

  /**
   * Init text style
   * @private
   */
  _initTextStyle: function () {
    this.textStyle = { ...defaultTextStyle, ...this.textStyle };
  },

  /**
   * Get text coords
   * @return {{x: number, y: number}}
   * @private
   */
  _getTextCoords: function () {
    const startPort = head(this.points);
    const endPort = last(this.points);
    const connectionLength =
      Math.abs(endPort.x - startPort.x) + Math.abs(endPort.y - startPort.y);
    let result = { x: 0, y: 0 };
    let currentTotalLength = 0;
    forEach(this.points, (item, index) => {
      if (index >= 1) {
        const lastPoint = this.points[index - 1];
        const isHorizontal = item.y === lastPoint.y;
        if (isHorizontal) {
          currentTotalLength += Math.abs(item.x - lastPoint.x);
        } else {
          currentTotalLength += Math.abs(item.y - lastPoint.y);
        }
        if (currentTotalLength >= connectionLength * this.textPosition) {
          const distance = currentTotalLength - connectionLength * this.textPosition;
          if (isHorizontal) {
            const isTowardRight = item.x > lastPoint.x;
            result = isTowardRight
              ? { x: item.x - distance, y: item.y }
              : { x: item.x + distance, y: item.y };
          } else {
            const isDownward = item.y > lastPoint.y;
            result = isDownward
              ? { x: item.x, y: item.y - distance }
              : { x: item.x, y: item.y + distance };
          }
          return false;
        }
      }
    });
    return result;
  },
});

export default ConnectionLine;
