import { fabric } from 'fabric';
import { filter, forEach, includes, max } from 'lodash';

import { CAN_NOT_CONNECTABLE_OBJECTS } from './constants';

class ConnectionLineHandler {
  constructor(Handler) {
    this.handler = Handler;
    this.canvas = Handler.canvas;
    this.currentConnectionLine = null;
    this.pointer = null;
    this.absolutePointer = null;
  }

  getConnectableObjects() {
    const allObjects = this.canvas.getObjects();
    return filter(allObjects, (item) => {
      return !includes(CAN_NOT_CONNECTABLE_OBJECTS, item.type);
    });
  }

  linkAnchors(obj, point = this.absolutePointer) {
    let changedPoint = null;
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
        changedPoint = anchorCoords;
        return false;
      }
    });

    if (!changedPoint) {
      if (
        this.canvas.connectType === 'changeToPoint' &&
        this.currentConnectionLine.toTarget
      ) {
        this.currentConnectionLine.toTarget = null;
      }
      if (
        this.canvas.connectType === 'changeFromPoint' &&
        this.currentConnectionLine.fromTarget
      ) {
        this.currentConnectionLine.fromTarget = null;
      }
    }

    if (changedPoint) {
      if (this.canvas.connectType === 'changeFromPoint') {
        this.currentConnectionLine.fromTarget = obj.id;
        this.currentConnectionLine.fromPoint = changedPoint;
        this.currentConnectionLine.updatePoints();
      } else if (this.canvas.connectType === 'changeToPoint') {
        this.currentConnectionLine.toTarget = obj.id;
        this.currentConnectionLine.toPoint = changedPoint;
        this.currentConnectionLine.updatePoints();
      }
    }

    return !!changedPoint;
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
      const aCoords = this.getObjACoords(item);
      const isIn = this.containsPoint(this.absolutePointer, aCoords);
      if (isIn) {
        const hasLinkAnchor = this.linkAnchors(item, absolutePointer);
        if (hasLinkAnchor) {
          return false;
        }
        // item.strokeEdge();
        // const context = item.canvas.contextContainer;
        // const isInPath = context.isPointInPath(
        //   this.absolutePointer.x,
        //   this.absolutePointer.y
        // );
      }
    });
  }

  getObjACoords(object) {
    if (!object) {
      return null;
    }
    const extraSpace = 10;
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
}

export default ConnectionLineHandler;
