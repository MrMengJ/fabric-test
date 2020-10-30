import { fabric } from 'fabric';
import { filter, forEach, includes, isEqual, max } from 'lodash';
import memoizeOne from 'memoize-one';

import { CAN_NOT_CONNECTABLE_OBJECTS } from './constants';

class ConnectionLineHandler {
  constructor(Handler) {
    this.handler = Handler;
    this.canvas = Handler.canvas;
    this.currentConnectionLine = null;
    this.pointer = null;
    this.absolutePointer = null;
    this.observeCanvasRender();
  }

  getConnectableObjects() {
    const allObjects = this.canvas.getObjects();
    return filter(allObjects, (item) => {
      return !includes(CAN_NOT_CONNECTABLE_OBJECTS, item.type);
    });
  }

  linkAnchors(obj, point = this.absolutePointer) {
    let linkPoint = null;
    const extraSpace = max([obj.anchorSize / 2, 10]);
    const pointerArea = {
      x: point.x - extraSpace,
      y: point.y - extraSpace,
      w: extraSpace * 2,
      h: extraSpace * 2,
    };
    const anchorsCoords = obj.getAbsoluteAnchorsCoords();
    forEach(anchorsCoords, (item) => {
      const anchorCoords = { x: item.x, y: item.y };
      if (this.pointInRect({ x: anchorCoords.x, y: anchorCoords.y }, pointerArea)) {
        linkPoint = anchorCoords;
        return false;
      }
    });

    if (!linkPoint) {
      if (
        this.canvas.connectType === 'changeToPoint' &&
        this.currentConnectionLine.toTargetId
      ) {
        this.currentConnectionLine.toTargetId = null;
      }
      if (
        this.canvas.connectType === 'changeFromPoint' &&
        this.currentConnectionLine.fromTargetId
      ) {
        this.currentConnectionLine.fromTargetId = null;
      }
    }

    if (linkPoint) {
      if (this.canvas.connectType === 'changeFromPoint') {
        this.currentConnectionLine.fromTargetId = obj.id;
        this.currentConnectionLine.fromPoint = linkPoint;
        this.currentConnectionLine.updatePoints();
      } else if (this.canvas.connectType === 'changeToPoint') {
        this.currentConnectionLine.toTargetId = obj.id;
        this.currentConnectionLine.toPoint = linkPoint;
        this.currentConnectionLine.updatePoints();
      }
    }

    return !!linkPoint;
  }

  /**
   * Get point invert viewport
   * @param {Array} vpt viewport
   * @param {Object} point Point
   * @return {fabric.Point}
   */
  getPointInvertVpt(vpt, point) {
    return memoizeOne(function (vpt, point) {
      return fabric.util.transformPoint(point, fabric.util.invertTransform(vpt));
    }, isEqual)(vpt, point);
  }

  /**
   * Mouse move handler
   * @param {Object} options
   */
  onMouseMove(options) {
    const { pointer, absolutePointer, target } = options;
    this.currentConnectionLine = target;
    this.pointer = pointer;
    this.absolutePointer = absolutePointer;
    const connectableObjects = this.getConnectableObjects();
    forEach(connectableObjects, (item) => {
      const detectionRectACoords = this.getDetectionRectACoords(item);
      const isInDetectionRange = this.containsPoint(
        this.absolutePointer,
        detectionRectACoords
      );
      if (isInDetectionRange) {
        const hasLinkAnchor = this.linkAnchors(item, absolutePointer);
        if (hasLinkAnchor) {
          return false;
        }

        this.linkToBounding(item);
      }
    });
  }

  linkToBounding(obj) {
    // stroke object edge to make "isPointInPath" method valid
    obj.strokeEdge();
    const linkPoint = this.getLinePointByPosition(this.pointer.x, this.pointer.y);
    const { connectType } = this.canvas;

    if (!linkPoint) {
      if (connectType === 'changeToPoint' && this.currentConnectionLine.toTargetId) {
        this.currentConnectionLine.toTargetId = null;
      }
      if (connectType === 'changeFromPoint' && this.currentConnectionLine.fromTargetId) {
        this.currentConnectionLine.fromTargetId = null;
      }
    }

    if (linkPoint) {
      const absoluteLinkPoint = fabric.util.transformPoint(
        linkPoint,
        fabric.util.invertTransform(this.canvas.viewportTransform)
      );
      if (connectType === 'changeFromPoint') {
        this.currentConnectionLine.fromTargetId = obj.id;
        this.currentConnectionLine.fromPoint = absoluteLinkPoint;
        this.currentConnectionLine.updatePoints();
      } else if (connectType === 'changeToPoint') {
        this.currentConnectionLine.toTargetId = obj.id;
        this.currentConnectionLine.toPoint = absoluteLinkPoint;
        this.currentConnectionLine.updatePoints();
      }
    }
  }

  getLinePointByPosition(x, y, extraSpace = 8) {
    let result = null;
    const pointAngle = this.getPointAngle(x, y, extraSpace);
    const linkPoint = { angle: pointAngle };
    const { contextContainer: ctx } = this.canvas;
    for (let i = 1; i <= extraSpace; i++) {
      linkPoint.x = x + Math.cos(pointAngle) * i;
      linkPoint.y = y + Math.sin(pointAngle) * i;
      if (ctx.isPointInPath(linkPoint.x, linkPoint.y)) {
        result = linkPoint;
        break;
      }
    }
    return result;
  }

  getPointAngle(x, y, extraSpace = 8) {
    const { contextContainer: ctx } = this.canvas;
    const circlePoints = this.getCirclePoints(x, y, extraSpace);

    // add property "inPath"
    forEach(circlePoints, (item) => {
      const { x, y } = item;
      item.inPath = ctx.isPointInPath(x, y);
    });

    const allNotInPath =
      filter(circlePoints, (item) => {
        return item.inPath;
      }) < 0;
    if (allNotInPath) {
      return null;
    }

    let startBoundaryPoint = null,
      endBoundaryPoint = null;
    const pointsLength = circlePoints.length;
    forEach(circlePoints, (item, index) => {
      if (!item.inPath) {
        if (!startBoundaryPoint) {
          let nextPoint = circlePoints[(index + 1 + pointsLength) % pointsLength];
          if (nextPoint.inPath) {
            startBoundaryPoint = nextPoint;
          }
        }

        if (!endBoundaryPoint) {
          let lastPoint = circlePoints[(index - 1 + pointsLength) % pointsLength];
          if (lastPoint.inPath) {
            endBoundaryPoint = lastPoint;
          }
        }

        if (startBoundaryPoint && endBoundaryPoint) {
          return false;
        }
      }
    });

    if (!startBoundaryPoint && !endBoundaryPoint) {
      return null;
    }
    const differences =
      ((Math.PI * 2 + endBoundaryPoint.angle - startBoundaryPoint.angle) %
        (Math.PI * 2)) /
      2;
    return (startBoundaryPoint.angle + differences) % (Math.PI * 2);
  }

  getCirclePoints(x, y, extraSpace) {
    let result = [];
    for (let i = 0; i < 36; i++) {
      const angle = (Math.PI / 18) * i;
      result.push({
        x: x + Math.cos(angle) * extraSpace,
        y: y + Math.sin(angle) * extraSpace,
        angle,
      });
    }
    return result;
  }

  getDetectionRectACoords(object) {
    return this.getObjACoords(object, 10);
  }

  getObjACoords(object, extraSpace = 0) {
    if (!object) {
      return null;
    }
    let finalMatrix;
    if (object.group) {
      finalMatrix = object.calcTransformMatrix();
    } else {
      const translateMatrix = object._calcTranslateMatrix();
      const rotateMatrix = object._calcRotateMatrix();
      finalMatrix = fabric.util.multiplyTransformMatrices(translateMatrix, rotateMatrix);
    }
    const dim = object.group
      ? object._getNonTransformedDimensions()
      : object._getTransformedDimensions();
    const w = dim.x / 2 + extraSpace;
    const h = dim.y / 2 + extraSpace;
    const transformPoint = fabric.util.transformPoint;

    return {
      tl: transformPoint({ x: -w, y: -h }, finalMatrix),
      tr: transformPoint({ x: w, y: -h }, finalMatrix),
      bl: transformPoint({ x: -w, y: h }, finalMatrix),
      br: transformPoint({ x: w, y: h }, finalMatrix),
    };
  }

  containsPoint(point, coords, lines) {
    const theLines = lines || this._getImageLines(coords);
    const xPoints = this._findCrossPoints(point, theLines);
    // if xPoints is odd then point is inside the object
    return xPoints !== 0 && xPoints % 2 === 1;
  }

  pointInRect(point, rect) {
    const { x, y } = point;
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  /**
   * Method that returns an object with the object edges in it, given the coordinates of the corners
   * @private
   * @param {Object} coords Coordinates of the object corners
   */
  _getImageLines(coords) {
    return {
      topline: {
        o: coords.tl,
        d: coords.tr,
      },
      rightline: {
        o: coords.tr,
        d: coords.br,
      },
      bottomline: {
        o: coords.br,
        d: coords.bl,
      },
      leftline: {
        o: coords.bl,
        d: coords.tl,
      },
    };
  }

  /**
   * Helper method to determine how many cross points are between the 4 object edges
   * and the horizontal line determined by a point on canvas
   * @private
   * @param {fabric.Point} point Point to check
   * @param {Object} lines Coordinates of the object being evaluated
   */
  // remove yi, not used but left code here just in case.
  _findCrossPoints(point, lines) {
    let b1,
      b2,
      a1,
      a2,
      xi, // yi,
      xcount = 0,
      iLine;

    for (let lineKey in lines) {
      iLine = lines[lineKey];
      // optimisation 1: line below point. no cross
      if (iLine.o.y < point.y && iLine.d.y < point.y) {
        continue;
      }
      // optimisation 2: line above point. no cross
      if (iLine.o.y >= point.y && iLine.d.y >= point.y) {
        continue;
      }
      // optimisation 3: vertical line case
      if (iLine.o.x === iLine.d.x && iLine.o.x >= point.x) {
        xi = iLine.o.x;
        // yi = point.y;
      }
      // calculate the intersection point
      else {
        b1 = 0;
        b2 = (iLine.d.y - iLine.o.y) / (iLine.d.x - iLine.o.x);
        a1 = point.y - b1 * point.x;
        a2 = iLine.o.y - b2 * iLine.o.x;

        xi = -(a1 - a2) / (b1 - b2);
        // yi = a1 + b1 * xi;
      }
      // dont count xi < point.x cases
      if (xi >= point.x) {
        xcount += 1;
      }
      // optimisation 4: specific for square images
      if (xcount === 2) {
        break;
      }
    }
    return xcount;
  }

  observeCanvasRender() {
    this.canvas.on('after:render', ({ ctx }) => {
      // TODO 有些渲染上的问题，暂时先注释掉
      // this.drawHighlightPoint(ctx);
    });
  }

  drawHighlightPoint(ctx) {
    if (this.currentConnectionLine && this.canvas.isConnecting) {
      const { fromPoint, toPoint, fromTargetId, toTargetId } = this.currentConnectionLine;
      const { connectType, viewportTransform } = this.canvas;
      let aa;
      if (connectType === 'changeFromPoint' && fromTargetId) {
        aa = fromPoint;
      } else if (connectType === 'changeToPoint' && toTargetId) {
        aa = toPoint;
      }
      if (!aa) {
        return;
      }
      const temp = this.getPointInvertVpt(viewportTransform, aa);
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = 'rgba(194,48,48, 0.5)';
      ctx.arc(temp.x, temp.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export default ConnectionLineHandler;
