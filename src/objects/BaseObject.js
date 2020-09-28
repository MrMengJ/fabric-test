import { fabric } from 'fabric';
import { forEach, isEmpty } from 'lodash';

import { DIRECTION } from '../constants/shapes';

import Anchors from './Anchors';

let degreesToRadians = fabric.util.degreesToRadians;
let multiplyMatrices = fabric.util.multiplyTransformMatrices;

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

  /**
   * Size of object's anchor corners (in pixels)
   * @type Number
   * @default
   */
  anchorSize: 13,

  /**
   * Size of object's anchor corners when touch interaction is detected
   * @type Number
   * @default
   */
  touchAnchorSize: 24,

  /**
   * Object connection anchors
   * @type Array
   * @default
   */
  anchors: [
    {
      x: 0,
      y: -0.5,
    },
    {
      x: 0.5,
      y: 0,
    },
    {
      x: 0,
      y: 0.5,
    },
    {
      x: -0.5,
      y: 0,
    },
  ],

  /**
   * Constructor
   * @param {Object} [options] Options object
   */
  initialize: function (options) {
    this.callSuper('initialize', options);
    this._initAnchors();
    // this._initCommonBehavior();
  },

  _initAnchors: function () {
    if (isEmpty(this.anchors)) {
      return;
    }

    const result = {};
    forEach(this.anchors, (item, index) => {
      const key = `anchor-${index}`;
      result[key] = new Anchors({
        x: item.x,
        y: item.y,
      });
    });
    this.anchors = result;
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

    this.callSuper('_render', ctx);
    this._renderAnchors(ctx);
  },

  _renderAnchors: function (ctx, styleOverride) {
    if (!this.canvas.connectionMode || isEmpty(this.anchors)) {
      return;
    }

    let vpt = this.getViewportTransform(),
      matrix = this.calcTransformMatrix(),
      options;
    matrix = fabric.util.multiplyTransformMatrices(vpt, matrix);
    options = fabric.util.qrDecompose(matrix);
    ctx.save();
    ctx.translate(options.translateX, options.translateY);
    ctx.lineWidth = 1 * this.borderScaleFactor;
    if (!this.group) {
      ctx.globalAlpha = this.isMoving ? this.borderOpacityWhenMoving : 1;
    }
    this._drawAnchors(ctx, styleOverride);
    ctx.restore();
  },

  _drawAnchors: function (ctx) {
    ctx.save();
    ctx.setTransform(
      this.canvas.getRetinaScaling(),
      0,
      0,
      this.canvas.getRetinaScaling(),
      0,
      0
    );
    this._setAnchorCoords();
    this.forEachAnchor(function (anchor, key, fabricObject) {
      anchor.render(
        ctx,
        fabricObject.anchorCoords[key].x,
        fabricObject.anchorCoords[key].y,
        fabricObject
      );
    });
    ctx.restore();

    return this;
  },

  forEachAnchor: function (fn) {
    for (let i in this.anchors) {
      fn(this.anchors[i], i, this);
    }
  },

  _calcAnchorCoords: function () {
    let rotateMatrix = this._calcRotateMatrix(),
      translateMatrix = this._calcTranslateMatrix(),
      vpt = this.getViewportTransform(),
      startMatrix = multiplyMatrices(vpt, translateMatrix),
      finalMatrix = multiplyMatrices(startMatrix, rotateMatrix),
      dim = this._calculateCurrentDimensions(),
      coords = {};
    finalMatrix = multiplyMatrices(finalMatrix, [1 / vpt[0], 0, 0, 1 / vpt[3], 0, 0]);

    this.forEachAnchor(function (anchor, key, fabricObject) {
      coords[key] = anchor.positionHandler(dim, finalMatrix, fabricObject);
    });

    return coords;
  },

  _setAnchorCoords: function () {
    this.anchorCoords = this._calcAnchorCoords();
    this._setAnchorCornerCoords();
  },

  /**
   * @private
   */
  _setAnchorCornerCoords: function () {
    const extraScope = 7;
    let coords = this.anchorCoords,
      newTheta = degreesToRadians(45 - this.angle),
      cosTheta = fabric.util.cos(newTheta),
      sinTheta = fabric.util.sin(newTheta),
      /* Math.sqrt(2 * Math.pow(this.cornerSize, 2)) / 2, */
      /* 0.707106 stands for sqrt(2)/2 */
      cornerHypotenuse = (this.anchorSize + extraScope) * 0.707106,
      touchHypotenuse = (this.touchAnchorSize + extraScope) * 0.707106,
      cosHalfOffset = cornerHypotenuse * cosTheta,
      sinHalfOffset = cornerHypotenuse * sinTheta,
      touchCosHalfOffset = touchHypotenuse * cosTheta,
      touchSinHalfOffset = touchHypotenuse * sinTheta,
      x,
      y;

    for (let anchor in coords) {
      x = coords[anchor].x;
      y = coords[anchor].y;
      coords[anchor].corner = {
        tl: {
          x: x - sinHalfOffset,
          y: y - cosHalfOffset,
        },
        tr: {
          x: x + cosHalfOffset,
          y: y - sinHalfOffset,
        },
        bl: {
          x: x - cosHalfOffset,
          y: y + sinHalfOffset,
        },
        br: {
          x: x + sinHalfOffset,
          y: y + cosHalfOffset,
        },
      };
      coords[anchor].touchCorner = {
        tl: {
          x: x - touchSinHalfOffset,
          y: y - touchCosHalfOffset,
        },
        tr: {
          x: x + touchCosHalfOffset,
          y: y - touchSinHalfOffset,
        },
        bl: {
          x: x - touchCosHalfOffset,
          y: y + touchSinHalfOffset,
        },
        br: {
          x: x + touchSinHalfOffset,
          y: y + touchCosHalfOffset,
        },
      };
    }
  },

  _findAnchor: function (pointer) {
    // must not return an hovered corner.
    if (!this.canvas || isEmpty(this.anchorCoords)) {
      return false;
    }

    let ex = pointer.x,
      ey = pointer.y,
      xPoints,
      lines,
      keys = Object.keys(this.anchorCoords),
      j = keys.length - 1,
      i;

    // cycle in reverse order so we pick first the one on top
    for (; j >= 0; j--) {
      i = keys[j];
      lines = this._getImageLines(this.anchorCoords[i].corner);

      xPoints = this._findCrossPoints({ x: ex, y: ey }, lines);
      if (xPoints !== 0 && xPoints % 2 === 1) {
        return i;
      }
    }
    return false;
  },
});

export default BaseObject;
