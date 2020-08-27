import { fabric } from 'fabric';

var getPointer = fabric.util.getPointer,
  degreesToRadians = fabric.util.degreesToRadians,
  abs = Math.abs,
  supportLineDash = fabric.StaticCanvas.supports('setLineDash'),
  isTouchEvent = fabric.util.isTouchEvent,
  STROKE_OFFSET = 0.5;

// canvas_events.mixin.js
var addListener = fabric.util.addListener,
  removeListener = fabric.util.removeListener,
  RIGHT_CLICK = 3,
  MIDDLE_CLICK = 2,
  LEFT_CLICK = 1,
  addEventOptions = { passive: false };

function checkClick(e, value) {
  return e.button && e.button === value - 1;
}

//  canvas_gestures.mixin.js
var degreesToRadians = fabric.util.degreesToRadians,
  radiansToDegrees = fabric.util.radiansToDegrees;

// canvas_grouping.mixin.js
var min = fabric.util.array.min,
  max = fabric.util.array.max;

const ECanvas = fabric.util.createClass(fabric.StaticCanvas, {
  /**
   * Constructor
   * @param {HTMLElement | String} el &lt;canvas> element to initialize instance on
   * @param {Object} [options] Options object
   * @return {Object} thisArg
   */
  initialize: function (el, options) {
    options || (options = {});
    this.renderAndResetBound = this.renderAndReset.bind(this);
    this.requestRenderAllBound = this.requestRenderAll.bind(this);
    this._initStatic(el, options);
    this._initInteractive();
    this._createCacheCanvas();
  },

  /**
   * When true, objects can be transformed by one side (unproportionally)
   * when dragged on the corners that normally would not do that.
   * @type Boolean
   * @default
   * @since fabric 4.0 // changed name and default value
   */
  uniformScaling: true,

  /**
   * Indicates which key switches uniform scaling.
   * values: 'altKey', 'shiftKey', 'ctrlKey'.
   * If `null` or 'none' or any other string that is not a modifier key
   * feature is disabled.
   * totally wrong named. this sounds like `uniform scaling`
   * if Canvas.uniformScaling is true, pressing this will set it to false
   * and viceversa.
   * @since 1.6.2
   * @type String
   * @default
   */
  uniScaleKey: 'shiftKey',

  /**
   * When true, objects use center point as the origin of scale transformation.
   * <b>Backwards incompatibility note:</b> This property replaces "centerTransform" (Boolean).
   * @since 1.3.4
   * @type Boolean
   * @default
   */
  centeredScaling: false,

  /**
   * When true, objects use center point as the origin of rotate transformation.
   * <b>Backwards incompatibility note:</b> This property replaces "centerTransform" (Boolean).
   * @since 1.3.4
   * @type Boolean
   * @default
   */
  centeredRotation: false,

  /**
   * Indicates which key enable centered Transform
   * values: 'altKey', 'shiftKey', 'ctrlKey'.
   * If `null` or 'none' or any other string that is not a modifier key
   * feature is disabled feature disabled.
   * @since 1.6.2
   * @type String
   * @default
   */
  centeredKey: 'altKey',

  /**
   * Indicates which key enable alternate action on corner
   * values: 'altKey', 'shiftKey', 'ctrlKey'.
   * If `null` or 'none' or any other string that is not a modifier key
   * feature is disabled feature disabled.
   * @since 1.6.2
   * @type String
   * @default
   */
  altActionKey: 'shiftKey',

  /**
   * Indicates that canvas is interactive. This property should not be changed.
   * @type Boolean
   * @default
   */
  interactive: true,

  /**
   * Indicates whether group selection should be enabled
   * @type Boolean
   * @default
   */
  selection: true,

  /**
   * Indicates which key or keys enable multiple click selection
   * Pass value as a string or array of strings
   * values: 'altKey', 'shiftKey', 'ctrlKey'.
   * If `null` or empty or containing any other string that is not a modifier key
   * feature is disabled.
   * @since 1.6.2
   * @type String|Array
   * @default
   */
  selectionKey: 'shiftKey',

  /**
   * Indicates which key enable alternative selection
   * in case of target overlapping with active object
   * values: 'altKey', 'shiftKey', 'ctrlKey'.
   * For a series of reason that come from the general expectations on how
   * things should work, this feature works only for preserveObjectStacking true.
   * If `null` or 'none' or any other string that is not a modifier key
   * feature is disabled.
   * @since 1.6.5
   * @type null|String
   * @default
   */
  altSelectionKey: null,

  /**
   * Color of selection
   * @type String
   * @default
   */
  selectionColor: 'rgba(100, 100, 255, 0.3)', // blue

  /**
   * Default dash array pattern
   * If not empty the selection border is dashed
   * @type Array
   */
  selectionDashArray: [],

  /**
   * Color of the border of selection (usually slightly darker than color of selection itself)
   * @type String
   * @default
   */
  selectionBorderColor: 'rgba(255, 255, 255, 0.3)',

  /**
   * Width of a line used in object/group selection
   * @type Number
   * @default
   */
  selectionLineWidth: 1,

  /**
   * Select only shapes that are fully contained in the dragged selection rectangle.
   * @type Boolean
   * @default
   */
  selectionFullyContained: false,

  /**
   * Default cursor value used when hovering over an object on canvas
   * @type String
   * @default
   */
  hoverCursor: 'move',

  /**
   * Default cursor value used when moving an object on canvas
   * @type String
   * @default
   */
  moveCursor: 'move',

  /**
   * Default cursor value used for the entire canvas
   * @type String
   * @default
   */
  defaultCursor: 'default',

  /**
   * Cursor value used during free drawing
   * @type String
   * @default
   */
  freeDrawingCursor: 'crosshair',

  /**
   * Cursor value used for rotation point
   * @type String
   * @default
   */
  rotationCursor: 'crosshair',

  /**
   * Cursor value used for disabled elements ( corners with disabled action )
   * @type String
   * @since 2.0.0
   * @default
   */
  notAllowedCursor: 'not-allowed',

  /**
   * Default element class that's given to wrapper (div) element of canvas
   * @type String
   * @default
   */
  containerClass: 'canvas-container',

  /**
   * When true, object detection happens on per-pixel basis rather than on per-bounding-box
   * @type Boolean
   * @default
   */
  perPixelTargetFind: false,

  /**
   * Number of pixels around target pixel to tolerate (consider active) during object detection
   * @type Number
   * @default
   */
  targetFindTolerance: 0,

  /**
   * When true, target detection is skipped when hovering over canvas. This can be used to improve performance.
   * @type Boolean
   * @default
   */
  skipTargetFind: false,

  /**
   * When true, mouse events on canvas (mousedown/mousemove/mouseup) result in free drawing.
   * After mousedown, mousemove creates a shape,
   * and then mouseup finalizes it and adds an instance of `fabric.Path` onto canvas.
   * @tutorial {@link http://fabricjs.com/fabric-intro-part-4#free_drawing}
   * @type Boolean
   * @default
   */
  isDrawingMode: false,

  /**
   * Indicates whether objects should remain in current stack position when selected.
   * When false objects are brought to top and rendered as part of the selection group
   * @type Boolean
   * @default
   */
  preserveObjectStacking: false,

  /**
   * Indicates the angle that an object will lock to while rotating.
   * @type Number
   * @since 1.6.7
   * @default
   */
  snapAngle: 0,

  /**
   * Indicates the distance from the snapAngle the rotation will lock to the snapAngle.
   * When `null`, the snapThreshold will default to the snapAngle.
   * @type null|Number
   * @since 1.6.7
   * @default
   */
  snapThreshold: null,

  /**
   * Indicates if the right click on canvas can output the context menu or not
   * @type Boolean
   * @since 1.6.5
   * @default
   */
  stopContextMenu: false,

  /**
   * Indicates if the canvas can fire right click events
   * @type Boolean
   * @since 1.6.5
   * @default
   */
  fireRightClick: false,

  /**
   * Indicates if the canvas can fire middle click events
   * @type Boolean
   * @since 1.7.8
   * @default
   */
  fireMiddleClick: false,

  /**
   * Keep track of the subTargets for Mouse Events
   * @type fabric.Object[]
   */
  targets: [],

  /**
   * Keep track of the hovered target
   * @type fabric.Object
   * @private
   */
  _hoveredTarget: null,

  /**
   * hold the list of nested targets hovered
   * @type fabric.Object[]
   * @private
   */
  _hoveredTargets: [],

  /**
   * @private
   */
  _initInteractive: function () {
    this._currentTransform = null;
    this._groupSelector = null;
    this._initWrapperElement();
    this._createUpperCanvas();
    this._initEventListeners();

    this._initRetinaScaling();

    this.freeDrawingBrush = fabric.PencilBrush && new fabric.PencilBrush(this);

    this.calcOffset();
  },

  /**
   * Divides objects in two groups, one to render immediately
   * and one to render as activeGroup.
   * @return {Array} objects to render immediately and pushes the other in the activeGroup.
   */
  _chooseObjectsToRender: function () {
    var activeObjects = this.getActiveObjects(),
      object,
      objsToRender,
      activeGroupObjects;

    if (activeObjects.length > 0 && !this.preserveObjectStacking) {
      objsToRender = [];
      activeGroupObjects = [];
      for (var i = 0, length = this._objects.length; i < length; i++) {
        object = this._objects[i];
        if (activeObjects.indexOf(object) === -1) {
          objsToRender.push(object);
        } else {
          activeGroupObjects.push(object);
        }
      }
      if (activeObjects.length > 1) {
        this._activeObject._objects = activeGroupObjects;
      }
      objsToRender.push.apply(objsToRender, activeGroupObjects);
    } else {
      objsToRender = this._objects;
    }
    return objsToRender;
  },

  /**
   * Renders both the top canvas and the secondary container canvas.
   * @return {fabric.Canvas} instance
   * @chainable
   */
  renderAll: function () {
    if (this.contextTopDirty && !this._groupSelector && !this.isDrawingMode) {
      this.clearContext(this.contextTop);
      this.contextTopDirty = false;
    }
    if (this.hasLostContext) {
      this.renderTopLayer(this.contextTop);
    }
    var canvasToDrawOn = this.contextContainer;
    this.renderCanvas(canvasToDrawOn, this._chooseObjectsToRender());
    return this;
  },

  renderTopLayer: function (ctx) {
    ctx.save();
    if (this.isDrawingMode && this._isCurrentlyDrawing) {
      this.freeDrawingBrush && this.freeDrawingBrush._render();
      this.contextTopDirty = true;
    }
    // we render the top context - last object
    if (this.selection && this._groupSelector) {
      this._drawSelection(ctx);
      this.contextTopDirty = true;
    }
    ctx.restore();
  },

  /**
   * Method to render only the top canvas.
   * Also used to render the group selection box.
   * @return {fabric.Canvas} thisArg
   * @chainable
   */
  renderTop: function () {
    var ctx = this.contextTop;
    this.clearContext(ctx);
    this.renderTopLayer(ctx);
    this.fire('after:render');
    return this;
  },

  /**
   * @private
   */
  _normalizePointer: function (object, pointer) {
    var m = object.calcTransformMatrix(),
      invertedM = fabric.util.invertTransform(m),
      vptPointer = this.restorePointerVpt(pointer);
    return fabric.util.transformPoint(vptPointer, invertedM);
  },

  /**
   * Returns true if object is transparent at a certain location
   * @param {fabric.Object} target Object to check
   * @param {Number} x Left coordinate
   * @param {Number} y Top coordinate
   * @return {Boolean}
   */
  isTargetTransparent: function (target, x, y) {
    // in case the target is the activeObject, we cannot execute this optimization
    // because we need to draw controls too.
    if (target.shouldCache() && target._cacheCanvas && target !== this._activeObject) {
      var normalizedPointer = this._normalizePointer(target, { x: x, y: y }),
        targetRelativeX = Math.max(
          target.cacheTranslationX + normalizedPointer.x * target.zoomX,
          0
        ),
        targetRelativeY = Math.max(
          target.cacheTranslationY + normalizedPointer.y * target.zoomY,
          0
        );

      var isTransparent = fabric.util.isTransparent(
        target._cacheContext,
        Math.round(targetRelativeX),
        Math.round(targetRelativeY),
        this.targetFindTolerance
      );

      return isTransparent;
    }

    var ctx = this.contextCache,
      originalColor = target.selectionBackgroundColor,
      v = this.viewportTransform;

    target.selectionBackgroundColor = '';

    this.clearContext(ctx);

    ctx.save();
    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    target.render(ctx);
    ctx.restore();

    target === this._activeObject &&
      target._renderControls(
        ctx,
        {
          hasBorders: false,
          transparentCorners: false,
        },
        {
          hasBorders: false,
        }
      );

    target.selectionBackgroundColor = originalColor;

    var isTransparent = fabric.util.isTransparent(ctx, x, y, this.targetFindTolerance);

    return isTransparent;
  },

  /**
   * takes an event and determins if selection key has been pressed
   * @private
   * @param {Event} e Event object
   */
  _isSelectionKeyPressed: function (e) {
    var selectionKeyPressed = false;

    if (Object.prototype.toString.call(this.selectionKey) === '[object Array]') {
      selectionKeyPressed = !!this.selectionKey.find(function (key) {
        return e[key] === true;
      });
    } else {
      selectionKeyPressed = e[this.selectionKey];
    }

    return selectionKeyPressed;
  },

  /**
   * @private
   * @param {Event} e Event object
   * @param {fabric.Object} target
   */
  _shouldClearSelection: function (e, target) {
    var activeObjects = this.getActiveObjects(),
      activeObject = this._activeObject;

    return (
      !target ||
      (target &&
        activeObject &&
        activeObjects.length > 1 &&
        activeObjects.indexOf(target) === -1 &&
        activeObject !== target &&
        !this._isSelectionKeyPressed(e)) ||
      (target && !target.evented) ||
      (target && !target.selectable && activeObject && activeObject !== target)
    );
  },

  /**
   * centeredScaling from object can't override centeredScaling from canvas.
   * this should be fixed, since object setting should take precedence over canvas.
   * also this should be something that will be migrated in the control properties.
   * as ability to define the origin of the transformation that the control provide.
   * @private
   * @param {fabric.Object} target
   * @param {String} action
   * @param {Boolean} altKey
   */
  _shouldCenterTransform: function (target, action, altKey) {
    if (!target) {
      return;
    }

    var centerTransform;

    if (
      action === 'scale' ||
      action === 'scaleX' ||
      action === 'scaleY' ||
      action === 'resizing'
    ) {
      centerTransform = this.centeredScaling || target.centeredScaling;
    } else if (action === 'rotate') {
      centerTransform = this.centeredRotation || target.centeredRotation;
    }

    return centerTransform ? !altKey : altKey;
  },

  /**
   * should disappear before release 4.0
   * @private
   */
  _getOriginFromCorner: function (target, corner) {
    var origin = {
      x: target.originX,
      y: target.originY,
    };

    if (corner === 'ml' || corner === 'tl' || corner === 'bl') {
      origin.x = 'right';
    } else if (corner === 'mr' || corner === 'tr' || corner === 'br') {
      origin.x = 'left';
    }

    if (corner === 'tl' || corner === 'mt' || corner === 'tr') {
      origin.y = 'bottom';
    } else if (corner === 'bl' || corner === 'mb' || corner === 'br') {
      origin.y = 'top';
    } else if (corner === 'mtr') {
      origin.x = 'center';
      origin.y = 'center';
    }
    return origin;
  },

  /**
   * @private
   * @param {Boolean} alreadySelected true if target is already selected
   * @param {String} corner a string representing the corner ml, mr, tl ...
   * @param {Event} e Event object
   * @param {fabric.Object} [target] inserted back to help overriding. Unused
   */
  _getActionFromCorner: function (alreadySelected, corner, e, target) {
    if (!corner || !alreadySelected) {
      return 'drag';
    }
    var control = target.controls[corner];
    return control.getActionName(e, control, target);
  },

  /**
   * @private
   * @param {Event} e Event object
   * @param {fabric.Object} target
   */
  _setupCurrentTransform: function (e, target, alreadySelected) {
    if (!target) {
      return;
    }

    var pointer = this.getPointer(e),
      corner = target.__corner,
      actionHandler = !!corner && target.controls[corner].getActionHandler(),
      action = this._getActionFromCorner(alreadySelected, corner, e, target),
      origin = this._getOriginFromCorner(target, corner),
      altKey = e[this.centeredKey],
      transform = {
        target: target,
        action: action,
        actionHandler: actionHandler,
        corner: corner,
        scaleX: target.scaleX,
        scaleY: target.scaleY,
        skewX: target.skewX,
        skewY: target.skewY,
        // used by transation
        offsetX: pointer.x - target.left,
        offsetY: pointer.y - target.top,
        originX: origin.x,
        originY: origin.y,
        ex: pointer.x,
        ey: pointer.y,
        lastX: pointer.x,
        lastY: pointer.y,
        // unsure they are useful anymore.
        // left: target.left,
        // top: target.top,
        theta: degreesToRadians(target.angle),
        // end of unsure
        width: target.width * target.scaleX,
        shiftKey: e.shiftKey,
        altKey: altKey,
        original: fabric.util.saveObjectTransform(target),
      };

    if (this._shouldCenterTransform(target, action, altKey)) {
      transform.originX = 'center';
      transform.originY = 'center';
    }
    transform.original.originX = origin.x;
    transform.original.originY = origin.y;
    this._currentTransform = transform;
    this._beforeTransform(e);
  },

  /**
   * Translates object by "setting" its left/top
   * @private
   * @param {Number} x pointer's x coordinate
   * @param {Number} y pointer's y coordinate
   * @return {Boolean} true if the translation occurred
   */
  _translateObject: function (x, y) {
    var transform = this._currentTransform,
      target = transform.target,
      newLeft = x - transform.offsetX,
      newTop = y - transform.offsetY,
      moveX = !target.get('lockMovementX') && target.left !== newLeft,
      moveY = !target.get('lockMovementY') && target.top !== newTop;

    moveX && target.set('left', newLeft);
    moveY && target.set('top', newTop);
    return moveX || moveY;
  },

  /**
   * Set the cursor type of the canvas element
   * @param {String} value Cursor type of the canvas element.
   * @see http://www.w3.org/TR/css3-ui/#cursor
   */
  setCursor: function (value) {
    this.upperCanvasEl.style.cursor = value;
  },

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx to draw the selection on
   */
  _drawSelection: function (ctx) {
    var groupSelector = this._groupSelector,
      left = groupSelector.left,
      top = groupSelector.top,
      aleft = abs(left),
      atop = abs(top);

    if (this.selectionColor) {
      ctx.fillStyle = this.selectionColor;

      ctx.fillRect(
        groupSelector.ex - (left > 0 ? 0 : -left),
        groupSelector.ey - (top > 0 ? 0 : -top),
        aleft,
        atop
      );
    }

    if (!this.selectionLineWidth || !this.selectionBorderColor) {
      return;
    }
    ctx.lineWidth = this.selectionLineWidth;
    ctx.strokeStyle = this.selectionBorderColor;

    // selection border
    if (this.selectionDashArray.length > 1 && !supportLineDash) {
      var px = groupSelector.ex + STROKE_OFFSET - (left > 0 ? 0 : aleft),
        py = groupSelector.ey + STROKE_OFFSET - (top > 0 ? 0 : atop);

      ctx.beginPath();

      fabric.util.drawDashedLine(ctx, px, py, px + aleft, py, this.selectionDashArray);
      fabric.util.drawDashedLine(
        ctx,
        px,
        py + atop - 1,
        px + aleft,
        py + atop - 1,
        this.selectionDashArray
      );
      fabric.util.drawDashedLine(ctx, px, py, px, py + atop, this.selectionDashArray);
      fabric.util.drawDashedLine(
        ctx,
        px + aleft - 1,
        py,
        px + aleft - 1,
        py + atop,
        this.selectionDashArray
      );

      ctx.closePath();
      ctx.stroke();
    } else {
      fabric.Object.prototype._setLineDash.call(this, ctx, this.selectionDashArray);
      ctx.strokeRect(
        groupSelector.ex + STROKE_OFFSET - (left > 0 ? 0 : aleft),
        groupSelector.ey + STROKE_OFFSET - (top > 0 ? 0 : atop),
        aleft,
        atop
      );
    }
  },

  /**
   * Method that determines what object we are clicking on
   * the skipGroup parameter is for internal use, is needed for shift+click action
   * 11/09/2018 TODO: would be cool if findTarget could discern between being a full target
   * or the outside part of the corner.
   * @param {Event} e mouse event
   * @param {Boolean} skipGroup when true, activeGroup is skipped and only objects are traversed through
   * @return {fabric.Object} the target found
   */
  findTarget: function (e, skipGroup) {
    if (this.skipTargetFind) {
      return;
    }

    var ignoreZoom = true,
      pointer = this.getPointer(e, ignoreZoom),
      activeObject = this._activeObject,
      aObjects = this.getActiveObjects(),
      activeTarget,
      activeTargetSubs,
      isTouch = isTouchEvent(e);

    // first check current group (if one exists)
    // active group does not check sub targets like normal groups.
    // if active group just exits.
    this.targets = [];

    if (
      aObjects.length > 1 &&
      !skipGroup &&
      activeObject === this._searchPossibleTargets([activeObject], pointer)
    ) {
      return activeObject;
    }
    // if we hit the corner of an activeObject, let's return that.
    if (aObjects.length === 1 && activeObject._findTargetCorner(pointer, isTouch)) {
      return activeObject;
    }
    if (
      aObjects.length === 1 &&
      activeObject === this._searchPossibleTargets([activeObject], pointer)
    ) {
      if (!this.preserveObjectStacking) {
        return activeObject;
      } else {
        activeTarget = activeObject;
        activeTargetSubs = this.targets;
        this.targets = [];
      }
    }
    var target = this._searchPossibleTargets(this._objects, pointer);
    if (e[this.altSelectionKey] && target && activeTarget && target !== activeTarget) {
      target = activeTarget;
      this.targets = activeTargetSubs;
    }
    return target;
  },

  /**
   * Checks point is inside the object.
   * @param {Object} [pointer] x,y object of point coordinates we want to check.
   * @param {fabric.Object} obj Object to test against
   * @param {Object} [globalPointer] x,y object of point coordinates relative to canvas used to search per pixel target.
   * @return {Boolean} true if point is contained within an area of given object
   * @private
   */
  _checkTarget: function (pointer, obj, globalPointer) {
    if (
      obj &&
      obj.visible &&
      obj.evented &&
      // http://www.geog.ubc.ca/courses/klink/gis.notes/ncgia/u32.html
      // http://idav.ucdavis.edu/~okreylos/TAship/Spring2000/PointInPolygon.html
      (obj.containsPoint(pointer) || !!obj._findTargetCorner(pointer))
    ) {
      if ((this.perPixelTargetFind || obj.perPixelTargetFind) && !obj.isEditing) {
        var isTransparent = this.isTargetTransparent(
          obj,
          globalPointer.x,
          globalPointer.y
        );
        if (!isTransparent) {
          return true;
        }
      } else {
        return true;
      }
    }
  },

  /**
   * Function used to search inside objects an object that contains pointer in bounding box or that contains pointerOnCanvas when painted
   * @param {Array} [objects] objects array to look into
   * @param {Object} [pointer] x,y object of point coordinates we want to check.
   * @return {fabric.Object} object that contains pointer
   * @private
   */
  _searchPossibleTargets: function (objects, pointer) {
    // Cache all targets where their bounding box contains point.
    var target,
      i = objects.length,
      subTarget;
    // Do not check for currently grouped objects, since we check the parent group itself.
    // until we call this function specifically to search inside the activeGroup
    while (i--) {
      var objToCheck = objects[i];
      var pointerToUse = objToCheck.group
        ? this._normalizePointer(objToCheck.group, pointer)
        : pointer;
      if (this._checkTarget(pointerToUse, objToCheck, pointer)) {
        target = objects[i];
        if (target.subTargetCheck && target instanceof fabric.Group) {
          subTarget = this._searchPossibleTargets(target._objects, pointer);
          subTarget && this.targets.push(subTarget);
        }
        break;
      }
    }
    return target;
  },

  /**
   * Returns pointer coordinates without the effect of the viewport
   * @param {Object} pointer with "x" and "y" number values
   * @return {Object} object with "x" and "y" number values
   */
  restorePointerVpt: function (pointer) {
    return fabric.util.transformPoint(
      pointer,
      fabric.util.invertTransform(this.viewportTransform)
    );
  },

  /**
   * Returns pointer coordinates relative to canvas.
   * Can return coordinates with or without viewportTransform.
   * ignoreZoom false gives back coordinates that represent
   * the point clicked on canvas element.
   * ignoreZoom true gives back coordinates after being processed
   * by the viewportTransform ( sort of coordinates of what is displayed
   * on the canvas where you are clicking.
   * ignoreZoom true = HTMLElement coordinates relative to top,left
   * ignoreZoom false, default = fabric space coordinates, the same used for shape position
   * To interact with your shapes top and left you want to use ignoreZoom true
   * most of the time, while ignoreZoom false will give you coordinates
   * compatible with the object.oCoords system.
   * of the time.
   * @param {Event} e
   * @param {Boolean} ignoreZoom
   * @return {Object} object with "x" and "y" number values
   */
  getPointer: function (e, ignoreZoom) {
    // return cached values if we are in the event processing chain
    if (this._absolutePointer && !ignoreZoom) {
      return this._absolutePointer;
    }
    if (this._pointer && ignoreZoom) {
      return this._pointer;
    }

    var pointer = getPointer(e),
      upperCanvasEl = this.upperCanvasEl,
      bounds = upperCanvasEl.getBoundingClientRect(),
      boundsWidth = bounds.width || 0,
      boundsHeight = bounds.height || 0,
      cssScale;

    if (!boundsWidth || !boundsHeight) {
      if ('top' in bounds && 'bottom' in bounds) {
        boundsHeight = Math.abs(bounds.top - bounds.bottom);
      }
      if ('right' in bounds && 'left' in bounds) {
        boundsWidth = Math.abs(bounds.right - bounds.left);
      }
    }

    this.calcOffset();
    pointer.x = pointer.x - this._offset.left;
    pointer.y = pointer.y - this._offset.top;
    if (!ignoreZoom) {
      pointer = this.restorePointerVpt(pointer);
    }

    var retinaScaling = this.getRetinaScaling();
    if (retinaScaling !== 1) {
      pointer.x /= retinaScaling;
      pointer.y /= retinaScaling;
    }

    if (boundsWidth === 0 || boundsHeight === 0) {
      // If bounds are not available (i.e. not visible), do not apply scale.
      cssScale = { width: 1, height: 1 };
    } else {
      cssScale = {
        width: upperCanvasEl.width / boundsWidth,
        height: upperCanvasEl.height / boundsHeight,
      };
    }

    return {
      x: pointer.x * cssScale.width,
      y: pointer.y * cssScale.height,
    };
  },

  /**
   * @private
   * @throws {CANVAS_INIT_ERROR} If canvas can not be initialized
   */
  _createUpperCanvas: function () {
    var lowerCanvasClass = this.lowerCanvasEl.className.replace(/\s*lower-canvas\s*/, ''),
      lowerCanvasEl = this.lowerCanvasEl,
      upperCanvasEl = this.upperCanvasEl;

    // there is no need to create a new upperCanvas element if we have already one.
    if (upperCanvasEl) {
      upperCanvasEl.className = '';
    } else {
      upperCanvasEl = this._createCanvasElement();
      this.upperCanvasEl = upperCanvasEl;
    }
    fabric.util.addClass(upperCanvasEl, 'upper-canvas ' + lowerCanvasClass);

    this.wrapperEl.appendChild(upperCanvasEl);

    this._copyCanvasStyle(lowerCanvasEl, upperCanvasEl);
    this._applyCanvasStyle(upperCanvasEl);
    this.contextTop = upperCanvasEl.getContext('2d');
  },

  /**
   * @private
   */
  _createCacheCanvas: function () {
    this.cacheCanvasEl = this._createCanvasElement();
    this.cacheCanvasEl.setAttribute('width', this.width);
    this.cacheCanvasEl.setAttribute('height', this.height);
    this.contextCache = this.cacheCanvasEl.getContext('2d');
  },

  /**
   * @private
   */
  _initWrapperElement: function () {
    this.wrapperEl = fabric.util.wrapElement(this.lowerCanvasEl, 'div', {
      class: this.containerClass,
    });
    fabric.util.setStyle(this.wrapperEl, {
      width: this.width + 'px',
      height: this.height + 'px',
      position: 'relative',
    });
    fabric.util.makeElementUnselectable(this.wrapperEl);
  },

  /**
   * @private
   * @param {HTMLElement} element canvas element to apply styles on
   */
  _applyCanvasStyle: function (element) {
    var width = this.width || element.width,
      height = this.height || element.height;

    fabric.util.setStyle(element, {
      position: 'absolute',
      width: width + 'px',
      height: height + 'px',
      left: 0,
      top: 0,
      'touch-action': this.allowTouchScrolling ? 'manipulation' : 'none',
      '-ms-touch-action': this.allowTouchScrolling ? 'manipulation' : 'none',
    });
    element.width = width;
    element.height = height;
    fabric.util.makeElementUnselectable(element);
  },

  /**
   * Copy the entire inline style from one element (fromEl) to another (toEl)
   * @private
   * @param {Element} fromEl Element style is copied from
   * @param {Element} toEl Element copied style is applied to
   */
  _copyCanvasStyle: function (fromEl, toEl) {
    toEl.style.cssText = fromEl.style.cssText;
  },

  /**
   * Returns context of canvas where object selection is drawn
   * @return {CanvasRenderingContext2D}
   */
  getSelectionContext: function () {
    return this.contextTop;
  },

  /**
   * Returns &lt;canvas> element on which object selection is drawn
   * @return {HTMLCanvasElement}
   */
  getSelectionElement: function () {
    return this.upperCanvasEl;
  },

  /**
   * Returns currently active object
   * @return {fabric.Object} active object
   */
  getActiveObject: function () {
    return this._activeObject;
  },

  /**
   * Returns an array with the current selected objects
   * @return {fabric.Object} active object
   */
  getActiveObjects: function () {
    var active = this._activeObject;
    if (active) {
      if (active.type === 'activeSelection' && active._objects) {
        return active._objects.slice(0);
      } else {
        return [active];
      }
    }
    return [];
  },

  /**
   * @private
   * @param {fabric.Object} obj Object that was removed
   */
  _onObjectRemoved: function (obj) {
    // removing active object should fire "selection:cleared" events
    if (obj === this._activeObject) {
      this.fire('before:selection:cleared', { target: obj });
      this._discardActiveObject();
      this.fire('selection:cleared', { target: obj });
      obj.fire('deselected');
    }
    if (obj === this._hoveredTarget) {
      this._hoveredTarget = null;
      this._hoveredTargets = [];
    }
    this.callSuper('_onObjectRemoved', obj);
  },

  /**
   * @private
   * Compares the old activeObject with the current one and fires correct events
   * @param {fabric.Object} obj old activeObject
   */
  _fireSelectionEvents: function (oldObjects, e) {
    var somethingChanged = false,
      objects = this.getActiveObjects(),
      added = [],
      removed = [],
      opt = { e: e };
    oldObjects.forEach(function (oldObject) {
      if (objects.indexOf(oldObject) === -1) {
        somethingChanged = true;
        oldObject.fire('deselected', opt);
        removed.push(oldObject);
      }
    });
    objects.forEach(function (object) {
      if (oldObjects.indexOf(object) === -1) {
        somethingChanged = true;
        object.fire('selected', opt);
        added.push(object);
      }
    });
    if (oldObjects.length > 0 && objects.length > 0) {
      opt.selected = added;
      opt.deselected = removed;
      // added for backward compatibility
      opt.updated = added[0] || removed[0];
      opt.target = this._activeObject;
      somethingChanged && this.fire('selection:updated', opt);
    } else if (objects.length > 0) {
      opt.selected = added;
      // added for backward compatibility
      opt.target = this._activeObject;
      this.fire('selection:created', opt);
    } else if (oldObjects.length > 0) {
      opt.deselected = removed;
      this.fire('selection:cleared', opt);
    }
  },

  /**
   * Sets given object as the only active object on canvas
   * @param {fabric.Object} object Object to set as an active one
   * @param {Event} [e] Event (passed along when firing "object:selected")
   * @return {fabric.Canvas} thisArg
   * @chainable
   */
  setActiveObject: function (object, e) {
    var currentActives = this.getActiveObjects();
    this._setActiveObject(object, e);
    this._fireSelectionEvents(currentActives, e);
    return this;
  },

  /**
   * @private
   * @param {Object} object to set as active
   * @param {Event} [e] Event (passed along when firing "object:selected")
   * @return {Boolean} true if the selection happened
   */
  _setActiveObject: function (object, e) {
    if (this._activeObject === object) {
      return false;
    }
    if (!this._discardActiveObject(e, object)) {
      return false;
    }
    if (object.onSelect({ e: e })) {
      return false;
    }
    this._activeObject = object;
    return true;
  },

  /**
   * @private
   */
  _discardActiveObject: function (e, object) {
    var obj = this._activeObject;
    if (obj) {
      // onDeselect return TRUE to cancel selection;
      if (obj.onDeselect({ e: e, object: object })) {
        return false;
      }
      this._activeObject = null;
    }
    return true;
  },

  /**
   * Discards currently active object and fire events. If the function is called by fabric
   * as a consequence of a mouse event, the event is passed as a parameter and
   * sent to the fire function for the custom events. When used as a method the
   * e param does not have any application.
   * @param {event} e
   * @return {fabric.Canvas} thisArg
   * @chainable
   */
  discardActiveObject: function (e) {
    var currentActives = this.getActiveObjects(),
      activeObject = this.getActiveObject();
    if (currentActives.length) {
      this.fire('before:selection:cleared', { target: activeObject, e: e });
    }
    this._discardActiveObject(e);
    this._fireSelectionEvents(currentActives, e);
    return this;
  },

  /**
   * Clears a canvas element and removes all event listeners
   * @return {fabric.Canvas} thisArg
   * @chainable
   */
  dispose: function () {
    var wrapper = this.wrapperEl;
    this.removeListeners();
    wrapper.removeChild(this.upperCanvasEl);
    wrapper.removeChild(this.lowerCanvasEl);
    this.contextCache = null;
    this.contextTop = null;
    ['upperCanvasEl', 'cacheCanvasEl'].forEach(
      function (element) {
        fabric.util.cleanUpJsdomNode(this[element]);
        this[element] = undefined;
      }.bind(this)
    );
    if (wrapper.parentNode) {
      wrapper.parentNode.replaceChild(this.lowerCanvasEl, this.wrapperEl);
    }
    delete this.wrapperEl;
    fabric.StaticCanvas.prototype.dispose.call(this);
    return this;
  },

  /**
   * Clears all contexts (background, main, top) of an instance
   * @return {fabric.Canvas} thisArg
   * @chainable
   */
  clear: function () {
    // this.discardActiveGroup();
    this.discardActiveObject();
    this.clearContext(this.contextTop);
    return this.callSuper('clear');
  },

  /**
   * Draws objects' controls (borders/controls)
   * @param {CanvasRenderingContext2D} ctx Context to render controls on
   */
  drawControls: function (ctx) {
    var activeObject = this._activeObject;

    if (activeObject) {
      activeObject._renderControls(ctx);
    }
  },

  /**
   * @private
   */
  _toObject: function (instance, methodName, propertiesToInclude) {
    //If the object is part of the current selection group, it should
    //be transformed appropriately
    //i.e. it should be serialised as it would appear if the selection group
    //were to be destroyed.
    var originalProperties = this._realizeGroupTransformOnObject(instance),
      object = this.callSuper('_toObject', instance, methodName, propertiesToInclude);
    //Undo the damage we did by changing all of its properties
    this._unwindGroupTransformOnObject(instance, originalProperties);
    return object;
  },

  /**
   * Realises an object's group transformation on it
   * @private
   * @param {fabric.Object} [instance] the object to transform (gets mutated)
   * @returns the original values of instance which were changed
   */
  _realizeGroupTransformOnObject: function (instance) {
    if (
      instance.group &&
      instance.group.type === 'activeSelection' &&
      this._activeObject === instance.group
    ) {
      var layoutProps = [
        'angle',
        'flipX',
        'flipY',
        'left',
        'scaleX',
        'scaleY',
        'skewX',
        'skewY',
        'top',
      ];
      //Copy all the positionally relevant properties across now
      var originalValues = {};
      layoutProps.forEach(function (prop) {
        originalValues[prop] = instance[prop];
      });
      this._activeObject.realizeTransform(instance);
      return originalValues;
    } else {
      return null;
    }
  },

  /**
   * Restores the changed properties of instance
   * @private
   * @param {fabric.Object} [instance] the object to un-transform (gets mutated)
   * @param {Object} [originalValues] the original values of instance, as returned by _realizeGroupTransformOnObject
   */
  _unwindGroupTransformOnObject: function (instance, originalValues) {
    if (originalValues) {
      instance.set(originalValues);
    }
  },

  /**
   * @private
   */
  _setSVGObject: function (markup, instance, reviver) {
    //If the object is in a selection group, simulate what would happen to that
    //object when the group is deselected
    var originalProperties = this._realizeGroupTransformOnObject(instance);
    this.callSuper('_setSVGObject', markup, instance, reviver);
    this._unwindGroupTransformOnObject(instance, originalProperties);
  },

  setViewportTransform: function (vpt) {
    if (this.renderOnAddRemove && this._activeObject && this._activeObject.isEditing) {
      this._activeObject.clearContextTop();
    }
    fabric.StaticCanvas.prototype.setViewportTransform.call(this, vpt);
  },

  //  canvas_events_mixin.js
  /**
   * Contains the id of the touch event that owns the fabric transform
   * @type Number
   * @private
   */
  mainTouchId: null,

  /**
   * Adds mouse listeners to canvas
   * @private
   */
  _initEventListeners: function () {
    // in case we initialized the class twice. This should not happen normally
    // but in some kind of applications where the canvas element may be changed
    // this is a workaround to having double listeners.
    this.removeListeners();
    this._bindEvents();
    this.addOrRemove(addListener, 'add');
  },

  /**
   * return an event prefix pointer or mouse.
   * @private
   */
  _getEventPrefix: function () {
    return this.enablePointerEvents ? 'pointer' : 'mouse';
  },

  addOrRemove: function (functor, eventjsFunctor) {
    var canvasElement = this.upperCanvasEl,
      eventTypePrefix = this._getEventPrefix();
    functor(fabric.window, 'resize', this._onResize);
    functor(canvasElement, eventTypePrefix + 'down', this._onMouseDown);
    functor(canvasElement, eventTypePrefix + 'move', this._onMouseMove, addEventOptions);
    functor(canvasElement, eventTypePrefix + 'out', this._onMouseOut);
    functor(canvasElement, eventTypePrefix + 'enter', this._onMouseEnter);
    functor(canvasElement, 'wheel', this._onMouseWheel);
    functor(canvasElement, 'contextmenu', this._onContextMenu);
    functor(canvasElement, 'dblclick', this._onDoubleClick);
    functor(canvasElement, 'dragover', this._onDragOver);
    functor(canvasElement, 'dragenter', this._onDragEnter);
    functor(canvasElement, 'dragleave', this._onDragLeave);
    functor(canvasElement, 'drop', this._onDrop);
    if (!this.enablePointerEvents) {
      functor(canvasElement, 'touchstart', this._onTouchStart, addEventOptions);
    }
    // if (typeof eventjs !== 'undefined' && eventjsFunctor in eventjs) {
    //   eventjs[eventjsFunctor](canvasElement, 'gesture', this._onGesture);
    //   eventjs[eventjsFunctor](canvasElement, 'drag', this._onDrag);
    //   eventjs[eventjsFunctor](canvasElement, 'orientation', this._onOrientationChange);
    //   eventjs[eventjsFunctor](canvasElement, 'shake', this._onShake);
    //   eventjs[eventjsFunctor](canvasElement, 'longpress', this._onLongPress);
    // }
  },

  /**
   * Removes all event listeners
   */
  removeListeners: function () {
    this.addOrRemove(removeListener, 'remove');
    // if you dispose on a mouseDown, before mouse up, you need to clean document to...
    var eventTypePrefix = this._getEventPrefix();
    removeListener(fabric.document, eventTypePrefix + 'up', this._onMouseUp);
    removeListener(fabric.document, 'touchend', this._onTouchEnd, addEventOptions);
    removeListener(
      fabric.document,
      eventTypePrefix + 'move',
      this._onMouseMove,
      addEventOptions
    );
    removeListener(fabric.document, 'touchmove', this._onMouseMove, addEventOptions);
  },

  /**
   * @private
   */
  _bindEvents: function () {
    if (this.eventsBound) {
      // for any reason we pass here twice we do not want to bind events twice.
      return;
    }
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onGesture = this._onGesture.bind(this);
    this._onDrag = this._onDrag.bind(this);
    this._onShake = this._onShake.bind(this);
    this._onLongPress = this._onLongPress.bind(this);
    this._onOrientationChange = this._onOrientationChange.bind(this);
    this._onMouseWheel = this._onMouseWheel.bind(this);
    this._onMouseOut = this._onMouseOut.bind(this);
    this._onMouseEnter = this._onMouseEnter.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);
    this._onDoubleClick = this._onDoubleClick.bind(this);
    this._onDragOver = this._onDragOver.bind(this);
    this._onDragEnter = this._simpleEventHandler.bind(this, 'dragenter');
    this._onDragLeave = this._simpleEventHandler.bind(this, 'dragleave');
    this._onDrop = this._simpleEventHandler.bind(this, 'drop');
    this.eventsBound = true;
  },

  /**
   * @private
   * @param {Event} [e] Event object fired on Event.js gesture
   * @param {Event} [self] Inner Event object
   */
  _onGesture: function (e, self) {
    this.__onTransformGesture && this.__onTransformGesture(e, self);
  },

  /**
   * @private
   * @param {Event} [e] Event object fired on Event.js drag
   * @param {Event} [self] Inner Event object
   */
  _onDrag: function (e, self) {
    this.__onDrag && this.__onDrag(e, self);
  },

  /**
   * @private
   * @param {Event} [e] Event object fired on wheel event
   */
  _onMouseWheel: function (e) {
    this.__onMouseWheel(e);
  },

  /**
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  _onMouseOut: function (e) {
    var target = this._hoveredTarget;
    this.fire('mouse:out', { target: target, e: e });
    this._hoveredTarget = null;
    target && target.fire('mouseout', { e: e });

    var _this = this;
    this._hoveredTargets.forEach(function (_target) {
      _this.fire('mouse:out', { target: target, e: e });
      _target && target.fire('mouseout', { e: e });
    });
    this._hoveredTargets = [];

    if (this._iTextInstances) {
      this._iTextInstances.forEach(function (obj) {
        if (obj.isEditing) {
          obj.hiddenTextarea.focus();
        }
      });
    }
  },

  /**
   * @private
   * @param {Event} e Event object fired on mouseenter
   */
  _onMouseEnter: function (e) {
    // This find target and consequent 'mouse:over' is used to
    // clear old instances on hovered target.
    // calling findTarget has the side effect of killing target.__corner.
    // as a short term fix we are not firing this if we are currently transforming.
    // as a long term fix we need to separate the action of finding a target with the
    // side effects we added to it.
    if (!this.currentTransform && !this.findTarget(e)) {
      this.fire('mouse:over', { target: null, e: e });
      this._hoveredTarget = null;
      this._hoveredTargets = [];
    }
  },

  /**
   * @private
   * @param {Event} [e] Event object fired on Event.js orientation change
   * @param {Event} [self] Inner Event object
   */
  _onOrientationChange: function (e, self) {
    this.__onOrientationChange && this.__onOrientationChange(e, self);
  },

  /**
   * @private
   * @param {Event} [e] Event object fired on Event.js shake
   * @param {Event} [self] Inner Event object
   */
  _onShake: function (e, self) {
    this.__onShake && this.__onShake(e, self);
  },

  /**
   * @private
   * @param {Event} [e] Event object fired on Event.js shake
   * @param {Event} [self] Inner Event object
   */
  _onLongPress: function (e, self) {
    this.__onLongPress && this.__onLongPress(e, self);
  },

  /**
   * prevent default to allow drop event to be fired
   * @private
   * @param {Event} [e] Event object fired on Event.js shake
   */
  _onDragOver: function (e) {
    e.preventDefault();
    var target = this._simpleEventHandler('dragover', e);
    this._fireEnterLeaveEvents(target, e);
  },

  /**
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  _onContextMenu: function (e) {
    if (this.stopContextMenu) {
      e.stopPropagation();
      e.preventDefault();
    }
    return false;
  },

  /**
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  _onDoubleClick: function (e) {
    this._cacheTransformEventData(e);
    this._handleEvent(e, 'dblclick');
    this._resetTransformEventData(e);
  },

  /**
   * Return a the id of an event.
   * returns either the pointerId or the identifier or 0 for the mouse event
   * @private
   * @param {Event} evt Event object
   */
  getPointerId: function (evt) {
    var changedTouches = evt.changedTouches;

    if (changedTouches) {
      return changedTouches[0] && changedTouches[0].identifier;
    }

    if (this.enablePointerEvents) {
      return evt.pointerId;
    }

    return -1;
  },

  /**
   * Determines if an event has the id of the event that is considered main
   * @private
   * @param {evt} event Event object
   */
  _isMainEvent: function (evt) {
    if (evt.isPrimary === true) {
      return true;
    }
    if (evt.isPrimary === false) {
      return false;
    }
    if (evt.type === 'touchend' && evt.touches.length === 0) {
      return true;
    }
    if (evt.changedTouches) {
      return evt.changedTouches[0].identifier === this.mainTouchId;
    }
    return true;
  },

  /**
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  _onTouchStart: function (e) {
    e.preventDefault();
    if (this.mainTouchId === null) {
      this.mainTouchId = this.getPointerId(e);
    }
    this.__onMouseDown(e);
    this._resetTransformEventData();
    var canvasElement = this.upperCanvasEl,
      eventTypePrefix = this._getEventPrefix();
    addListener(fabric.document, 'touchend', this._onTouchEnd, addEventOptions);
    addListener(fabric.document, 'touchmove', this._onMouseMove, addEventOptions);
    // Unbind mousedown to prevent double triggers from touch devices
    removeListener(canvasElement, eventTypePrefix + 'down', this._onMouseDown);
  },

  /**
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  _onMouseDown: function (e) {
    this.__onMouseDown(e);
    this._resetTransformEventData();
    var canvasElement = this.upperCanvasEl,
      eventTypePrefix = this._getEventPrefix();
    removeListener(
      canvasElement,
      eventTypePrefix + 'move',
      this._onMouseMove,
      addEventOptions
    );
    addListener(fabric.document, eventTypePrefix + 'up', this._onMouseUp);
    addListener(
      fabric.document,
      eventTypePrefix + 'move',
      this._onMouseMove,
      addEventOptions
    );
  },

  /**
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  _onTouchEnd: function (e) {
    if (e.touches.length > 0) {
      // if there are still touches stop here
      return;
    }
    this.__onMouseUp(e);
    this._resetTransformEventData();
    this.mainTouchId = null;
    var eventTypePrefix = this._getEventPrefix();
    removeListener(fabric.document, 'touchend', this._onTouchEnd, addEventOptions);
    removeListener(fabric.document, 'touchmove', this._onMouseMove, addEventOptions);
    var _this = this;
    if (this._willAddMouseDown) {
      clearTimeout(this._willAddMouseDown);
    }
    this._willAddMouseDown = setTimeout(function () {
      // Wait 400ms before rebinding mousedown to prevent double triggers
      // from touch devices
      addListener(_this.upperCanvasEl, eventTypePrefix + 'down', _this._onMouseDown);
      _this._willAddMouseDown = 0;
    }, 400);
  },

  /**
   * @private
   * @param {Event} e Event object fired on mouseup
   */
  _onMouseUp: function (e) {
    this.__onMouseUp(e);
    this._resetTransformEventData();
    var canvasElement = this.upperCanvasEl,
      eventTypePrefix = this._getEventPrefix();
    if (this._isMainEvent(e)) {
      removeListener(fabric.document, eventTypePrefix + 'up', this._onMouseUp);
      removeListener(
        fabric.document,
        eventTypePrefix + 'move',
        this._onMouseMove,
        addEventOptions
      );
      addListener(
        canvasElement,
        eventTypePrefix + 'move',
        this._onMouseMove,
        addEventOptions
      );
    }
  },

  /**
   * @private
   * @param {Event} e Event object fired on mousemove
   */
  _onMouseMove: function (e) {
    !this.allowTouchScrolling && e.preventDefault && e.preventDefault();
    this.__onMouseMove(e);
  },

  /**
   * @private
   */
  _onResize: function () {
    this.calcOffset();
  },

  /**
   * Decides whether the canvas should be redrawn in mouseup and mousedown events.
   * @private
   * @param {Object} target
   */
  _shouldRender: function (target) {
    var activeObject = this._activeObject;

    if (
      !!activeObject !== !!target ||
      (activeObject && target && activeObject !== target)
    ) {
      // this covers: switch of target, from target to no target, selection of target
      // multiSelection with key and mouse
      return true;
    } else if (activeObject && activeObject.isEditing) {
      // if we mouse up/down over a editing textbox a cursor change,
      // there is no need to re render
      return false;
    }
    return false;
  },

  /**
   * Method that defines the actions when mouse is released on canvas.
   * The method resets the currentTransform parameters, store the image corner
   * position in the image object and render the canvas on top.
   * @private
   * @param {Event} e Event object fired on mouseup
   */
  __onMouseUp: function (e) {
    var target,
      transform = this._currentTransform,
      groupSelector = this._groupSelector,
      shouldRender = false,
      isClick = !groupSelector || (groupSelector.left === 0 && groupSelector.top === 0);
    this._cacheTransformEventData(e);
    target = this._target;
    this._handleEvent(e, 'up:before');
    // if right/middle click just fire events and return
    // target undefined will make the _handleEvent search the target
    if (checkClick(e, RIGHT_CLICK)) {
      if (this.fireRightClick) {
        this._handleEvent(e, 'up', RIGHT_CLICK, isClick);
      }
      return;
    }

    if (checkClick(e, MIDDLE_CLICK)) {
      if (this.fireMiddleClick) {
        this._handleEvent(e, 'up', MIDDLE_CLICK, isClick);
      }
      this._resetTransformEventData();
      return;
    }

    if (this.isDrawingMode && this._isCurrentlyDrawing) {
      this._onMouseUpInDrawingMode(e);
      return;
    }

    if (!this._isMainEvent(e)) {
      return;
    }
    if (transform) {
      this._finalizeCurrentTransform(e);
      shouldRender = transform.actionPerformed;
    }
    if (!isClick) {
      var targetWasActive = target === this._activeObject;
      this._maybeGroupObjects(e);
      if (!shouldRender) {
        shouldRender =
          this._shouldRender(target) ||
          (!targetWasActive && target === this._activeObject);
      }
    }
    if (target) {
      var corner = target._findTargetCorner(
        this.getPointer(e, true),
        fabric.util.isTouchEvent(e)
      );
      var control = target.controls[corner],
        mouseUpHandler = control && control.getMouseUpHandler(e, target, control);
      if (mouseUpHandler) {
        mouseUpHandler(e, target, control);
      }
      target.isMoving = false;
    }
    this._setCursorFromEvent(e, target);
    this._handleEvent(e, 'up', LEFT_CLICK, isClick);
    this._groupSelector = null;
    this._currentTransform = null;
    // reset the target information about which corner is selected
    target && (target.__corner = 0);
    if (shouldRender) {
      this.requestRenderAll();
    } else if (!isClick) {
      this.renderTop();
    }
  },

  /**
   * @private
   * Handle event firing for target and subtargets
   * @param {Event} e event from mouse
   * @param {String} eventType event to fire (up, down or move)
   * @return {Fabric.Object} target return the the target found, for internal reasons.
   */
  _simpleEventHandler: function (eventType, e) {
    var target = this.findTarget(e),
      targets = this.targets,
      options = {
        e: e,
        target: target,
        subTargets: targets,
      };
    this.fire(eventType, options);
    target && target.fire(eventType, options);
    if (!targets) {
      return target;
    }
    for (var i = 0; i < targets.length; i++) {
      targets[i].fire(eventType, options);
    }
    return target;
  },

  /**
   * @private
   * Handle event firing for target and subtargets
   * @param {Event} e event from mouse
   * @param {String} eventType event to fire (up, down or move)
   * @param {fabric.Object} targetObj receiving event
   * @param {Number} [button] button used in the event 1 = left, 2 = middle, 3 = right
   * @param {Boolean} isClick for left button only, indicates that the mouse up happened without move.
   */
  _handleEvent: function (e, eventType, button, isClick) {
    var target = this._target,
      targets = this.targets || [],
      options = {
        e: e,
        target: target,
        subTargets: targets,
        button: button || LEFT_CLICK,
        isClick: isClick || false,
        pointer: this._pointer,
        absolutePointer: this._absolutePointer,
        transform: this._currentTransform,
      };
    this.fire('mouse:' + eventType, options);
    target && target.fire('mouse' + eventType, options);
    for (var i = 0; i < targets.length; i++) {
      targets[i].fire('mouse' + eventType, options);
    }
  },

  /**
   * @private
   * @param {Event} e send the mouse event that generate the finalize down, so it can be used in the event
   */
  _finalizeCurrentTransform: function (e) {
    var transform = this._currentTransform,
      target = transform.target,
      eventName,
      options = {
        e: e,
        target: target,
        transform: transform,
      };

    if (target._scaling) {
      target._scaling = false;
    }

    target.setCoords();

    if (transform.actionPerformed || (this.stateful && target.hasStateChanged())) {
      if (transform.actionPerformed) {
        eventName = this._addEventOptions(options, transform);
        this._fire(eventName, options);
      }
      this._fire('modified', options);
    }
  },

  /**
   * Mutate option object in order to add by property and give back the event name.
   * @private
   * @param {Object} options to mutate
   * @param {Object} transform to inspect action from
   */
  _addEventOptions: function (options, transform) {
    // we can probably add more details at low cost
    // scale change, rotation changes, translation changes
    var eventName, by;
    switch (transform.action) {
      case 'scaleX':
        eventName = 'scaled';
        by = 'x';
        break;
      case 'scaleY':
        eventName = 'scaled';
        by = 'y';
        break;
      case 'skewX':
        eventName = 'skewed';
        by = 'x';
        break;
      case 'skewY':
        eventName = 'skewed';
        by = 'y';
        break;
      case 'scale':
        eventName = 'scaled';
        by = 'equally';
        break;
      case 'rotate':
        eventName = 'rotated';
        break;
      case 'drag':
        eventName = 'moved';
        break;
    }
    options.by = by;
    return eventName;
  },

  /**
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  _onMouseDownInDrawingMode: function (e) {
    this._isCurrentlyDrawing = true;
    if (this.getActiveObject()) {
      this.discardActiveObject(e).requestRenderAll();
    }
    var pointer = this.getPointer(e);
    this.freeDrawingBrush.onMouseDown(pointer, { e: e, pointer: pointer });
    this._handleEvent(e, 'down');
  },

  /**
   * @private
   * @param {Event} e Event object fired on mousemove
   */
  _onMouseMoveInDrawingMode: function (e) {
    if (this._isCurrentlyDrawing) {
      var pointer = this.getPointer(e);
      this.freeDrawingBrush.onMouseMove(pointer, { e: e, pointer: pointer });
    }
    this.setCursor(this.freeDrawingCursor);
    this._handleEvent(e, 'move');
  },

  /**
   * @private
   * @param {Event} e Event object fired on mouseup
   */
  _onMouseUpInDrawingMode: function (e) {
    var pointer = this.getPointer(e);
    this._isCurrentlyDrawing = this.freeDrawingBrush.onMouseUp({
      e: e,
      pointer: pointer,
    });
    this._handleEvent(e, 'up');
  },

  /**
   * Method that defines the actions when mouse is clicked on canvas.
   * The method inits the currentTransform parameters and renders all the
   * canvas so the current image can be placed on the top canvas and the rest
   * in on the container one.
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  __onMouseDown: function (e) {
    this._cacheTransformEventData(e);
    this._handleEvent(e, 'down:before');
    var target = this._target;
    // if right click just fire events
    if (checkClick(e, RIGHT_CLICK)) {
      if (this.fireRightClick) {
        this._handleEvent(e, 'down', RIGHT_CLICK);
      }
      return;
    }

    if (checkClick(e, MIDDLE_CLICK)) {
      if (this.fireMiddleClick) {
        this._handleEvent(e, 'down', MIDDLE_CLICK);
      }
      return;
    }

    if (this.isDrawingMode) {
      this._onMouseDownInDrawingMode(e);
      return;
    }

    if (!this._isMainEvent(e)) {
      return;
    }

    // ignore if some object is being transformed at this moment
    if (this._currentTransform) {
      return;
    }

    var pointer = this._pointer;
    // save pointer for check in __onMouseUp event
    this._previousPointer = pointer;
    var shouldRender = this._shouldRender(target),
      shouldGroup = this._shouldGroup(e, target);
    if (this._shouldClearSelection(e, target)) {
      this.discardActiveObject(e);
    } else if (shouldGroup) {
      this._handleGrouping(e, target);
      target = this._activeObject;
    }

    if (
      this.selection &&
      (!target ||
        (!target.selectable && !target.isEditing && target !== this._activeObject))
    ) {
      this._groupSelector = {
        ex: pointer.x,
        ey: pointer.y,
        top: 0,
        left: 0,
      };
    }

    if (target) {
      var alreadySelected = target === this._activeObject;
      if (target.selectable) {
        this.setActiveObject(target, e);
      }
      var corner = target._findTargetCorner(
        this.getPointer(e, true),
        fabric.util.isTouchEvent(e)
      );
      target.__corner = corner;
      if (target === this._activeObject && (corner || !shouldGroup)) {
        var control = target.controls[corner],
          mouseDownHandler = control && control.getMouseDownHandler(e, target, control);
        if (mouseDownHandler) {
          mouseDownHandler(e, target, control);
        }
        this._setupCurrentTransform(e, target, alreadySelected);
      }
    }
    this._handleEvent(e, 'down');
    // we must renderAll so that we update the visuals
    (shouldRender || shouldGroup) && this.requestRenderAll();
  },

  /**
   * reset cache form common information needed during event processing
   * @private
   */
  _resetTransformEventData: function () {
    this._target = null;
    this._pointer = null;
    this._absolutePointer = null;
  },

  /**
   * Cache common information needed during event processing
   * @private
   * @param {Event} e Event object fired on event
   */
  _cacheTransformEventData: function (e) {
    // reset in order to avoid stale caching
    this._resetTransformEventData();
    this._pointer = this.getPointer(e, true);
    this._absolutePointer = this.restorePointerVpt(this._pointer);
    this._target = this._currentTransform
      ? this._currentTransform.target
      : this.findTarget(e) || null;
  },

  /**
   * @private
   */
  _beforeTransform: function (e) {
    var t = this._currentTransform;
    this.stateful && t.target.saveState();
    this.fire('before:transform', {
      e: e,
      transform: t,
    });
  },

  /**
   * Method that defines the actions when mouse is hovering the canvas.
   * The currentTransform parameter will define whether the user is rotating/scaling/translating
   * an image or neither of them (only hovering). A group selection is also possible and would cancel
   * all any other type of action.
   * In case of an image transformation only the top canvas will be rendered.
   * @private
   * @param {Event} e Event object fired on mousemove
   */
  __onMouseMove: function (e) {
    this._handleEvent(e, 'move:before');
    this._cacheTransformEventData(e);
    var target, pointer;

    if (this.isDrawingMode) {
      this._onMouseMoveInDrawingMode(e);
      return;
    }

    if (!this._isMainEvent(e)) {
      return;
    }

    var groupSelector = this._groupSelector;

    // We initially clicked in an empty area, so we draw a box for multiple selection
    if (groupSelector) {
      pointer = this._pointer;

      groupSelector.left = pointer.x - groupSelector.ex;
      groupSelector.top = pointer.y - groupSelector.ey;

      this.renderTop();
    } else if (!this._currentTransform) {
      target = this.findTarget(e) || null;
      this._setCursorFromEvent(e, target);
      this._fireOverOutEvents(target, e);
    } else {
      this._transformObject(e);
    }
    this._handleEvent(e, 'move');
    this._resetTransformEventData();
  },

  /**
   * Manage the mouseout, mouseover events for the fabric object on the canvas
   * @param {Fabric.Object} target the target where the target from the mousemove event
   * @param {Event} e Event object fired on mousemove
   * @private
   */
  _fireOverOutEvents: function (target, e) {
    var _hoveredTarget = this._hoveredTarget,
      _hoveredTargets = this._hoveredTargets,
      targets = this.targets,
      length = Math.max(_hoveredTargets.length, targets.length);

    this.fireSyntheticInOutEvents(target, e, {
      oldTarget: _hoveredTarget,
      evtOut: 'mouseout',
      canvasEvtOut: 'mouse:out',
      evtIn: 'mouseover',
      canvasEvtIn: 'mouse:over',
    });
    for (var i = 0; i < length; i++) {
      this.fireSyntheticInOutEvents(targets[i], e, {
        oldTarget: _hoveredTargets[i],
        evtOut: 'mouseout',
        evtIn: 'mouseover',
      });
    }
    this._hoveredTarget = target;
    this._hoveredTargets = this.targets.concat();
  },

  /**
   * Manage the dragEnter, dragLeave events for the fabric objects on the canvas
   * @param {Fabric.Object} target the target where the target from the onDrag event
   * @param {Event} e Event object fired on ondrag
   * @private
   */
  _fireEnterLeaveEvents: function (target, e) {
    var _draggedoverTarget = this._draggedoverTarget,
      _hoveredTargets = this._hoveredTargets,
      targets = this.targets,
      length = Math.max(_hoveredTargets.length, targets.length);

    this.fireSyntheticInOutEvents(target, e, {
      oldTarget: _draggedoverTarget,
      evtOut: 'dragleave',
      evtIn: 'dragenter',
    });
    for (var i = 0; i < length; i++) {
      this.fireSyntheticInOutEvents(targets[i], e, {
        oldTarget: _hoveredTargets[i],
        evtOut: 'dragleave',
        evtIn: 'dragenter',
      });
    }
    this._draggedoverTarget = target;
  },

  /**
   * Manage the synthetic in/out events for the fabric objects on the canvas
   * @param {Fabric.Object} target the target where the target from the supported events
   * @param {Event} e Event object fired
   * @param {Object} config configuration for the function to work
   * @param {String} config.targetName property on the canvas where the old target is stored
   * @param {String} [config.canvasEvtOut] name of the event to fire at canvas level for out
   * @param {String} config.evtOut name of the event to fire for out
   * @param {String} [config.canvasEvtIn] name of the event to fire at canvas level for in
   * @param {String} config.evtIn name of the event to fire for in
   * @private
   */
  fireSyntheticInOutEvents: function (target, e, config) {
    var inOpt,
      outOpt,
      oldTarget = config.oldTarget,
      outFires,
      inFires,
      targetChanged = oldTarget !== target,
      canvasEvtIn = config.canvasEvtIn,
      canvasEvtOut = config.canvasEvtOut;
    if (targetChanged) {
      inOpt = { e: e, target: target, previousTarget: oldTarget };
      outOpt = { e: e, target: oldTarget, nextTarget: target };
    }
    inFires = target && targetChanged;
    outFires = oldTarget && targetChanged;
    if (outFires) {
      canvasEvtOut && this.fire(canvasEvtOut, outOpt);
      oldTarget.fire(config.evtOut, outOpt);
    }
    if (inFires) {
      canvasEvtIn && this.fire(canvasEvtIn, inOpt);
      target.fire(config.evtIn, inOpt);
    }
  },

  /**
   * Method that defines actions when an Event Mouse Wheel
   * @param {Event} e Event object fired on mouseup
   */
  __onMouseWheel: function (e) {
    this._cacheTransformEventData(e);
    this._handleEvent(e, 'wheel');
    this._resetTransformEventData();
  },

  /**
   * @private
   * @param {Event} e Event fired on mousemove
   */
  _transformObject: function (e) {
    var pointer = this.getPointer(e),
      transform = this._currentTransform;

    transform.reset = false;
    transform.target.isMoving = true;
    transform.shiftKey = e.shiftKey;
    transform.altKey = e[this.centeredKey];

    this._performTransformAction(e, transform, pointer);
    transform.actionPerformed && this.requestRenderAll();
  },

  /**
   * @private
   */
  _performTransformAction: function (e, transform, pointer) {
    var x = pointer.x,
      y = pointer.y,
      action = transform.action,
      actionPerformed = false,
      actionHandler = transform.actionHandler,
      // this object could be created from the function in the control handlers
      options = {
        target: transform.target,
        e: e,
        transform: transform,
        pointer: pointer,
      };

    if (action === 'drag') {
      actionPerformed = this._translateObject(x, y);
      if (actionPerformed) {
        this._fire('moving', options);
        this.setCursor(options.target.moveCursor || this.moveCursor);
      }
    } else if (actionHandler) {
      (actionPerformed = actionHandler(e, transform, x, y)) &&
        this._fire(action, options);
    }
    transform.actionPerformed = transform.actionPerformed || actionPerformed;
  },

  /**
   * @private
   */
  _fire: fabric.controlsUtils.fireEvent,

  /**
   * Sets the cursor depending on where the canvas is being hovered.
   * Note: very buggy in Opera
   * @param {Event} e Event object
   * @param {Object} target Object that the mouse is hovering, if so.
   */
  _setCursorFromEvent: function (e, target) {
    if (!target) {
      this.setCursor(this.defaultCursor);
      return false;
    }
    var hoverCursor = target.hoverCursor || this.hoverCursor,
      activeSelection =
        this._activeObject && this._activeObject.type === 'activeSelection'
          ? this._activeObject
          : null,
      // only show proper corner when group selection is not active
      corner =
        (!activeSelection || !activeSelection.contains(target)) &&
        // here we call findTargetCorner always with undefined for the touch parameter.
        // we assume that if you are using a cursor you do not need to interact with
        // the bigger touch area.
        target._findTargetCorner(this.getPointer(e, true));

    if (!corner) {
      if (target.subTargetCheck) {
        // hoverCursor should come from top-most subTarget,
        // so we walk the array backwards
        this.targets
          .concat()
          .reverse()
          .map(function (_target) {
            hoverCursor = _target.hoverCursor || hoverCursor;
          });
      }
      this.setCursor(hoverCursor);
    } else {
      this.setCursor(this.getCornerCursor(corner, target, e));
    }
  },

  /**
   * @private
   */
  getCornerCursor: function (corner, target, e) {
    var control = target.controls[corner];
    return control.cursorStyleHandler(e, control, target);
  },

  //  canvas_gestures.mixin.js
  /**
   * Method that defines actions when an Event.js gesture is detected on an object. Currently only supports
   * 2 finger gestures.
   * @param {Event} e Event object by Event.js
   * @param {Event} self Event proxy object by Event.js
   */
  __onTransformGesture: function (e, self) {
    if (
      this.isDrawingMode ||
      !e.touches ||
      e.touches.length !== 2 ||
      'gesture' !== self.gesture
    ) {
      return;
    }

    var target = this.findTarget(e);
    if ('undefined' !== typeof target) {
      this.__gesturesParams = {
        e: e,
        self: self,
        target: target,
      };

      this.__gesturesRenderer();
    }

    this.fire('touch:gesture', {
      target: target,
      e: e,
      self: self,
    });
  },
  __gesturesParams: null,
  __gesturesRenderer: function () {
    if (this.__gesturesParams === null || this._currentTransform === null) {
      return;
    }

    var self = this.__gesturesParams.self,
      t = this._currentTransform,
      e = this.__gesturesParams.e;

    t.action = 'scale';
    t.originX = t.originY = 'center';

    this._scaleObjectBy(self.scale, e);

    if (self.rotation !== 0) {
      t.action = 'rotate';
      this._rotateObjectByAngle(self.rotation, e);
    }

    this.requestRenderAll();

    t.action = 'drag';
  },

  /**
   * Method that defines actions when an Event.js drag is detected.
   *
   * @param {Event} e Event object by Event.js
   * @param {Event} self Event proxy object by Event.js
   */
  __onDrag: function (e, self) {
    this.fire('touch:drag', {
      e: e,
      self: self,
    });
  },

  /**
   * Method that defines actions when an Event.js orientation event is detected.
   *
   * @param {Event} e Event object by Event.js
   * @param {Event} self Event proxy object by Event.js
   */
  __onOrientationChange: function (e, self) {
    this.fire('touch:orientation', {
      e: e,
      self: self,
    });
  },

  /**
   * Method that defines actions when an Event.js shake event is detected.
   *
   * @param {Event} e Event object by Event.js
   * @param {Event} self Event proxy object by Event.js
   */
  __onShake: function (e, self) {
    this.fire('touch:shake', {
      e: e,
      self: self,
    });
  },

  /**
   * Method that defines actions when an Event.js longpress event is detected.
   *
   * @param {Event} e Event object by Event.js
   * @param {Event} self Event proxy object by Event.js
   */
  __onLongPress: function (e, self) {
    this.fire('touch:longpress', {
      e: e,
      self: self,
    });
  },

  /**
   * Scales an object by a factor
   * @param {Number} s The scale factor to apply to the current scale level
   * @param {Event} e Event object by Event.js
   */
  _scaleObjectBy: function (s, e) {
    var t = this._currentTransform,
      target = t.target;
    t.gestureScale = s;
    target._scaling = true;
    return fabric.controlsUtils.scalingEqually(e, t, 0, 0);
  },

  /**
   * Rotates object by an angle
   * @param {Number} curAngle The angle of rotation in degrees
   * @param {Event} e Event object by Event.js
   */
  _rotateObjectByAngle: function (curAngle, e) {
    var t = this._currentTransform;

    if (t.target.get('lockRotation')) {
      return;
    }
    t.target.rotate(radiansToDegrees(degreesToRadians(curAngle) + t.theta));
    this._fire('rotating', {
      target: t.target,
      e: e,
      transform: t,
    });
  },

  // canvas_grouping.mixin.js
  /**
   * @private
   * @param {Event} e Event object
   * @param {fabric.Object} target
   * @return {Boolean}
   */
  _shouldGroup: function (e, target) {
    var activeObject = this._activeObject;
    return (
      activeObject &&
      this._isSelectionKeyPressed(e) &&
      target &&
      target.selectable &&
      this.selection &&
      (activeObject !== target || activeObject.type === 'activeSelection') &&
      !target.onSelect({ e: e })
    );
  },

  /**
   * @private
   * @param {Event} e Event object
   * @param {fabric.Object} target
   */
  _handleGrouping: function (e, target) {
    var activeObject = this._activeObject;
    // avoid multi select when shift click on a corner
    if (activeObject.__corner) {
      return;
    }
    if (target === activeObject) {
      // if it's a group, find target again, using activeGroup objects
      target = this.findTarget(e, true);
      // if even object is not found or we are on activeObjectCorner, bail out
      if (!target || !target.selectable) {
        return;
      }
    }
    if (activeObject && activeObject.type === 'activeSelection') {
      this._updateActiveSelection(target, e);
    } else {
      this._createActiveSelection(target, e);
    }
  },

  /**
   * @private
   */
  _updateActiveSelection: function (target, e) {
    var activeSelection = this._activeObject,
      currentActiveObjects = activeSelection._objects.slice(0);
    if (activeSelection.contains(target)) {
      activeSelection.removeWithUpdate(target);
      this._hoveredTarget = target;
      this._hoveredTargets = this.targets.concat();
      if (activeSelection.size() === 1) {
        // activate last remaining object
        this._setActiveObject(activeSelection.item(0), e);
      }
    } else {
      activeSelection.addWithUpdate(target);
      this._hoveredTarget = activeSelection;
      this._hoveredTargets = this.targets.concat();
    }
    this._fireSelectionEvents(currentActiveObjects, e);
  },

  /**
   * @private
   */
  _createActiveSelection: function (target, e) {
    var currentActives = this.getActiveObjects(),
      group = this._createGroup(target);
    this._hoveredTarget = group;
    // ISSUE 4115: should we consider subTargets here?
    // this._hoveredTargets = [];
    // this._hoveredTargets = this.targets.concat();
    this._setActiveObject(group, e);
    this._fireSelectionEvents(currentActives, e);
  },

  /**
   * @private
   * @param {Object} target
   */
  _createGroup: function (target) {
    var objects = this._objects,
      isActiveLower = objects.indexOf(this._activeObject) < objects.indexOf(target),
      groupObjects = isActiveLower
        ? [this._activeObject, target]
        : [target, this._activeObject];
    this._activeObject.isEditing && this._activeObject.exitEditing();
    return new fabric.ActiveSelection(groupObjects, {
      canvas: this,
    });
  },

  /**
   * @private
   * @param {Event} e mouse event
   */
  _groupSelectedObjects: function (e) {
    var group = this._collectObjects(e),
      aGroup;

    // do not create group for 1 element only
    if (group.length === 1) {
      this.setActiveObject(group[0], e);
    } else if (group.length > 1) {
      aGroup = new fabric.ActiveSelection(group.reverse(), {
        canvas: this,
      });
      this.setActiveObject(aGroup, e);
    }
  },

  /**
   * @private
   */
  _collectObjects: function (e) {
    var group = [],
      currentObject,
      x1 = this._groupSelector.ex,
      y1 = this._groupSelector.ey,
      x2 = x1 + this._groupSelector.left,
      y2 = y1 + this._groupSelector.top,
      selectionX1Y1 = new fabric.Point(min(x1, x2), min(y1, y2)),
      selectionX2Y2 = new fabric.Point(max(x1, x2), max(y1, y2)),
      allowIntersect = !this.selectionFullyContained,
      isClick = x1 === x2 && y1 === y2;
    // we iterate reverse order to collect top first in case of click.
    for (var i = this._objects.length; i--; ) {
      currentObject = this._objects[i];

      if (!currentObject || !currentObject.selectable || !currentObject.visible) {
        continue;
      }

      if (
        (allowIntersect &&
          currentObject.intersectsWithRect(selectionX1Y1, selectionX2Y2)) ||
        currentObject.isContainedWithinRect(selectionX1Y1, selectionX2Y2) ||
        (allowIntersect && currentObject.containsPoint(selectionX1Y1)) ||
        (allowIntersect && currentObject.containsPoint(selectionX2Y2))
      ) {
        group.push(currentObject);
        // only add one object if it's a click
        if (isClick) {
          break;
        }
      }
    }

    if (group.length > 1) {
      group = group.filter(function (object) {
        return !object.onSelect({ e: e });
      });
    }

    return group;
  },

  /**
   * @private
   */
  _maybeGroupObjects: function (e) {
    if (this.selection && this._groupSelector) {
      this._groupSelectedObjects(e);
    }
    this.setCursor(this.defaultCursor);
    // clear selection and current transformation
    this._groupSelector = null;
  },
});

// copying static properties manually to work around Opera's bug,
// where "prototype" property is enumerable and overrides existing prototype
for (var prop in fabric.StaticCanvas) {
  if (prop !== 'prototype') {
    ECanvas[prop] = fabric.StaticCanvas[prop];
  }
}

export default ECanvas;
