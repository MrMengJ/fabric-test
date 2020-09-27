import { fabric } from 'fabric';

function Anchors(options) {
  for (let i in options) {
    this[i] = options[i];
  }
}

Anchors.prototype = {
  /**
   * Relative position of the anchor. X
   * 0,0 is the center of the Object, while -0.5 (left) or 0.5 (right) are the extremities
   * of the bounding box.
   * @type {Number}
   * @default 0
   */
  x: 0,

  /**
   * Relative position of the anchor. Y
   * 0,0 is the center of the Object, while -0.5 (top) or 0.5 (bottom) are the extremities
   * of the bounding box.
   * @type {Number}
   * @default 0
   */
  y: 0,

  /**
   * Horizontal offset of the control from the defined position. In pixels
   * Positive offset moves the control to the right, negative to the left.
   * It used when you want to have position of control that does not scale with
   * the bounding box. Example: rotation control is placed at x:0, y: 0.5 on
   * the boundindbox, with an offset of 30 pixels vertivally. Those 30 pixels will
   * stay 30 pixels no matter how the object is big. Another example is having 2
   * controls in the corner, that stay in the same position when the object scale.
   * of the bounding box.
   * @type {Number}
   * @default 0
   */
  offsetX: 0,

  /**
   * Vertical offset of the anchor from the defined position. In pixels
   * Positive offset moves the anchor to the bottom, negative to the top.
   * @type {Number}
   * @default 0
   */
  offsetY: 0,

  /**
   * Css cursor style to display when the anchor is hovered.
   * if the method `cursorStyleHandler` is provided, this property is ignored.
   * @type {String}
   * @default 'crosshair'
   */
  cursorStyle: 'crosshair',

  /**
   * The anchor handler for mouse down, provide one to handle mouse down on control
   * @param {Event} eventData the native mouse event
   * @param {Object} transformData properties of the current transform
   * @param {fabric.Object} object on which the control is displayed
   * @return {Function}
   */
  mouseDownHandler: function (/* eventData, transformData, fabricObject */) {
    console.log('mouseDownHandler');
  },

  /**
   * The anchor mouseUpHandler, provide one to handle an effect on mouse up.
   * @param {Event} eventData the native mouse event
   * @param {Object} transformData properties of the current transform
   * @param {fabric.Object} object on which the control is displayed
   * @return {Function}
   */
  mouseUpHandler: function (/* eventData, transformData, fabricObject */) {},

  /**
   * Returns anchor mouseDown handler
   * @param {Event} eventData the native mouse event
   * @param {Object} transformData properties of the current transform
   * @param {fabric.Object} object on which the control is displayed
   * @return {Function}
   */
  getMouseDownHandler: function (/* eventData, fabricObject, control */) {
    return this.mouseDownHandler;
  },

  /**
   * Returns anchor mouseUp handler
   * @param {Event} eventData the native mouse event
   * @param {Object} transformData properties of the current transform
   * @param {fabric.Object} object on which the control is displayed
   * @return {Function}
   */
  getMouseUpHandler: function (/* eventData, fabricObject, control */) {
    return this.mouseUpHandler;
  },

  /**
   * Returns anchor cursorStyle for css using cursorStyle. If you need a more elaborate
   * function you can pass one in the constructor
   * the cursorStyle property
   * @param {Event} eventData the native mouse event
   * @param {Anchors} anchor the current control ( likely this)
   * @param {fabric.Object} object on which the control is displayed
   * @return {String}
   */
  cursorStyleHandler: function (eventData, anchor /* fabricObject */) {
    return anchor.cursorStyle;
  },

  positionHandler: function (dim, finalMatrix /*, fabricObject, currentControl */) {
    return fabric.util.transformPoint(
      {
        x: this.x * dim.x + this.offsetX,
        y: this.y * dim.y + this.offsetY,
      },
      finalMatrix
    );
  },

  /**
   * Render function for the anchor.
   * all the functions will have to translate to the point left,top before starting Drawing
   * if they want to draw a anchor where the position is detected.
   * left and top are the result of the positionHandler function
   * @param {RenderingContext2D} ctx the context where the anchor will be drawn
   * @param {Number} left position of the canvas where we are about to render the anchor.
   * @param {Number} top position of the canvas where we are about to render the anchor.
   * @param {fabric.Object} fabricObject the object where the control is about to be rendered
   */
  render: function (ctx, left, top, fabricObject) {
    let size = fabricObject.anchorSize;

    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#4285F4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(left, top, size / 2, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
};

export default Anchors;
