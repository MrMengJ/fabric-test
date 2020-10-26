import { fabric } from 'fabric';
import memoizeOne from 'memoize-one';
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
  isEmpty,
  reduce,
  minBy,
  maxBy,
} from 'lodash';

import BaseObject from './BaseObject';
import { CONNECTION_LINE_DRAGGING_OBJECT_TYPE, ObjectType } from './constants';

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

const MIN_DRAG_DISTANCE = 2;

const defaultTextStyle = {
  stroke: null,
  strokeWidth: 1,
  strokeDashArray: null,
  fill: '#000',
  backgroundColor: '#fff',
};

const ConnectionLine = fabric.util.createClass(BaseObject, {
  type: ObjectType.ConnectionLine,

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
   * Width of a line used to render this object
   * @type Number
   * @default
   */
  lineWidth: 1,

  /**
   * Width of a stroke used to render this object, must be 0
   * @type Number
   * @default
   */
  strokeWidth: 0,

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
   * Object connection anchors
   * @type Array
   * @default
   */
  anchors: null,

  /**
   * Top position of an object. Note that by default it's relative to object top. You can change this by setting originY={top/center/bottom}
   * @type Number
   * @default
   */
  top: 0,

  /**
   * Left position of an object. Note that by default it's relative to object left. You can change this by setting originX={left/center/right}
   * @type Number
   * @default
   */
  left: 0,

  /**
   * Object width
   * @type Number
   * @default
   */
  width: 0,

  /**
   * Object height
   * @type Number
   * @default
   */
  height: 0,

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
   * Indicates whether can recalculate points by "width","height","left"，"right"
   * @type Boolean
   */
  _needRecalculatePoints: true,

  /**
   * Constructor
   * @param {Object} [options] Options object
   * @return {fabric.Polyline} thisArg
   */
  initialize: function (options = {}) {
    this.__skipDimension = true;
    this.callSuper('initialize', options);
    this.__skipDimension = false;
    this._initTextStyle();
    this.initDimensions();

    this._initPoints();
    this._updateSize(this.points);
    this._updatePosition(this.points);
    this._updateDirection();
    this.initBehavior();
  },

  _renderFromArrow: function (ctx, points) {
    let extensionDirection = this._getExtensionDirection(this.fromDirection);
    const firstPoint = head(points);
    const startPoint = {
      x: firstPoint.x,
      y: firstPoint.y,
    };
    this._drawArrow(ctx, extensionDirection, startPoint);
  },

  _renderToArrow: function (ctx, points) {
    let extensionDirection = this._getExtensionDirection(this.toDirection);
    const lastPoint = last(points);
    const startPoint = {
      x: lastPoint.x,
      y: lastPoint.y,
    };
    this._drawArrow(ctx, extensionDirection, startPoint);
  },

  /**
   * render arrow
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Array} points Points
   */
  _renderArrow: function (ctx, points) {
    if (this.arrowType === ARROW_TYPE.none) {
      return;
    }
    if (this.arrowType === ARROW_TYPE.normal) {
      this._renderToArrow(ctx, points);
    } else if (this.arrowType === ARROW_TYPE['double-sided']) {
      this._renderToArrow(ctx, points);
      this._renderFromArrow(ctx, points);
    }
  },

  /**
   * render connection line
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Array} points Points
   */
  _renderLine: function (ctx, points) {
    ctx.save();
    ctx.lineWidth = this.lineWidth;
    this._drawLine(ctx, points);
    const scaling = this.getObjectScaling();
    ctx.scale(1 / scaling.scaleX, 1 / scaling.scaleY);
    ctx.stroke();
    ctx.restore();
  },

  /**
   * render control
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Array} points Points
   */
  _renderControl: function (ctx, points) {
    if (!this.group && this.selfIsSelected()) {
      ctx.save();
      this._drawStartPoint(ctx, points);
      this._drawEndPoint(ctx, points);
      this._drawControlPoints(ctx, points);
      ctx.restore();
    }
  },

  render: function (ctx) {
    this.callSuper('render', ctx);
    this.cursorOffsetCache = {};
    this._renderTextBoxSelectionOrCursor();
  },

  /**
   * Get actual left and top
   * @private
   * @return {{x:number,y:number}}
   */
  _getLeftTop: function () {
    if (this.group) {
      const matrix = this.group.calcTransformMatrix();
      return fabric.util.transformPoint({ x: this.left, y: this.top }, matrix);
    }
    return { x: this.left, y: this.top };
  },

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _render: function (ctx) {
    ctx.beginPath();
    this.callSuper('_render', ctx);

    let len = this.points.length;
    if (len <= 1) {
      // do not draw if no points or single point
      return;
    }

    const leftTop = this._getLeftTop();
    const actualWidth = this._getActualWidth(true);
    const actualHeight = this._getActualHeight(true);
    this.setNewPoints(leftTop, actualWidth, actualHeight, this._needRecalculatePoints);
    const transformPoints = this._getTransformPoints(this.points);

    this._renderLine(ctx, transformPoints);
    this._renderArrow(ctx, transformPoints);
    this._renderControl(ctx, transformPoints);

    this._renderTextBackground(ctx, transformPoints);
    this._renderText(ctx, transformPoints);
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
   * @param {Object} point Ctx begin path point
   * initialize direction
   */
  _drawArrow: function (ctx, extensionDirection, point) {
    ctx.save();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    const { scaleX, scaleY } = this.getObjectScaling();
    ctx.translate(point.x, point.y);
    ctx.scale(1 / scaleX, 1 / scaleY);
    ctx.moveTo(0, 0);
    switch (extensionDirection) {
      case DIRECTION.right:
        ctx.lineTo(-this.arrowWidth, -this.arrowWidth / 2);
        ctx.lineTo(-this.arrowWidth, this.arrowWidth / 2);
        break;
      case DIRECTION.left:
        ctx.lineTo(this.arrowWidth, -this.arrowWidth / 2);
        ctx.lineTo(this.arrowWidth, this.arrowWidth / 2);
        break;

      case DIRECTION.top:
        ctx.lineTo(-this.arrowWidth / 2, this.arrowWidth);
        ctx.lineTo(this.arrowWidth / 2, this.arrowWidth);
        break;

      case DIRECTION.bottom:
        ctx.lineTo(-this.arrowWidth / 2, -this.arrowWidth);
        ctx.lineTo(this.arrowWidth / 2, -this.arrowWidth);
        break;
      default:
        break;
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  },

  /**
   * update from direction
   * @private
   * @return {String} from direction
   */
  _updateFromDirection: function () {
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
   * update to direction
   * @private
   * @return {String} to direction
   */
  _updateToDirection: function () {
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
   * initialize points
   * @private
   */
  _initPoints: function () {
    if (!isEmpty(this.points)) {
      return;
    }
    this.points = this._createManhattanRoute(
      this.fromPoint,
      this.fromDirection,
      this.toPoint,
      this.toDirection
    );
  },

  /**
   * update size by points
   * @param {Array} points
   * @private
   */
  _updateSize: function (points) {
    if (isEmpty(points)) {
      return;
    }
    const minX = minBy(points, (item) => item.x).x;
    const maxX = maxBy(points, (item) => item.x).x;
    const minY = minBy(points, (item) => item.y).y;
    const maxY = maxBy(points, (item) => item.y).y;
    const { scaleX, scaleY } = this.getObjectScaling();
    this.width = (maxX - minX) / scaleX;
    this.height = (maxY - minY) / scaleY;
  },

  /**
   * update position by points
   * @param {Array} points
   * @private
   */
  _updatePosition: function (points) {
    if (isEmpty(points)) {
      return;
    }
    const minX = minBy(points, (item) => item.x).x;
    const minY = minBy(points, (item) => item.y).y;
    this.left = minX;
    this.top = minY;
  },

  /**
   * initialize direction
   * @private
   */
  _updateDirection: function () {
    if (this.points.length <= 1) {
      return;
    }
    this._updateFromDirection();
    this._updateToDirection();
  },

  /**
   * initialize direction
   * @private
   * @return {Array} control points
   */
  _getControlPoints: function (points = this.points) {
    const result = [];
    forEach(points, (item, index) => {
      if (index < points.length - 1) {
        const nextOne = points[index + 1];
        result[index] = {
          x: (item.x + nextOne.x) / 2,
          y: (item.y + nextOne.y) / 2,
        };
      }
    });
    return result;
  },

  _drawStartPoint: function (ctx, points) {
    const firstPoint = head(points);
    const { scaleX, scaleY } = this.getObjectScaling();

    ctx.save();

    ctx.strokeStyle = '#137CBD';
    ctx.fillStyle = '#137CBD';
    ctx.beginPath();
    ctx.translate(firstPoint.x, firstPoint.y);
    ctx.scale(1 / scaleX, 1 / scaleY);
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  _drawEndPoint: function (ctx, points) {
    const lastPoint = last(points);
    const { scaleX, scaleY } = this.getObjectScaling();

    ctx.save();
    ctx.translate(lastPoint.x, lastPoint.y);
    ctx.scale(1 / scaleX, 1 / scaleY);

    // draw outer circle
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#137CBD';
    ctx.lineWidth = 3;
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();

    // draw inner circle
    ctx.beginPath();
    ctx.fillStyle = '#137CBD';
    ctx.lineWidth = 0;
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  _drawControlPoints: function (ctx, points) {
    const controlPoints = this._getControlPoints(points);
    const { scaleX, scaleY } = this.getObjectScaling();
    forEach(controlPoints, (item) => {
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = '#137CBD';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.translate(item.x, item.y);
      ctx.scale(1 / scaleX, 1 / scaleY);
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  },

  /**
   * draw line
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Array} points Points
   */
  _drawLine: function (ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length; i++) {
      let point = points[i];
      ctx.lineTo(point.x, point.y);
    }
  },

  _getTransformPoints: memoizeOne(function (points) {
    const invertedBossTransform = fabric.util.invertTransform(this.calcTransformMatrix());
    return map(points, (item) => {
      return fabric.util.transformPoint(item, invertedBossTransform);
    });
  }, isEqual),

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
    this._canvasMouseUpHandler = this._canvasMouseUpHandler.bind(this);
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
    const { pointer, target } = options;
    if (!isEqual(target, this)) {
      return;
    }

    const isDragStartPort = this._startPortContainsPoint(pointer);
    const isDragEndPort = this._endPortContainsPoint(pointer);
    const draggingControlPoint = this._controlPointsContainsPoint(pointer);
    const draggingLine = this._linesContainsPoint(pointer);
    const draggingTextBox = this._textBoxContainsPoint(pointer);

    if (this.isEditing) {
      if (!draggingTextBox) {
        this.exitEditing();
      } else {
        this.inCompositionMode = false;
        this.setCursorByClick(options.e);

        this.__selectionStartOnMouseDown = this.selectionStart;
        if (this.selectionStart === this.selectionEnd) {
          this.abortCursorAnimation();
        }
        this._renderTextBoxSelectionOrCursor();
      }
    }

    this._startDraggingPoint = pointer;
    this._startDragging(
      isDragStartPort,
      isDragEndPort,
      draggingControlPoint,
      draggingLine,
      draggingTextBox,
      pointer
    );
    this.canvas._isDraggingConnectionLine = true;
  },

  /**
   * Set line hover cursor
   * @param point point of mouse coordinates
   */
  _setHoverCursor: function (point) {
    if (!this._isDragging && this.canvas) {
      //  textBox cursor
      if (this._textBoxContainsPoint(point)) {
        const cursor = this.isEditing ? 'text' : 'move';
        this.canvas.setCursor(cursor);
        return;
      }

      // start port cursor , end port cursor
      if (this._startPortContainsPoint(point) || this._endPortContainsPoint(point)) {
        const cursor = 'move';
        this.canvas.setCursor(cursor);
        return;
      }

      // control point cursor
      if (!this.group && this.selfIsSelected()) {
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
        const cursor = 'move';
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
      this._needRecalculatePoints = false;
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
      this._needRecalculatePoints = false;
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
      this._needRecalculatePoints = false;
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
      this._needRecalculatePoints = false;
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
        this._needRecalculatePoints = false;
      } else {
        this.points = map(originalPoints, (item) => {
          const matched = includes(correspondingLinePathPoints, item);
          return matched ? { x: point.x, y: item.y } : item;
        });
        this._needRecalculatePoints = false;
      }
    }
    this._updateDirection();
    this._updateSize(this.points);
    this._updatePosition(this.points);
    this.canvas.requestRenderAll();
  },

  /**
   * Handler when drag line path
   * @param point point of mouse coordinates
   */
  _handleDragLinePathOrTextBox: function (point) {
    const { startDraggingPoint, originalPoints } = this._draggingObject;
    const distance = {
      x: point.x - startDraggingPoint.x,
      y: point.y - startDraggingPoint.y,
    };
    this.points = map(originalPoints, (item) => {
      return {
        x: item.x + distance.x,
        y: item.y + distance.y,
      };
    });
    this._needRecalculatePoints = false;
    this.fromPoint = head(this.points);
    this.toPoint = last(this.points);
    this.canvas.requestRenderAll();
  },

  _mouseMoveHandlerInTextBox: function (options) {
    const isMouseInTextBox = this._textBoxContainsPoint(options.pointer);

    // mouse move in text box
    if (this._isDragging && this.isEditing && isMouseInTextBox) {
      var newSelectionStart = this.getSelectionStartFromPointer(options.e),
        currentStart = this.selectionStart,
        currentEnd = this.selectionEnd;
      if (
        (newSelectionStart !== this.__selectionStartOnMouseDown ||
          currentStart === currentEnd) &&
        (currentStart === newSelectionStart || currentEnd === newSelectionStart)
      ) {
        return;
      }
      if (newSelectionStart > this.__selectionStartOnMouseDown) {
        this.selectionStart = this.__selectionStartOnMouseDown;
        this.selectionEnd = newSelectionStart;
      } else {
        this.selectionStart = newSelectionStart;
        this.selectionEnd = this.__selectionStartOnMouseDown;
      }
      if (this.selectionStart !== currentStart || this.selectionEnd !== currentEnd) {
        this.restartCursorIfNeeded();
        this._fireSelectionChanged();
        this._updateTextarea();
        this._renderTextBoxSelectionOrCursor();
      }
    }
    // dragging text box
    else if (
      this._isDragging &&
      this._draggingObject.type === CONNECTION_LINE_DRAGGING_OBJECT_TYPE.textBox &&
      !this.isEditing
    ) {
      const zoom = this.canvas.getZoom();
      const point = {
        x: options.pointer.x / zoom,
        y: options.pointer.y / zoom,
      };
      // this._handleDragLinePathOrTextBox(point);
    }
  },

  restartCursorIfNeeded: function () {
    if (
      !this._currentTickState ||
      this._currentTickState.isAborted ||
      !this._currentTickCompleteState ||
      this._currentTickCompleteState.isAborted
    ) {
      this.initDelayedCursor();
    }
  },

  _canvasMouseMoveHandler: function (options) {
    const { target } = options;
    if (!isEqual(target, this)) {
      return;
    }

    this._mouseMoveHandlerInTextBox(options);

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
      if (this._draggingObject.type === CONNECTION_LINE_DRAGGING_OBJECT_TYPE.startPort) {
        this.fromPoint = point;
        this.fromDirection = this._getDirection(this.toPoint, this.toDirection, point);
        this._updatePoints();
        this._needRecalculatePoints = false;
        this._updateSize(this.points);
        this._updatePosition(this.points);
      } else if (
        this._draggingObject.type === CONNECTION_LINE_DRAGGING_OBJECT_TYPE.endPort
      ) {
        this.toPoint = point;
        this.toDirection = this._getDirection(this.fromPoint, this.fromDirection, point);
        this._updatePoints();
        this._needRecalculatePoints = false;
        this._updateSize(this.points);
        this._updatePosition(this.points);
      } else if (
        this._draggingObject.type === CONNECTION_LINE_DRAGGING_OBJECT_TYPE.controlPoint
      ) {
        this._handleDragControlPoint(point);
      } else if (
        this._draggingObject.type === CONNECTION_LINE_DRAGGING_OBJECT_TYPE.line
      ) {
        // this._handleDragLinePathOrTextBox(point);
      }
    }
  },

  _canvasMouseUpHandler: function (options) {
    const { target } = options;
    if (!isEqual(target, this)) {
      return;
    }

    if (this._isDragging) {
      this._endDragging();

      if (this.isEditing && this._textBoxContainsPoint(options.pointer)) {
        if (this.selectionStart === this.selectionEnd) {
          this.initDelayedCursor(true);
        } else {
          this._renderTextBoxSelectionOrCursor();
        }
      }
    }
  },

  _canvasMouseDblclickHandler: function (options) {
    const { pointer, target } = options;
    if (!isEqual(target, this)) {
      return;
    }

    if (this._linesContainsPoint(pointer) || this._textBoxContainsPoint(pointer)) {
      if (!this.isEditing) {
        this.enterEditing(options.e);
      }

      if (this.isEditing) {
        this.selectAll();
      }
    }
    this._renderTextBoxSelectionOrCursor();
  },

  /**
   * Get line paths
   * @return {Array} the line paths
   */
  _getLinePathArray: function () {
    const result = [];
    const lineWidth = max([
      EASY_SELECTABLE_LINE_WIDTH,
      this.lineWidth * this.canvas.getZoom(),
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
   * Checks if point is inside the coords
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
   * Checks if point is inside the connection line range
   * @param {fabric.Point} point Point to check against
   * @return {Boolean} true if point is inside the connection line range
   */
  isInConnectionLineRange: function (point) {
    const linesContainsPoint = this._linesContainsPoint(point);
    const startPortContainsPoint = this._startPortContainsPoint(point);
    const endPortContainsPoint = this._endPortContainsPoint(point);
    const controlPoint = this._controlPointsContainsPoint(point);
    const textBoxContainsPoint = this._textBoxContainsPoint(point);
    return (
      linesContainsPoint ||
      startPortContainsPoint ||
      endPortContainsPoint ||
      controlPoint ||
      textBoxContainsPoint
    );
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
      type: CONNECTION_LINE_DRAGGING_OBJECT_TYPE.controlPoint,
      isDragControlPoint: true,
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
    draggingLine,
    draggingTextBox,
    draggingPoint
  ) {
    const zoom = this.canvas.getZoom();
    const startDraggingPoint = {
      x: draggingPoint.x / zoom,
      y: draggingPoint.y / zoom,
    };
    let result = {
      startDraggingPoint,
    };
    if (draggingTextBox) {
      result.isDragTextBox = true;
      result.type = CONNECTION_LINE_DRAGGING_OBJECT_TYPE.textBox;
      result.originalPoints = this.points;
    } else if (isDragStartPort) {
      result.isDragStartPort = true;
      result.type = CONNECTION_LINE_DRAGGING_OBJECT_TYPE.startPort;
    } else if (isDragEndPort) {
      result.isDragEndPort = true;
      result.type = CONNECTION_LINE_DRAGGING_OBJECT_TYPE.endPort;
    } else if (draggingControlPoint) {
      result = this._setDraggingObjectWhenDragControlPoint(draggingControlPoint);
    } else if (draggingLine) {
      result.isDragLine = true;
      result.type = CONNECTION_LINE_DRAGGING_OBJECT_TYPE.line;
      result.line = draggingLine;
      result.originalPoints = this.points;
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
    draggingLine,
    draggingTextBox,
    draggingPoint
  ) {
    this._isDragging = true;
    this._setDraggingObject(
      isDragStartPort,
      isDragEndPort,
      draggingControlPoint,
      draggingLine,
      draggingTextBox,
      draggingPoint
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

  /**
   * Get text box corner coords
   * @param {Object} port text box center coords
   * @return {Object} corner coords
   */
  _getTextBoxCornerCoords: function (port) {
    const zoom = this.canvas.getZoom();
    const actualTextBoxWidth = this._getActualTextBoxWidth();
    const actualTextBoxHeight = this._getActualTextBoxHeight();
    return {
      tl: {
        x: port.x * zoom - actualTextBoxWidth / 2,
        y: port.y * zoom - actualTextBoxHeight / 2,
      },
      tr: {
        x: port.x * zoom + actualTextBoxWidth / 2,
        y: port.y * zoom - actualTextBoxHeight / 2,
      },
      bl: {
        x: port.x * zoom - actualTextBoxWidth / 2,
        y: port.y * zoom + actualTextBoxHeight / 2,
      },
      br: {
        x: port.x * zoom + actualTextBoxWidth / 2,
        y: port.y * zoom + actualTextBoxHeight / 2,
      },
    };
  },

  /**
   * Checks if point is inside the text box
   * @return {Object} the line
   */
  _textBoxContainsPoint: function (point) {
    if (!this.text) {
      return false;
    }
    const textBoxCornerCoords = this._getTextBoxCornerCoords(this._getTextCoords());
    return this._containsPoint(point, textBoxCornerCoords);
  },

  /**
   * Checks is selected
   * @return {Boolean} true if be selected
   */
  selfIsSelected: function () {
    if (!this.canvas) {
      return false;
    }
    const activeObjects = this.canvas.getActiveObjects();
    for (let i = 0; i < activeObjects.length; i++) {
      if (isEqual(activeObjects[i], this)) {
        return true;
      }
    }
    return false;
  },

  updateFormPointByPoints: function (points = this.points) {
    this.fromPoint = head(points);
  },

  updateToPointByPoints: function (points = this.points) {
    this.toPoint = last(points);
  },

  getACoords: function () {
    let finalMatrix;
    if (this.group) {
      finalMatrix = this.calcTransformMatrix();
    } else {
      const translateMatrix = this._calcTranslateMatrix();
      const rotateMatrix = this._calcRotateMatrix();
      finalMatrix = fabric.util.multiplyTransformMatrices(translateMatrix, rotateMatrix);
    }
    const dim = this.group
      ? this._getNonTransformedDimensions()
      : this._getTransformedDimensions();
    const w = dim.x / 2;
    const h = dim.y / 2;
    const transformPoint = fabric.util.transformPoint;

    return {
      tl: transformPoint({ x: -w, y: -h }, finalMatrix),
      tr: transformPoint({ x: w, y: -h }, finalMatrix),
      bl: transformPoint({ x: -w, y: h }, finalMatrix),
      br: transformPoint({ x: w, y: h }, finalMatrix),
    };
  },

  setNewPoints: memoizeOne(function (leftTop, width, height, _needRecalculatePoints) {
    const { x: left, y: top } = leftTop;
    const aCoords = this.getACoords();
    if (!_needRecalculatePoints) {
      this._needRecalculatePoints = true;
      this._prevLeft = left;
      this._prevTop = top;
      this._prevWidth = width;
      this._prevHeight = height;
      this._prevACoords = aCoords;
      return;
    }

    const moveX = this._prevLeft ? left - this._prevLeft : 0;
    const moveY = this._prevTop ? top - this._prevTop : 0;
    const widthChange = this._prevWidth ? width - this._prevWidth : 0;
    const heightChange = this._prevHeight ? height - this._prevHeight : 0;
    const newPoints = cloneDeep(this.points);
    if (this._prevACoords) {
      const { tl: prevTl, tr: prevTr, bl: prevBl, br: prevBr } = this._prevACoords;
      const { tl, tr, br } = aCoords;
      forEach(this.points, (item, index) => {
        // left boundary
        if (item.x === prevTl.x) {
          newPoints[index] = {
            x: tl.x,
            y:
              item.y +
              moveY +
              heightChange *
                (Math.abs(item.y - prevTl.y) / Math.abs(prevBl.y - prevTl.y)),
          };
        }

        // upper boundary
        if (item.y === prevTl.y) {
          newPoints[index] = {
            x:
              item.x +
              moveX +
              widthChange * (Math.abs(item.x - prevTl.x) / Math.abs(prevTr.x - prevTl.x)),
            y: tl.y,
          };
        }

        // right boundary
        if (item.x === prevTr.x) {
          newPoints[index] = {
            x: tr.x,
            y:
              item.y +
              moveY +
              heightChange *
                (Math.abs(item.y - prevTr.y) / Math.abs(prevBr.y - prevTr.y)),
          };
        }

        //lower boundary
        if (item.y === prevBl.y) {
          newPoints[index] = {
            x:
              item.x +
              moveX +
              widthChange * (Math.abs(item.x - prevBl.x) / Math.abs(prevBr.x - prevBl.x)),
            y: br.y,
          };
        }

        // within boundary
        if (
          item.x > prevTl.x &&
          item.x < prevBr.x &&
          item.y > prevTl.y &&
          item.y < prevBr.y
        ) {
          newPoints[index] = {
            x:
              item.x +
              widthChange *
                (Math.abs(item.x - prevTl.x) / Math.abs(prevTr.x - prevTl.x)) +
              moveX,
            y:
              item.y +
              moveY +
              heightChange *
                (Math.abs(item.y - prevTl.y) / Math.abs(prevBl.y - prevTl.y)),
          };
        }
      });
      this.points = newPoints;
      this.updateFormPointByPoints(newPoints);
      this.updateToPointByPoints(newPoints);
    }
    this._prevLeft = left;
    this._prevTop = top;
    this._prevWidth = width;
    this._prevHeight = height;
    this._prevACoords = aCoords;
  }, isEqual),

  // For text

  text: '',

  textStyle: defaultTextStyle,

  /**
   * Indicates whether text is in editing mode
   * @type Boolean
   * @default
   */
  isEditing: false,

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
   * For functionalities on keyDown
   * Map a special key to a function of the instance/prototype
   * If you need different behaviour for ESC or TAB or arrows, you have to change
   * this map setting the name of a function that you build on the fabric.Itext or
   * your prototype.
   * the map change will affect all Instances unless you need for only some text Instances
   * in that case you have to clone this object and assign your Instance.
   * this.keysMap = fabric.util.object.clone(this.keysMap);
   * The function must be in fabric.Itext.prototype.myFunction And will receive event as args[0]
   */
  keysMap: {
    9: 'exitEditing',
    27: 'exitEditing',
    33: 'moveCursorUp',
    34: 'moveCursorDown',
    35: 'moveCursorRight',
    36: 'moveCursorLeft',
    37: 'moveCursorLeft',
    38: 'moveCursorUp',
    39: 'moveCursorRight',
    40: 'moveCursorDown',
  },

  /**
   * For functionalities on keyUp + ctrl || cmd
   */
  ctrlKeysMapUp: {
    67: 'copy',
    88: 'cut',
  },

  /**
   * For functionalities on keyDown + ctrl || cmd
   */
  ctrlKeysMapDown: {
    65: 'selectAll',
  },

  /**
   * Minimum width of textbox, in pixels.
   * @type Number
   * @default
   */
  minWidth: 20,

  /**
   * Cached array of text wrapping.
   * @type Array
   */
  __cachedLines: null,

  /**
   * Override standard Object class values
   */
  lockScalingFlip: true,

  /**
   * Override standard Object class values
   * Textbox needs this on false
   */
  noScaleCache: false,

  /**
   * Use this regular expression to split strings in breakable lines
   * @private
   */
  _wordJoiners: /[ \t\r]/,

  /**
   * Use this boolean property in order to split strings that have no white space concept.
   * this is a cheap way to help with chinese/japaense
   * @type Boolean
   * @since 2.6.0
   */
  splitByGrapheme: true,

  /**
   * Initialize or update text dimensions.
   * Updates this.textBoxWidth and this.textBoxHeight with the proper values.
   * Does not return dimensions.
   */
  initDimensions: function () {
    if (this.__skipDimension) {
      return;
    }
    if (this.isEditing) {
      this.initDelayedCursor();
    }
    this.clearContextTop();
    this._splitText();
    this._clearCache();
    this.textBoxWidth = this.calcTextWidth() || this.cursorWidth || this.MIN_TEXT_WIDTH;
    if (this.textAlign.indexOf('justify') !== -1) {
      // once text is measured we need to make space fatter to make justified text.
      this.enlargeSpaces();
    }
    this.textBoxHeight = this.calcTextHeight();
    // wrap lines
    this._styleMap = this._generateStyleMap(this._splitText());
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
    return max([maxWidth, this.fontSize * this.lineHeight * 2]);
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
   * @param {Number} lineIndex text to split
   * @return {Boolean}
   */
  isEndOfWrapping: function (lineIndex) {
    if (!this._styleMap[lineIndex + 1]) {
      // is last line, return true;
      return true;
    }
    if (this._styleMap[lineIndex + 1].line !== this._styleMap[lineIndex].line) {
      // this is last line before a line break, return true;
      return true;
    }
    return false;
  },

  _renderText: function (ctx, points) {
    if (!this.text) {
      return;
    }
    const textPosition = this._getTextCoords(points);
    const transform = this._getCurrentTransform();
    const zoom = this.canvas.getZoom();
    const degreesToRadians = fabric.util.degreesToRadians;
    const radians = degreesToRadians(this._getActualAngle());
    const scaleX = this.objectCaching
      ? transform.scaleX
      : transform.scaleX / Math.cos(radians);
    const scaleY = this.objectCaching
      ? transform.scaleY
      : transform.scaleY / Math.cos(radians);

    ctx.save();
    ctx.translate(textPosition.x, textPosition.y);
    ctx.scale((1 / scaleX) * zoom, (1 / scaleY) * zoom);

    if (this.paintFirst === 'stroke') {
      this._renderTextStroke(ctx);
      this._renderTextFill(ctx);
    } else {
      this._renderTextFill(ctx);
      this._renderTextStroke(ctx);
    }
    ctx.restore();
  },

  _renderTextBackground: function (ctx, points) {
    if (!this.textStyle.backgroundColor || (!this.text && !this.isEditing)) {
      return;
    }

    ctx.save();
    ctx.fillStyle = this.textStyle.backgroundColor;
    const textPosition = this._getTextCoords(points);
    const transform = this._getCurrentTransform();
    const zoom = this.canvas.getZoom();
    const degreesToRadians = fabric.util.degreesToRadians;
    const radians = degreesToRadians(this._getActualAngle());
    const scaleX = this.objectCaching
      ? transform.scaleX
      : transform.scaleX / Math.cos(radians);
    const scaleY = this.objectCaching
      ? transform.scaleY
      : transform.scaleY / Math.cos(radians);

    ctx.translate(textPosition.x, textPosition.y);
    ctx.scale((1 / scaleX) * zoom, (1 / scaleY) * zoom);

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
    return -this.textBoxWidth / 2;
  },

  /**
   * @private
   * @return {Number} Top offset
   */
  _getTextTopOffset: function () {
    if (this.verticalAlign === 'top') {
      return -this.textBoxHeight(true) / 2;
    } else if (this.verticalAlign === 'middle') {
      return -this.calcTextHeight() / 2;
    } else if (this.verticalAlign === 'bottom') {
      return -(this.calcTextHeight() - this.textBoxHeight / 2);
    }
    return -this.textBoxHeight / 2;
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
    return max([height, this.fontSize * this.lineHeight]);
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
   * Get connection length
   * @return {Number}
   * @private
   */
  _getConnectionLength: function (points) {
    return reduce(
      points,
      (result, value, index, self) => {
        const currentLineLength =
          index === 0
            ? 0
            : Math.abs(value.x + value.y - (self[index - 1].x + self[index - 1].y));
        return result + currentLineLength;
      },
      0
    );
  },

  /**
   * Get text coords
   * @param {Object} points
   * @return {{x: number, y: number}}
   * @private
   */
  _getTextCoords: function (points = this.points) {
    const connectionLength = this._getConnectionLength(points);
    let result = { x: 0, y: 0 };
    let currentTotalLength = 0;
    forEach(points, (item, index) => {
      if (index >= 1) {
        const lastPoint = points[index - 1];
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

  /**
   * Initializes hidden textarea (needed to bring up keyboard in iOS)
   */
  initHiddenTextarea: function () {
    this.hiddenTextarea = fabric.document.createElement('textarea');
    this.hiddenTextarea.setAttribute('autocapitalize', 'off');
    this.hiddenTextarea.setAttribute('autocorrect', 'off');
    this.hiddenTextarea.setAttribute('autocomplete', 'off');
    this.hiddenTextarea.setAttribute('spellcheck', 'false');
    this.hiddenTextarea.setAttribute('data-fabric-hiddentextarea', '');
    this.hiddenTextarea.setAttribute('wrap', 'off');
    var style = this._calcTextareaPosition();
    // line-height: 1px; was removed from the style to fix this:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=870966
    this.hiddenTextarea.style.cssText =
      'position: absolute; top: ' +
      style.top +
      '; left: ' +
      style.left +
      '; z-index: -999; opacity: 0; width: 1px; height: 1px; font-size: 1px;' +
      ' paddingｰtop: ' +
      style.fontSize +
      ';';
    fabric.document.body.appendChild(this.hiddenTextarea);

    fabric.util.addListener(this.hiddenTextarea, 'keydown', this.onKeyDown.bind(this));
    fabric.util.addListener(this.hiddenTextarea, 'keyup', this.onKeyUp.bind(this));
    fabric.util.addListener(this.hiddenTextarea, 'input', this.onInput.bind(this));
    fabric.util.addListener(this.hiddenTextarea, 'copy', this.copy.bind(this));
    fabric.util.addListener(this.hiddenTextarea, 'cut', this.copy.bind(this));
    fabric.util.addListener(this.hiddenTextarea, 'paste', this.paste.bind(this));
    fabric.util.addListener(
      this.hiddenTextarea,
      'compositionstart',
      this.onCompositionStart.bind(this)
    );
    fabric.util.addListener(
      this.hiddenTextarea,
      'compositionupdate',
      this.onCompositionUpdate.bind(this)
    );
    fabric.util.addListener(
      this.hiddenTextarea,
      'compositionend',
      this.onCompositionEnd.bind(this)
    );

    if (!this._clickHandlerInitialized && this.canvas) {
      fabric.util.addListener(
        this.canvas.upperCanvasEl,
        'click',
        this.onClick.bind(this)
      );
      this._clickHandlerInitialized = true;
    }
  },

  // text event

  onClick: function () {
    // No need to trigger click event here, focus is enough to have the keyboard appear on Android
    this.hiddenTextarea && this.hiddenTextarea.focus();
  },

  /**
   * Handles keydown event
   * only used for arrows and combination of modifier keys.
   * @param {Event} e Event object
   */
  onKeyDown: function (e) {
    if (!this.isEditing) {
      return;
    }
    if (e.keyCode in this.keysMap) {
      this[this.keysMap[e.keyCode]](e);
    } else if (e.keyCode in this.ctrlKeysMapDown && (e.ctrlKey || e.metaKey)) {
      this[this.ctrlKeysMapDown[e.keyCode]](e);
    } else {
      return;
    }
    e.stopImmediatePropagation();
    e.preventDefault();
    if (e.keyCode >= 33 && e.keyCode <= 40) {
      // if i press an arrow key just update selection
      this.inCompositionMode = false;
      this.clearContextTop();
      this._renderTextBoxSelectionOrCursor();
    } else {
      this.canvas && this.canvas.requestRenderAll();
    }
  },

  /**
   * Handles keyup event
   * We handle KeyUp because ie11 and edge have difficulties copy/pasting
   * if a copy/cut event fired, keyup is dismissed
   * @param {Event} e Event object
   */
  onKeyUp: function (e) {
    if (!this.isEditing || this._copyDone || this.inCompositionMode) {
      this._copyDone = false;
      return;
    }
    if (e.keyCode in this.ctrlKeysMapUp && (e.ctrlKey || e.metaKey)) {
      this[this.ctrlKeysMapUp[e.keyCode]](e);
    } else {
      return;
    }
    e.stopImmediatePropagation();
    e.preventDefault();
    this.canvas && this.canvas.requestRenderAll();
  },

  /**
   * Handles onInput event
   * @param {Event} e Event object
   */
  onInput: function (e) {
    var fromPaste = this.fromPaste;
    this.fromPaste = false;
    e && e.stopPropagation();
    if (!this.isEditing) {
      return;
    }
    // decisions about style changes.
    var nextText = this._splitTextIntoLines(this.hiddenTextarea.value).graphemeText,
      charCount = this._text.length,
      nextCharCount = nextText.length,
      removedText,
      insertedText,
      charDiff = nextCharCount - charCount,
      selectionStart = this.selectionStart,
      selectionEnd = this.selectionEnd,
      selection = selectionStart !== selectionEnd,
      copiedStyle;
    if (this.hiddenTextarea.value === '') {
      this.textStyles = {};
      this.updateFromTextArea();
      this.fire('changed');
      if (this.canvas) {
        this.canvas.fire('text:changed', { target: this });
        this.canvas.requestRenderAll();
      }
      return;
    }

    var textareaSelection = this.fromStringToGraphemeSelection(
      this.hiddenTextarea.selectionStart,
      this.hiddenTextarea.selectionEnd,
      this.hiddenTextarea.value
    );
    var backDelete = selectionStart > textareaSelection.selectionStart;

    if (selection) {
      removedText = this._text.slice(selectionStart, selectionEnd);
      charDiff += selectionEnd - selectionStart;
    } else if (nextCharCount < charCount) {
      if (backDelete) {
        removedText = this._text.slice(selectionEnd + charDiff, selectionEnd);
      } else {
        removedText = this._text.slice(selectionStart, selectionStart - charDiff);
      }
    }
    insertedText = nextText.slice(
      textareaSelection.selectionEnd - charDiff,
      textareaSelection.selectionEnd
    );
    if (removedText && removedText.length) {
      if (insertedText.length) {
        // let's copy some style before deleting.
        // we want to copy the style before the cursor OR the style at the cursor if selection
        // is bigger than 0.
        copiedStyle = this.getSelectionStyles(selectionStart, selectionStart + 1, false);
        // now duplicate the style one for each inserted text.
        copiedStyle = insertedText.map(function () {
          // this return an array of references, but that is fine since we are
          // copying the style later.
          return copiedStyle[0];
        });
      }
    }
    if (insertedText.length) {
      if (
        fromPaste &&
        insertedText.join('') === fabric.copiedText &&
        !fabric.disableStyleCopyPaste
      ) {
        copiedStyle = fabric.copiedTextStyle;
      }
    }
    this.updateFromTextArea();
    this.fire('changed');
    if (this.canvas) {
      this.canvas.fire('text:changed', { target: this });
      this.canvas.requestRenderAll();
    }
  },

  /**
   * @private
   */
  updateFromTextArea: function () {
    if (!this.hiddenTextarea) {
      return;
    }
    this.cursorOffsetCache = {};
    this.text = this.hiddenTextarea.value;
    if (this._shouldClearDimensionCache()) {
      this.initDimensions();
      this.setCoords();
    }
    var newSelection = this.fromStringToGraphemeSelection(
      this.hiddenTextarea.selectionStart,
      this.hiddenTextarea.selectionEnd,
      this.hiddenTextarea.value
    );
    this.selectionEnd = this.selectionStart = newSelection.selectionEnd;
    if (!this.inCompositionMode) {
      this.selectionStart = newSelection.selectionStart;
    }
    this.updateTextareaPosition();
  },

  /**
   * @private
   */
  _shouldClearDimensionCache: function () {
    var shouldClear = this._forceClearCache;
    shouldClear || (shouldClear = this.hasStateChanged('_dimensionAffectingProps'));
    if (shouldClear) {
      this.dirty = true;
      this._forceClearCache = false;
    }
    return shouldClear;
  },

  /**
   * convert from textarea to grapheme indexes
   */
  fromStringToGraphemeSelection: function (start, end, text) {
    var smallerTextStart = text.slice(0, start),
      graphemeStart = fabric.util.string.graphemeSplit(smallerTextStart).length;
    if (start === end) {
      return { selectionStart: graphemeStart, selectionEnd: graphemeStart };
    }
    var smallerTextEnd = text.slice(start, end),
      graphemeEnd = fabric.util.string.graphemeSplit(smallerTextEnd).length;
    return { selectionStart: graphemeStart, selectionEnd: graphemeStart + graphemeEnd };
  },

  /**
   * Composition start
   */
  onCompositionStart: function () {
    this.inCompositionMode = true;
  },

  /**
   * Composition end
   */
  onCompositionEnd: function () {
    this.inCompositionMode = false;
  },

  // /**
  //  * Composition update
  //  */
  onCompositionUpdate: function (e) {
    this.compositionStart = e.target.selectionStart;
    this.compositionEnd = e.target.selectionEnd;
    this.updateTextareaPosition();
  },

  /**
   * @private
   */
  updateTextareaPosition: function () {
    if (this.selectionStart === this.selectionEnd) {
      const style = this._calcTextareaPosition();
      this.hiddenTextarea.style.left = style.left;
      this.hiddenTextarea.style.top = style.top;
    }
  },

  /**
   * Copies selected text
   * @param {Event} e Event object
   */
  copy: function () {
    if (this.selectionStart === this.selectionEnd) {
      //do not cut-copy if no selection
      return;
    }

    fabric.copiedText = this.getSelectedText();
    if (!fabric.disableStyleCopyPaste) {
      fabric.copiedTextStyle = this.getSelectionStyles(
        this.selectionStart,
        this.selectionEnd,
        true
      );
    } else {
      fabric.copiedTextStyle = null;
    }
    this._copyDone = true;
  },

  /**
   * Gets style of a current selection/cursor (at the start position)
   * if startIndex or endIndex are not provided, slectionStart or selectionEnd will be used.
   * @param {Number} [startIndex] Start index to get styles at
   * @param {Number} [endIndex] End index to get styles at, if not specified selectionEnd or startIndex + 1
   * @param {Boolean} [complete] get full style or not
   * @return {Array} styles an array with one, zero or more Style objects
   */
  getSelectionStyles: function (startIndex, endIndex, complete) {
    if (typeof startIndex === 'undefined') {
      startIndex = this.selectionStart || 0;
    }
    if (typeof endIndex === 'undefined') {
      endIndex = this.selectionEnd || startIndex;
    }
    var styles = [];
    for (var i = startIndex; i < endIndex; i++) {
      styles.push(this.getStyleAtPosition(i, complete));
    }
    return styles;
  },

  /**
   * Gets style of a current selection/cursor position
   * @param {Number} position  to get styles at
   * @param {Boolean} [complete] full style if true
   * @return {Object} style Style object at a specified index
   * @private
   */
  getStyleAtPosition: function (position, complete) {
    var loc = this.get2DCursorLocation(position),
      style = complete
        ? this.getCompleteStyleDeclaration(loc.lineIndex, loc.charIndex)
        : this._getStyleDeclaration(loc.lineIndex, loc.charIndex);
    return style || {};
  },

  /**
   * Returns selected text
   * @return {String}
   */
  getSelectedText: function () {
    return this._text.slice(this.selectionStart, this.selectionEnd).join('');
  },

  /**
   * Pastes text
   * @param {Event} e Event object
   */
  paste: function () {
    this.fromPaste = true;
  },

  /**
   * @private
   * @param {Event} e Event object
   * @return {Object} Clipboard data object
   */
  _getClipboardData: function (e) {
    return (e && e.clipboardData) || fabric.window.clipboardData;
  },

  /**
   * private
   * Helps finding if the offset should be counted from Start or End
   * @param {Event} e Event object
   * @param {Boolean} isRight
   * @return {Number}
   */
  _getSelectionForOffset: function (e, isRight) {
    if (e.shiftKey && this.selectionStart !== this.selectionEnd && isRight) {
      return this.selectionEnd;
    } else {
      return this.selectionStart;
    }
  },

  /**
   * Finds the width in pixels before the cursor on the same line
   * @private
   * @param {Number} lineIndex
   * @param {Number} charIndex
   * @return {Number} widthBeforeCursor width before cursor
   */
  _getWidthBeforeCursor: function (lineIndex, charIndex) {
    var widthBeforeCursor = this._getLineLeftOffset(lineIndex),
      bound;

    if (charIndex > 0) {
      bound = this.__charBounds[lineIndex][charIndex - 1];
      widthBeforeCursor += bound.left + bound.width;
    }
    return widthBeforeCursor;
  },

  /**
   * for a given width it founds the matching character.
   * @private
   */
  _getIndexOnLine: function (lineIndex, width) {
    var line = this._textLines[lineIndex],
      lineLeftOffset = this._getLineLeftOffset(lineIndex),
      widthOfCharsOnLine = lineLeftOffset,
      indexOnLine = 0,
      charWidth,
      foundMatch;

    for (var j = 0, jlen = line.length; j < jlen; j++) {
      charWidth = this.__charBounds[lineIndex][j].width;
      widthOfCharsOnLine += charWidth;
      if (widthOfCharsOnLine > width) {
        foundMatch = true;
        var leftEdge = widthOfCharsOnLine - charWidth,
          rightEdge = widthOfCharsOnLine,
          offsetFromLeftEdge = Math.abs(leftEdge - width),
          offsetFromRightEdge = Math.abs(rightEdge - width);

        indexOnLine = offsetFromRightEdge < offsetFromLeftEdge ? j : j - 1;
        break;
      }
    }

    // reached end
    if (!foundMatch) {
      indexOnLine = line.length - 1;
    }

    return indexOnLine;
  },

  /**
   * @param {Event} e Event object
   * @param {Boolean} isRight
   * @return {Number}
   */
  getUpCursorOffset: function (e, isRight) {
    var selectionProp = this._getSelectionForOffset(e, isRight),
      cursorLocation = this.get2DCursorLocation(selectionProp),
      lineIndex = cursorLocation.lineIndex;
    if (lineIndex === 0 || e.metaKey || e.keyCode === 33) {
      // if on first line, up cursor goes to start of line
      return -selectionProp;
    }
    var charIndex = cursorLocation.charIndex,
      widthBeforeCursor = this._getWidthBeforeCursor(lineIndex, charIndex),
      indexOnOtherLine = this._getIndexOnLine(lineIndex - 1, widthBeforeCursor),
      textBeforeCursor = this._textLines[lineIndex].slice(0, charIndex),
      missingNewlineOffset = this.missingNewlineOffset(lineIndex - 1);
    // return a negative offset
    return (
      -this._textLines[lineIndex - 1].length +
      indexOnOtherLine -
      textBeforeCursor.length +
      (1 - missingNewlineOffset)
    );
  },

  /**
   * Gets start offset of a selection
   * @param {Event} e Event object
   * @param {Boolean} isRight
   * @return {Number}
   */
  getDownCursorOffset: function (e, isRight) {
    var selectionProp = this._getSelectionForOffset(e, isRight),
      cursorLocation = this.get2DCursorLocation(selectionProp),
      lineIndex = cursorLocation.lineIndex;
    // if on last line, down cursor goes to end of line
    if (lineIndex === this._textLines.length - 1 || e.metaKey || e.keyCode === 34) {
      // move to the end of a text
      return this._text.length - selectionProp;
    }
    var charIndex = cursorLocation.charIndex,
      widthBeforeCursor = this._getWidthBeforeCursor(lineIndex, charIndex),
      indexOnOtherLine = this._getIndexOnLine(lineIndex + 1, widthBeforeCursor),
      textAfterCursor = this._textLines[lineIndex].slice(charIndex);
    return (
      textAfterCursor.length + indexOnOtherLine + 1 + this.missingNewlineOffset(lineIndex)
    );
  },

  /**
   * Moves cursor down
   * @param {Event} e Event object
   */
  moveCursorDown: function (e) {
    if (
      this.selectionStart >= this._text.length &&
      this.selectionEnd >= this._text.length
    ) {
      return;
    }
    this._moveCursorUpOrDown('Down', e);
  },

  /**
   * Moves cursor up
   * @param {Event} e Event object
   */
  moveCursorUp: function (e) {
    if (this.selectionStart === 0 && this.selectionEnd === 0) {
      return;
    }
    this._moveCursorUpOrDown('Up', e);
  },

  /**
   * Moves cursor up or down, fires the events
   * @param {String} direction 'Up' or 'Down'
   * @param {Event} e Event object
   */
  _moveCursorUpOrDown: function (direction, e) {
    // getUpCursorOffset
    // getDownCursorOffset
    const action = 'get' + direction + 'CursorOffset';
    const offset = this[action](e, this._selectionDirection === 'right');
    if (e.shiftKey) {
      this.moveCursorWithShift(offset);
    } else {
      this.moveCursorWithoutShift(offset);
    }
    if (offset !== 0) {
      this.setSelectionInBoundaries();
      this.abortCursorAnimation();
      this._currentCursorOpacity = 1;
      this.initDelayedCursor();
      this._fireSelectionChanged();
      this._updateTextarea();
    }
  },

  /**
   * Moves cursor with shift
   * @param {Number} offset
   */
  moveCursorWithShift: function (offset) {
    const newSelection =
      this._selectionDirection === 'left'
        ? this.selectionStart + offset
        : this.selectionEnd + offset;
    this.setSelectionStartEndWithShift(
      this.selectionStart,
      this.selectionEnd,
      newSelection
    );
    return offset !== 0;
  },

  /**
   * Moves cursor up without shift
   * @param {Number} offset
   */
  moveCursorWithoutShift: function (offset) {
    if (offset < 0) {
      this.selectionStart += offset;
      this.selectionEnd = this.selectionStart;
    } else {
      this.selectionEnd += offset;
      this.selectionStart = this.selectionEnd;
    }
    return offset !== 0;
  },

  /**
   * Moves cursor left
   * @param {Event} e Event object
   */
  moveCursorLeft: function (e) {
    if (this.selectionStart === 0 && this.selectionEnd === 0) {
      return;
    }
    this._moveCursorLeftOrRight('Left', e);
  },

  /**
   * @private
   * @return {Boolean} true if a change happened
   */
  _move: function (e, prop, direction) {
    var newValue;
    if (e.altKey) {
      newValue = this['findWordBoundary' + direction](this[prop]);
    } else if (e.metaKey || e.keyCode === 35 || e.keyCode === 36) {
      newValue = this['findLineBoundary' + direction](this[prop]);
    } else {
      this[prop] += direction === 'Left' ? -1 : 1;
      return true;
    }
    if (typeof newValue !== undefined && this[prop] !== newValue) {
      this[prop] = newValue;
      return true;
    }
  },

  /**
   * @private
   */
  _moveLeft: function (e, prop) {
    return this._move(e, prop, 'Left');
  },

  /**
   * @private
   */
  _moveRight: function (e, prop) {
    return this._move(e, prop, 'Right');
  },

  /**
   * Moves cursor left without keeping selection
   * @param {Event} e
   */
  moveCursorLeftWithoutShift: function (e) {
    var change = true;
    this._selectionDirection = 'left';

    // only move cursor when there is no selection,
    // otherwise we discard it, and leave cursor on same place
    if (this.selectionEnd === this.selectionStart && this.selectionStart !== 0) {
      change = this._moveLeft(e, 'selectionStart');
    }
    this.selectionEnd = this.selectionStart;
    return change;
  },

  /**
   * Moves cursor left while keeping selection
   * @param {Event} e
   */
  moveCursorLeftWithShift: function (e) {
    if (
      this._selectionDirection === 'right' &&
      this.selectionStart !== this.selectionEnd
    ) {
      return this._moveLeft(e, 'selectionEnd');
    } else if (this.selectionStart !== 0) {
      this._selectionDirection = 'left';
      return this._moveLeft(e, 'selectionStart');
    }
  },

  /**
   * Moves cursor right
   * @param {Event} e Event object
   */
  moveCursorRight: function (e) {
    if (
      this.selectionStart >= this._text.length &&
      this.selectionEnd >= this._text.length
    ) {
      return;
    }
    this._moveCursorLeftOrRight('Right', e);
  },

  /**
   * Moves cursor right or Left, fires event
   * @param {String} direction 'Left', 'Right'
   * @param {Event} e Event object
   */
  _moveCursorLeftOrRight: function (direction, e) {
    var actionName = 'moveCursor' + direction + 'With';
    this._currentCursorOpacity = 1;

    if (e.shiftKey) {
      actionName += 'Shift';
    } else {
      actionName += 'outShift';
    }
    if (this[actionName](e)) {
      this.abortCursorAnimation();
      this.initDelayedCursor();
      this._fireSelectionChanged();
      this._updateTextarea();
    }
  },

  /**
   * Moves cursor right while keeping selection
   * @param {Event} e
   */
  moveCursorRightWithShift: function (e) {
    if (
      this._selectionDirection === 'left' &&
      this.selectionStart !== this.selectionEnd
    ) {
      return this._moveRight(e, 'selectionStart');
    } else if (this.selectionEnd !== this._text.length) {
      this._selectionDirection = 'right';
      return this._moveRight(e, 'selectionEnd');
    }
  },

  /**
   * Moves cursor right without keeping selection
   * @param {Event} e Event object
   */
  moveCursorRightWithoutShift: function (e) {
    var changed = true;
    this._selectionDirection = 'right';

    if (this.selectionStart === this.selectionEnd) {
      changed = this._moveRight(e, 'selectionStart');
      this.selectionEnd = this.selectionStart;
    } else {
      this.selectionStart = this.selectionEnd;
    }
    return changed;
  },

  /**
   * Set the selectionStart and selectionEnd according to the new position of cursor
   * mimic the key - mouse navigation when shift is pressed.
   */
  setSelectionStartEndWithShift: function (start, end, newSelection) {
    if (newSelection <= start) {
      if (end === start) {
        this._selectionDirection = 'left';
      } else if (this._selectionDirection === 'right') {
        this._selectionDirection = 'left';
        this.selectionEnd = start;
      }
      this.selectionStart = newSelection;
    } else if (newSelection > start && newSelection < end) {
      if (this._selectionDirection === 'right') {
        this.selectionEnd = newSelection;
      } else {
        this.selectionStart = newSelection;
      }
    } else {
      // newSelection is > selection start and end
      if (end === start) {
        this._selectionDirection = 'right';
      } else if (this._selectionDirection === 'left') {
        this._selectionDirection = 'right';
        this.selectionStart = end;
      }
      this.selectionEnd = newSelection;
    }
  },

  setSelectionInBoundaries: function () {
    var length = this.text.length;
    if (this.selectionStart > length) {
      this.selectionStart = length;
    } else if (this.selectionStart < 0) {
      this.selectionStart = 0;
    }
    if (this.selectionEnd > length) {
      this.selectionEnd = length;
    } else if (this.selectionEnd < 0) {
      this.selectionEnd = 0;
    }
  },

  /**
   * Initializes delayed cursor
   */
  initDelayedCursor: function (restart) {
    var _this = this,
      delay = restart ? 0 : this.cursorDelay;

    this.abortCursorAnimation();
    this._currentCursorOpacity = 1;
    this._cursorTimeout2 = setTimeout(function () {
      _this._tick();
    }, delay);
  },

  /**
   * Detect if a line has a linebreak and so we need to account for it when moving
   * and counting style.
   * @return Number
   */
  missingNewlineOffset: function (lineIndex) {
    if (this.splitByGrapheme) {
      return this.isEndOfWrapping(lineIndex) ? 1 : 0;
    }
    return 1;
  },

  /**
   * Returns 2d representation (lineIndex and charIndex) of cursor (or selection start)
   * @param {Number} [selectionStart] Optional index. When not given, current selectionStart is used.
   * @param {Boolean} [skipWrapping] consider the location for unwrapped lines. useful to manage styles.
   */
  get2DCursorLocation: function (selectionStart, skipWrapping) {
    if (typeof selectionStart === 'undefined') {
      selectionStart = this.selectionStart;
    }
    const lines = skipWrapping ? this._unwrappedTextLines : this._textLines;
    const len = lines.length;
    let i = 0;
    for (; i < len; i++) {
      if (selectionStart <= lines[i].length) {
        return {
          lineIndex: i,
          charIndex: selectionStart,
        };
      }
      selectionStart -= lines[i].length + this.missingNewlineOffset(i);
    }
    return {
      lineIndex: i - 1,
      charIndex:
        lines[i - 1].length < selectionStart ? lines[i - 1].length : selectionStart,
    };
  },

  /**
   * Returns cursor boundaries (left, top, leftOffset, topOffset)
   * @private
   * @param {Array} chars Array of characters
   * @param {String} typeOfBoundaries
   */
  _getCursorBoundaries: function (position) {
    // left/top are left/top of entire text box
    // leftOffset/topOffset are offset from that left/top point of a text box

    if (typeof position === 'undefined') {
      position = this.selectionStart;
    }

    var left = this._getLeftOffset(),
      top = this._getTopOffset(),
      offsets = this._getCursorBoundariesOffsets(position);

    return {
      left: left,
      top: top,
      leftOffset: offsets.left,
      topOffset: offsets.top,
    };
  },

  /**
   * @private
   */
  _getCursorBoundariesOffsets: function (position) {
    if (this.cursorOffsetCache && 'top' in this.cursorOffsetCache) {
      return this.cursorOffsetCache;
    }
    var lineLeftOffset,
      lineIndex,
      charIndex,
      topOffset = 0,
      leftOffset = 0,
      boundaries,
      cursorPosition = this.get2DCursorLocation(position);
    charIndex = cursorPosition.charIndex;
    lineIndex = cursorPosition.lineIndex;
    for (let i = 0; i < lineIndex; i++) {
      topOffset += this.getHeightOfLine(i);
    }
    lineLeftOffset = this._getLineLeftOffset(lineIndex);
    let bound = this.__charBounds[lineIndex][charIndex];
    bound && (leftOffset = bound.left);
    if (this.charSpacing !== 0 && charIndex === this._textLines[lineIndex].length) {
      leftOffset -= this._getWidthOfCharSpacing();
    }
    boundaries = {
      top: topOffset,
      left: lineLeftOffset + (leftOffset > 0 ? leftOffset : 0),
    };
    this.cursorOffsetCache = boundaries;
    return this.cursorOffsetCache;
  },

  /**
   * @private
   * @return {Number} Left offset
   */
  _getLeftOffset: function () {
    return -this.textBoxWidth / 2;
  },

  /**
   * @private
   * @return {Number} Top offset
   */
  _getTopOffset: function () {
    return -this.textBoxHeight / 2;
  },

  _getActualTextBoxWidth: function () {
    const zoom = this.canvas ? this.canvas.getZoom() : 1;
    return this.getObjectScaling().scaleX * zoom * this.textBoxWidth;
  },

  _getActualTextBoxHeight: function () {
    const zoom = this.canvas ? this.canvas.getZoom() : 1;
    return this.getObjectScaling().scaleY * zoom * this.textBoxHeight;
  },

  /**
   * @private
   * @return {Object} style contains style for hiddenTextarea
   */
  _calcTextareaPosition: function () {
    if (!this.canvas) {
      return { x: 1, y: 1 };
    }
    var desiredPosition = this.inCompositionMode
        ? this.compositionStart
        : this.selectionStart,
      boundaries = this._getCursorBoundaries(desiredPosition),
      cursorLocation = this.get2DCursorLocation(desiredPosition),
      lineIndex = cursorLocation.lineIndex,
      charIndex = cursorLocation.charIndex,
      charHeight =
        this.getValueOfPropertyAt(lineIndex, charIndex, 'fontSize') * this.lineHeight,
      leftOffset = boundaries.leftOffset,
      m = this.calcTransformMatrix(),
      p = {
        x: boundaries.left + leftOffset,
        y: boundaries.top + boundaries.topOffset + charHeight,
      },
      retinaScaling = this.canvas.getRetinaScaling(),
      upperCanvas = this.canvas.upperCanvasEl,
      upperCanvasWidth = upperCanvas.width / retinaScaling,
      upperCanvasHeight = upperCanvas.height / retinaScaling,
      maxWidth = upperCanvasWidth - charHeight,
      maxHeight = upperCanvasHeight - charHeight,
      scaleX = upperCanvas.clientWidth / upperCanvasWidth,
      scaleY = upperCanvas.clientHeight / upperCanvasHeight;

    p = fabric.util.transformPoint(p, m);
    p = fabric.util.transformPoint(p, this.canvas.viewportTransform);
    p.x *= scaleX;
    p.y *= scaleY;
    if (p.x < 0) {
      p.x = 0;
    }
    if (p.x > maxWidth) {
      p.x = maxWidth;
    }
    if (p.y < 0) {
      p.y = 0;
    }
    if (p.y > maxHeight) {
      p.y = maxHeight;
    }

    // add canvas offset on document
    p.x += this.canvas._offset.left;
    p.y += this.canvas._offset.top;

    return {
      left: p.x + 'px',
      top: p.y + 'px',
      fontSize: charHeight + 'px',
      charHeight: charHeight,
    };
  },

  /**
   * Prepare and clean the contextTop
   */
  clearContextTop: function (skipRestore) {
    if (!this.isEditing || !this.canvas || !this.canvas.contextTop) {
      return;
    }
    const ctx = this.canvas.contextTop;
    const v = this.canvas.viewportTransform;
    ctx.save();
    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    this.transform(ctx);

    this._clearTextArea(ctx);
    skipRestore || ctx.restore();
  },

  _clearTextArea: function (ctx) {
    // we add 4 pixel, to be sure to do not leave any pixel out
    var width = this.textBoxWidth + 4,
      height = this.textBoxHeight + 4;
    ctx.clearRect(-width / 2, -height / 2, width, height);
  },

  _renderTextBoxSelectionOrCursor: function () {
    if (!this.isEditing || !this.canvas || !this.canvas.contextTop) {
      return;
    }

    const boundaries = this._getCursorBoundaries();
    const ctx = this.canvas.contextTop;
    this.clearContextTop(true);

    if (this.selectionStart === this.selectionEnd) {
      this._renderTextBoxCursor(boundaries, ctx);
    } else {
      this._renderTextBoxSelection(boundaries, ctx);
    }

    ctx.restore();
  },

  _renderTextBoxCursor: function (boundaries, ctx) {
    const cursorLocation = this.get2DCursorLocation();
    const lineIndex = cursorLocation.lineIndex;
    const charIndex = cursorLocation.charIndex > 0 ? cursorLocation.charIndex - 1 : 0;
    const charHeight = this.getValueOfPropertyAt(lineIndex, charIndex, 'fontSize');
    const multiplier = this.canvas.getZoom();
    const cursorWidth = this.cursorWidth / multiplier;
    const dy = this.getValueOfPropertyAt(lineIndex, charIndex, 'deltaY');
    let topOffset = boundaries.topOffset;

    topOffset +=
      ((1 - this._fontSizeFraction) * this.getHeightOfLine(lineIndex)) / this.lineHeight -
      charHeight * (1 - this._fontSizeFraction);

    if (this.inCompositionMode) {
      this._renderTextBoxSelection(boundaries, ctx);
    }

    ctx.fillStyle =
      this.cursorColor || this.getValueOfPropertyAt(lineIndex, charIndex, 'fill');
    ctx.globalAlpha = this._isDragging ? 1 : this._currentCursorOpacity;

    ctx.save();
    const { scaleX, scaleY } = this.getObjectScaling();
    ctx.scale(1 / scaleX, 1 / scaleY);
    ctx.fillRect(
      boundaries.left + boundaries.leftOffset - cursorWidth / 2,
      topOffset + boundaries.top + dy,
      cursorWidth,
      charHeight
    );

    ctx.restore();
  },

  _renderTextBoxSelection: function (boundaries, ctx) {
    ctx.save();
    const { scaleX, scaleY } = this.getObjectScaling();
    ctx.scale(1 / scaleX, 1 / scaleY);

    const selectionStart = this.inCompositionMode
        ? this.hiddenTextarea.selectionStart
        : this.selectionStart,
      selectionEnd = this.inCompositionMode
        ? this.hiddenTextarea.selectionEnd
        : this.selectionEnd,
      isJustify = this.textAlign.indexOf('justify') !== -1,
      start = this.get2DCursorLocation(selectionStart),
      end = this.get2DCursorLocation(selectionEnd),
      startLine = start.lineIndex,
      endLine = end.lineIndex,
      startChar = start.charIndex < 0 ? 0 : start.charIndex,
      endChar = end.charIndex < 0 ? 0 : end.charIndex;
    for (let i = startLine; i <= endLine; i++) {
      let lineOffset = this._getLineLeftOffset(i) || 0,
        lineHeight = this.getHeightOfLine(i),
        realLineHeight = 0,
        boxStart = 0,
        boxEnd = 0;
      if (i === startLine) {
        boxStart = this.__charBounds[startLine][startChar].left;
      }
      if (i >= startLine && i < endLine) {
        boxEnd =
          isJustify && !this.isEndOfWrapping(i) ? this.width : this.getLineWidth(i) || 5; // WTF is this 5?
      } else if (i === endLine) {
        if (endChar === 0) {
          boxEnd = this.__charBounds[endLine][endChar].left;
        } else {
          let charSpacing = this._getWidthOfCharSpacing();
          boxEnd =
            this.__charBounds[endLine][endChar - 1].left +
            this.__charBounds[endLine][endChar - 1].width -
            charSpacing;
        }
      }
      realLineHeight = lineHeight;
      if (this.lineHeight < 1 || (i === endLine && this.lineHeight > 1)) {
        lineHeight /= this.lineHeight;
      }
      if (this.inCompositionMode) {
        ctx.fillStyle = this.compositionColor || 'black';
        ctx.fillRect(
          boundaries.left + lineOffset + boxStart,
          boundaries.top + boundaries.topOffset + lineHeight,
          boxEnd - boxStart,
          1
        );
      } else {
        ctx.fillStyle = this.selectionColor;
        ctx.fillRect(
          boundaries.left + lineOffset + boxStart,
          boundaries.top + boundaries.topOffset,
          boxEnd - boxStart,
          lineHeight
        );
      }

      boundaries.topOffset += realLineHeight;
    }

    ctx.restore();
  },

  /**
   * @private
   */
  _animateCursor: function (obj, targetOpacity, duration, completeMethod) {
    var tickState;

    tickState = {
      isAborted: false,
      abort: function () {
        this.isAborted = true;
      },
    };

    obj.animate('_currentCursorOpacity', targetOpacity, {
      duration: duration,
      onComplete: function () {
        if (!tickState.isAborted) {
          obj[completeMethod]();
        }
      },
      onChange: function () {
        // we do not want to animate a selection, only cursor
        if (obj.canvas && obj.selectionStart === obj.selectionEnd) {
          obj._renderTextBoxSelectionOrCursor();
        }
      },
      abort: function () {
        return tickState.isAborted;
      },
    });
    return tickState;
  },

  /**
   * @private
   */
  _tick: function () {
    this._currentTickState = this._animateCursor(
      this,
      1,
      this.cursorDuration,
      '_onTickComplete'
    );
  },

  /**
   * @private
   */
  _onTickComplete: function () {
    var _this = this;

    if (this._cursorTimeout1) {
      clearTimeout(this._cursorTimeout1);
    }
    this._cursorTimeout1 = setTimeout(function () {
      _this._currentTickCompleteState = _this._animateCursor(
        _this,
        0,
        this.cursorDuration / 2,
        '_tick'
      );
    }, 100);
  },

  /**
   * Enters editing state
   * @return {fabric.IText} thisArg
   * @chainable
   */
  enterEditing: function (e) {
    if (this.isEditing || !this.editable) {
      return;
    }

    if (this.canvas) {
      this.canvas.calcOffset();
    }

    this.isEditing = true;
    this.canvas.isEditing = true;

    this.initHiddenTextarea(e);
    this.hiddenTextarea.focus();
    this.hiddenTextarea.value = this.text;
    this._updateTextarea();
    this._textBeforeEdit = this.text;

    this._tick();
    this.fire('editing:entered');
    this._fireSelectionChanged();
    if (!this.canvas) {
      return this;
    }
    this.canvas.fire('text:editing:entered', { target: this });
    this.canvas.requestRenderAll();
    return this;
  },

  /**
   * Selects entire text
   * @return {fabric.IText} thisArg
   * @chainable
   */
  selectAll: function () {
    this.selectionStart = 0;
    this.selectionEnd = this._text.length;
    this._fireSelectionChanged();
    this._updateTextarea();
    return this;
  },

  /**
   * @private
   */
  _updateTextarea: function () {
    this.cursorOffsetCache = {};
    if (!this.hiddenTextarea) {
      return;
    }
    if (!this.inCompositionMode) {
      var newSelection = this.fromGraphemeToStringSelection(
        this.selectionStart,
        this.selectionEnd,
        this._text
      );
      this.hiddenTextarea.selectionStart = newSelection.selectionStart;
      this.hiddenTextarea.selectionEnd = newSelection.selectionEnd;
    }
    this.updateTextareaPosition();
  },

  /**
   * convert from fabric to textarea values
   */
  fromGraphemeToStringSelection: function (start, end, _text) {
    const smallerTextStart = _text.slice(0, start),
      graphemeStart = smallerTextStart.join('').length;
    if (start === end) {
      return { selectionStart: graphemeStart, selectionEnd: graphemeStart };
    }
    const smallerTextEnd = _text.slice(start, end),
      graphemeEnd = smallerTextEnd.join('').length;
    return { selectionStart: graphemeStart, selectionEnd: graphemeStart + graphemeEnd };
  },

  /**
   * Aborts cursor animation and clears all timeouts
   */
  abortCursorAnimation: function () {
    var shouldClear = this._currentTickState || this._currentTickCompleteState,
      canvas = this.canvas;
    this._currentTickState && this._currentTickState.abort();
    this._currentTickCompleteState && this._currentTickCompleteState.abort();

    clearTimeout(this._cursorTimeout1);
    clearTimeout(this._cursorTimeout2);

    this._currentCursorOpacity = 0;
    // to clear just itext area we need to transform the context
    // it may not be worth it

    if (shouldClear && canvas) {
      canvas.clearContext(canvas.contextTop || canvas.contextContainer);
    }
  },

  /**
   * Exits from editing state
   * @return {fabric.IText} thisArg
   * @chainable
   */
  exitEditing: function () {
    const isTextChanged = this._textBeforeEdit !== this.text;
    const hiddenTextarea = this.hiddenTextarea;
    this.isEditing = false;
    this.canvas.isEditing = false;

    this.selectionEnd = this.selectionStart;

    if (hiddenTextarea) {
      hiddenTextarea.blur && hiddenTextarea.blur();
      hiddenTextarea.parentNode && hiddenTextarea.parentNode.removeChild(hiddenTextarea);
    }
    this.hiddenTextarea = null;
    this.abortCursorAnimation();
    this._currentCursorOpacity = 0;
    if (this._shouldClearDimensionCache()) {
      this.initDimensions();
      this.setCoords();
    }
    this.fire('editing:exited');
    isTextChanged && this.fire('modified');
    if (this.canvas) {
      this.canvas.fire('text:editing:exited', { target: this });
      isTextChanged && this.canvas.fire('object:modified', { target: this });
      this.canvas.requestRenderAll();
    }
    return this;
  },

  /**
   * Generate an object that translates the style object so that it is
   * broken up by visual lines (new lines and automatic wrapping).
   * The original text styles object is broken up by actual lines (new lines only),
   * which is only sufficient for Text / IText
   * @private
   */
  _generateStyleMap: function (textInfo) {
    let realLineCount = 0,
      realLineCharCount = 0,
      charCount = 0,
      map = {};

    for (let i = 0; i < textInfo.graphemeLines.length; i++) {
      if (textInfo.graphemeText[charCount] === '\n' && i > 0) {
        realLineCharCount = 0;
        charCount++;
        realLineCount++;
      } else if (
        !this.splitByGrapheme &&
        this._reSpaceAndTab.test(textInfo.graphemeText[charCount]) &&
        i > 0
      ) {
        // this case deals with space's that are removed from end of lines when wrapping
        realLineCharCount++;
        charCount++;
      }

      map[i] = { line: realLineCount, offset: realLineCharCount };

      charCount += textInfo.graphemeLines[i].length;
      realLineCharCount += textInfo.graphemeLines[i].length;
    }

    return map;
  },

  /**
   * Fires the even of selection changed
   * @private
   */
  _fireSelectionChanged: function () {
    this.fire('selection:changed');
    this.canvas && this.canvas.fire('text:selection:changed', { target: this });
  },

  /**
   * Changes cursor location in a text depending on passed pointer (x/y) object
   * @param {Event} e Event object
   */
  setCursorByClick: function (e) {
    const newSelection = this.getSelectionStartFromPointer(e);
    const start = this.selectionStart;
    const end = this.selectionEnd;
    if (e.shiftKey) {
      this.setSelectionStartEndWithShift(start, end, newSelection);
    } else {
      this.selectionStart = newSelection;
      this.selectionEnd = newSelection;
    }
    if (this.isEditing) {
      this._fireSelectionChanged();
      this._updateTextarea();
    }
  },

  /**
   * Returns index of a character corresponding to where an object was clicked
   * @param {Event} e Event object
   * @return {Number} Index of a character
   */
  getSelectionStartFromPointer: function (e) {
    const mouseOffset = {
      x: this.getLocalPointer(e).x + this.textBoxWidth / 2,
      y: this.getLocalPointer(e).y + this.textBoxHeight / 2,
    };
    const topOffset = this.textBoxHeight / 2 + this._getTopOffset();
    let prevWidth = 0;
    let width = 0;
    let height = 0;
    let charIndex = 0;
    let lineIndex = 0;
    let lineLeftOffset;
    let line;

    for (let i = 0, len = this._textLines.length; i < len; i++) {
      if (height <= mouseOffset.y - topOffset) {
        height += this.getHeightOfLine(i);
        lineIndex = i;
        if (i > 0) {
          charIndex += this._textLines[i - 1].length + this.missingNewlineOffset(i - 1);
        }
      } else {
        break;
      }
    }
    lineLeftOffset = this._getLineLeftOffset(lineIndex);
    width = lineLeftOffset;
    line = this._textLines[lineIndex];
    let jlen = line.length;
    for (let j = 0; j < jlen; j++) {
      prevWidth = width;
      // i removed something about flipX here, check.
      width += this.__charBounds[lineIndex][j].kernedWidth;
      if (width <= mouseOffset.x) {
        charIndex++;
      } else {
        break;
      }
    }

    return this._getNewSelectionStartFromOffset(
      mouseOffset,
      prevWidth,
      width,
      charIndex,
      jlen
    );
  },

  /**
   * Returns coordinates of a pointer relative to an object center
   * @param {Event} e Event to operate upon
   * @param {Object} [pointer] Pointer to operate upon (instead of event)
   * @return {Object} Coordinates of a pointer (x, y)
   */
  getLocalPointer: function (e, pointer) {
    pointer = pointer || this.canvas.getPointer(e);
    let pClicked = new fabric.Point(pointer.x, pointer.y);
    const objectCenterPoint = this.getCenterPoint();

    if (this.angle) {
      pClicked = fabric.util.rotatePoint(
        pClicked,
        objectCenterPoint,
        fabric.util.degreesToRadians(-this.angle)
      );
    }
    return {
      x: pClicked.x - objectCenterPoint.x,
      y: pClicked.y - objectCenterPoint.y,
    };
  },

  /**
   * @private
   */
  _getNewSelectionStartFromOffset: function (mouseOffset, prevWidth, width, index, jlen) {
    // we need Math.abs because when width is after the last char, the offset is given as 1, while is 0
    var distanceBtwLastCharAndCursor = mouseOffset.x - prevWidth,
      distanceBtwNextCharAndCursor = width - mouseOffset.x,
      offset =
        distanceBtwNextCharAndCursor > distanceBtwLastCharAndCursor ||
        distanceBtwNextCharAndCursor < 0
          ? 0
          : 1,
      newSelectionStart = index + offset;
    // if object is horizontally flipped, mirror cursor location from the end
    if (this.flipX) {
      newSelectionStart = jlen - newSelectionStart;
    }

    if (newSelectionStart > this._text.length) {
      newSelectionStart = this._text.length;
    }

    return newSelectionStart;
  },
});

ConnectionLine.fromObject = (options, callback) => {
  return callback(new ConnectionLine(options));
};

window.fabric.ConnectionLine = ConnectionLine;

export default ConnectionLine;
