import { fabric } from 'fabric';
import { forEach } from 'lodash';

var min = fabric.util.array.min,
  max = fabric.util.array.max;

const Group = fabric.util.createClass(fabric.Object, fabric.Collection, {
  type: 'Group',
  /**
   * Width of stroke
   * @type Number
   * @default
   */
  strokeWidth: 0,

  /**
   * Indicates if click, mouseover, mouseout events & hoverCursor should also check for subtargets
   * @type Boolean
   * @default true
   */
  subTargetCheck: true,

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
   * Groups are container, do not render anything on theyr own, ence no cache properties
   * @type Array
   * @default
   */
  cacheProperties: [],

  /**
   * setOnGroup is a method used for TextBox that is no more used since 2.0.0 The behavior is still
   * available setting this boolean to true.
   * @type Boolean
   * @since 2.0.0
   * @default
   */
  useSetOnGroup: false,

  /**
   * Constructor
   * @param {Object} objects Group objects
   * @param {Object} [options] Options object
   * @param {Boolean} [isAlreadyGrouped] if true, objects have been grouped already.
   * @return {Object} thisArg
   */
  initialize: function (objects, options, isAlreadyGrouped) {
    options = options || {};
    this._objects = [];
    // if objects enclosed in a group have been grouped already,
    // we cannot change properties of objects.
    // Thus we need to set options to group without objects,
    isAlreadyGrouped && this.callSuper('initialize', options);
    this._objects = objects || [];
    for (var i = this._objects.length; i--; ) {
      this._objects[i].group = this;
    }

    if (!isAlreadyGrouped) {
      var center = options && options.centerPoint;
      // we want to set origins before calculating the bounding box.
      // so that the topleft can be set with that in mind.
      // if specific top and left are passed, are overwritten later
      // with the callSuper('initialize', options)
      if (options.originX !== undefined) {
        this.originX = options.originX;
      }
      if (options.originY !== undefined) {
        this.originY = options.originY;
      }
      // if coming from svg i do not want to calc bounds.
      // i assume width and height are passed along options
      center || this._calcBounds();
      this._updateObjectsCoords(center);
      delete options.centerPoint;
      this.callSuper('initialize', options);
    } else {
      this._updateObjectsACoords();
    }

    this.setCoords();

    this.initAddedHandler();
    this.initRemovedHandler();
  },

  /**
   * @private
   */
  _updateObjectsACoords: function () {
    var skipControls = true;
    for (var i = this._objects.length; i--; ) {
      this._objects[i].setCoords(skipControls);
    }
  },

  /**
   * @private
   * @param {Boolean} [skipCoordsChange] if true, coordinates of objects enclosed in a group do not change
   */
  _updateObjectsCoords: function (center) {
    var center = center || this.getCenterPoint();
    for (var i = this._objects.length; i--; ) {
      this._updateObjectCoords(this._objects[i], center);
    }
  },

  /**
   * @private
   * @param {Object} object
   * @param {fabric.Point} center, current center of group.
   */
  _updateObjectCoords: function (object, center) {
    var objectLeft = object.left,
      objectTop = object.top,
      skipControls = true;

    object.set({
      left: objectLeft - center.x,
      top: objectTop - center.y,
    });
    object.group = this;
    object.setCoords(skipControls);
  },

  /**
   * Returns string represenation of a group
   * @return {String}
   */
  toString: function () {
    return '#<fabric.Group: (' + this.complexity() + ')>';
  },

  /**
   * Adds an object to a group; Then recalculates group's dimension, position.
   * @param {Object} object
   * @return {fabric.Group} thisArg
   * @chainable
   */
  addWithUpdate: function (object) {
    this._restoreObjectsState();
    fabric.util.resetObjectTransform(this);
    if (object) {
      this._objects.push(object);
      object.group = this;
      object._set('canvas', this.canvas);
    }
    this._calcBounds();
    this._updateObjectsCoords();
    this.setCoords();
    this.dirty = true;
    return this;
  },

  /**
   * Removes an object from a group; Then recalculates group's dimension, position.
   * @param {Object} object
   * @return {fabric.Group} thisArg
   * @chainable
   */
  removeWithUpdate: function (object) {
    this._restoreObjectsState();
    fabric.util.resetObjectTransform(this);

    this.remove(object);
    this._calcBounds();
    this._updateObjectsCoords();
    this.setCoords();
    this.dirty = true;
    return this;
  },

  /**
   * @private
   */
  _onObjectAdded: function (object) {
    this.dirty = true;
    object.group = this;
    object._set('canvas', this.canvas);
  },

  /**
   * @private
   */
  _onObjectRemoved: function (object) {
    this.dirty = true;
    delete object.group;
  },

  /**
   * @private
   */
  _set: function (key, value) {
    var i = this._objects.length;
    if (this.useSetOnGroup) {
      while (i--) {
        this._objects[i].setOnGroup(key, value);
      }
    }
    if (key === 'canvas') {
      while (i--) {
        this._objects[i]._set(key, value);
      }
    }
    fabric.Object.prototype._set.call(this, key, value);
  },

  /**
   * Returns object representation of an instance
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} object representation of an instance
   */
  toObject: function (propertiesToInclude) {
    var _includeDefaultValues = this.includeDefaultValues;
    var objsToObject = this._objects.map(function (obj) {
      var originalDefaults = obj.includeDefaultValues;
      obj.includeDefaultValues = _includeDefaultValues;
      var _obj = obj.toObject(propertiesToInclude);
      obj.includeDefaultValues = originalDefaults;
      return _obj;
    });
    var obj = fabric.Object.prototype.toObject.call(this, propertiesToInclude);
    obj.objects = objsToObject;
    return obj;
  },

  /**
   * Returns object representation of an instance, in dataless mode.
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} object representation of an instance
   */
  toDatalessObject: function (propertiesToInclude) {
    var objsToObject,
      sourcePath = this.sourcePath;
    if (sourcePath) {
      objsToObject = sourcePath;
    } else {
      var _includeDefaultValues = this.includeDefaultValues;
      objsToObject = this._objects.map(function (obj) {
        var originalDefaults = obj.includeDefaultValues;
        obj.includeDefaultValues = _includeDefaultValues;
        var _obj = obj.toDatalessObject(propertiesToInclude);
        obj.includeDefaultValues = originalDefaults;
        return _obj;
      });
    }
    var obj = fabric.Object.prototype.toDatalessObject.call(this, propertiesToInclude);
    obj.objects = objsToObject;
    return obj;
  },

  /**
   * Renders instance on a given context
   * @param {CanvasRenderingContext2D} ctx context to render instance on
   */
  render: function (ctx) {
    this._transformDone = true;
    this.callSuper('render', ctx);
    this._transformDone = false;
  },

  /**
   * Decide if the object should cache or not. Create its own cache level
   * needsItsOwnCache should be used when the object drawing method requires
   * a cache step. None of the fabric classes requires it.
   * Generally you do not cache objects in groups because the group is already cached.
   * @return {Boolean}
   */
  shouldCache: function () {
    var ownCache = fabric.Object.prototype.shouldCache.call(this);
    if (ownCache) {
      for (var i = 0, len = this._objects.length; i < len; i++) {
        if (this._objects[i].willDrawShadow()) {
          this.ownCaching = false;
          return false;
        }
      }
    }
    return ownCache;
  },

  /**
   * Check if this object or a child object will cast a shadow
   * @return {Boolean}
   */
  willDrawShadow: function () {
    if (fabric.Object.prototype.willDrawShadow.call(this)) {
      return true;
    }
    for (var i = 0, len = this._objects.length; i < len; i++) {
      if (this._objects[i].willDrawShadow()) {
        return true;
      }
    }
    return false;
  },

  /**
   * Check if this group or its parent group are caching, recursively up
   * @return {Boolean}
   */
  isOnACache: function () {
    return this.ownCaching || (this.group && this.group.isOnACache());
  },

  /**
   * Execute the drawing operation for an object on a specified context
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  drawObject: function (ctx) {
    for (var i = 0, len = this._objects.length; i < len; i++) {
      this._objects[i].render(ctx);
    }
    this._drawClipPath(ctx);
  },

  /**
   * Check if cache is dirty
   */
  isCacheDirty: function (skipCanvas) {
    if (this.callSuper('isCacheDirty', skipCanvas)) {
      return true;
    }
    if (!this.statefullCache) {
      return false;
    }
    for (var i = 0, len = this._objects.length; i < len; i++) {
      if (this._objects[i].isCacheDirty(true)) {
        if (this._cacheCanvas) {
          // if this group has not a cache canvas there is nothing to clean
          var x = this.cacheWidth / this.zoomX,
            y = this.cacheHeight / this.zoomY;
          this._cacheContext.clearRect(-x / 2, -y / 2, x, y);
        }
        return true;
      }
    }
    return false;
  },

  /**
   * Retores original state of each of group objects (original state is that which was before group was created).
   * @private
   * @return {fabric.Group} thisArg
   * @chainable
   */
  _restoreObjectsState: function () {
    this._objects.forEach(this._restoreObjectState, this);
    return this;
  },

  /**
   * Realises the transform from this group onto the supplied object
   * i.e. it tells you what would happen if the supplied object was in
   * the group, and then the group was destroyed. It mutates the supplied
   * object.
   * @param {fabric.Object} object
   * @return {fabric.Object} transformedObject
   */
  realizeTransform: function (object) {
    var matrix = object.calcTransformMatrix(),
      options = fabric.util.qrDecompose(matrix),
      center = new fabric.Point(options.translateX, options.translateY);
    object.flipX = false;
    object.flipY = false;
    object.set('scaleX', options.scaleX);
    object.set('scaleY', options.scaleY);
    object.skewX = options.skewX;
    object.skewY = options.skewY;
    object.angle = options.angle;
    object.setPositionByOrigin(center, 'center', 'center');
    return object;
  },

  /**
   * Restores original state of a specified object in group
   * @private
   * @param {fabric.Object} object
   * @return {fabric.Group} thisArg
   */
  _restoreObjectState: function (object) {
    this.realizeTransform(object);
    delete object.group;
    object.setCoords();
    return this;
  },

  /**
   * Destroys a group (restoring state of its objects)
   * @return {fabric.Group} thisArg
   * @chainable
   */
  destroy: function () {
    // when group is destroyed objects needs to get a repaint to be eventually
    // displayed on canvas.
    this._objects.forEach(function (object) {
      object.set('dirty', true);
    });
    return this._restoreObjectsState();
  },

  /**
   * make a group an active selection, remove the group from canvas
   * the group has to be on canvas for this to work.
   * @return {fabric.ActiveSelection} thisArg
   * @chainable
   */
  toActiveSelection: function () {
    if (!this.canvas) {
      return;
    }
    var objects = this._objects,
      canvas = this.canvas;
    this._objects = [];
    var options = this.toObject();
    delete options.objects;
    var activeSelection = new fabric.ActiveSelection([]);
    activeSelection.set(options);
    activeSelection.type = 'activeSelection';
    canvas.remove(this);
    objects.forEach(function (object) {
      object.group = activeSelection;
      object.dirty = true;
      canvas.add(object);
    });
    activeSelection.canvas = canvas;
    activeSelection._objects = objects;
    canvas._activeObject = activeSelection;
    activeSelection.setCoords();
    return activeSelection;
  },

  /**
   * Destroys a group (restoring state of its objects)
   * @return {fabric.Group} thisArg
   * @chainable
   */
  ungroupOnCanvas: function () {
    return this._restoreObjectsState();
  },

  /**
   * Sets coordinates of all objects inside group
   * @return {fabric.Group} thisArg
   * @chainable
   */
  setObjectsCoords: function () {
    var skipControls = true;
    this.forEachObject(function (object) {
      object.setCoords(skipControls);
    });
    return this;
  },

  /**
   * @private
   */
  _calcBounds: function (onlyWidthHeight) {
    var aX = [],
      aY = [],
      o,
      prop,
      props = ['tr', 'br', 'bl', 'tl'],
      i = 0,
      iLen = this._objects.length,
      j,
      jLen = props.length;

    for (; i < iLen; ++i) {
      o = this._objects[i];
      o.aCoords = o.calcACoords();
      for (j = 0; j < jLen; j++) {
        prop = props[j];
        aX.push(o.aCoords[prop].x);
        aY.push(o.aCoords[prop].y);
      }
    }

    this._getBounds(aX, aY, onlyWidthHeight);
  },

  /**
   * @private
   */
  _getBounds: function (aX, aY, onlyWidthHeight) {
    var minXY = new fabric.Point(min(aX), min(aY)),
      maxXY = new fabric.Point(max(aX), max(aY)),
      top = minXY.y || 0,
      left = minXY.x || 0,
      width = maxXY.x - minXY.x || 0,
      height = maxXY.y - minXY.y || 0;
    this.width = width;
    this.height = height;
    if (!onlyWidthHeight) {
      // the bounding box always finds the topleft most corner.
      // whatever is the group origin, we set up here the left/top position.
      this.setPositionByOrigin({ x: left, y: top }, 'left', 'top');
    }
  },

  /* _TO_SVG_START_ */
  /**
   * Returns svg representation of an instance
   * @param {Function} [reviver] Method for further parsing of svg representation.
   * @return {String} svg representation of an instance
   */
  _toSVG: function (reviver) {
    var svgString = ['<g ', 'COMMON_PARTS', ' >\n'];

    for (var i = 0, len = this._objects.length; i < len; i++) {
      svgString.push('\t\t', this._objects[i].toSVG(reviver));
    }
    svgString.push('</g>\n');
    return svgString;
  },

  /**
   * Returns styles-string for svg-export, specific version for group
   * @return {String}
   */
  getSvgStyles: function () {
    var opacity =
        typeof this.opacity !== 'undefined' && this.opacity !== 1
          ? 'opacity: ' + this.opacity + ';'
          : '',
      visibility = this.visible ? '' : ' visibility: hidden;';
    return [opacity, this.getSvgFilter(), visibility].join('');
  },

  /**
   * Returns svg clipPath representation of an instance
   * @param {Function} [reviver] Method for further parsing of svg representation.
   * @return {String} svg representation of an instance
   */
  toClipPathSVG: function (reviver) {
    var svgString = [];

    for (var i = 0, len = this._objects.length; i < len; i++) {
      svgString.push('\t', this._objects[i].toClipPathSVG(reviver));
    }

    return this._createBaseClipPathSVGMarkup(svgString, { reviver: reviver });
  },
  /* _TO_SVG_END_ */

  // custom added

  /**
   * onDeselect subObjects
   */
  onDeselect: function () {
    if (this.getObjects) {
      const subObjects = this.getObjects();
      forEach(subObjects, (item) => {
        item.onDeselect();
      });
    }
  },

  /**
   * remove canvas event to manage exiting on other instances
   * @private
   */
  _removeCanvasHandlers: function (canvas) {
    canvas.off('mouse:up', canvas._mouseUpITextHandler);
  },

  /**
   * Initializes "added" event handler
   */
  initAddedHandler: function () {
    var _this = this;
    this.on('added', function () {
      const subObjects = this.getObjects();
      var canvas = _this.canvas;
      if (canvas) {
        forEach(subObjects, (item) => {
          if (!canvas._hasITextHandlers) {
            canvas._hasITextHandlers = true;
            item._initCanvasHandlers(canvas);
          }
          canvas._iTextInstances = canvas._iTextInstances || [];
          canvas._iTextInstances.push(item);
        });
      }
    });
  },

  initRemovedHandler: function () {
    var _this = this;
    this.on('removed', function () {
      const subObjects = this.getObjects();
      var canvas = _this.canvas;
      if (canvas) {
        forEach(subObjects, (item) => {
          canvas._iTextInstances = canvas._iTextInstances || [];
          fabric.util.removeFromArray(canvas._iTextInstances, item);
          if (canvas._iTextInstances.length === 0) {
            canvas._hasITextHandlers = false;
            _this._removeCanvasHandlers(canvas);
          }
        });
      }
    });
  },
});

/**
 * Returns {@link fabric.Group} instance from an object representation
 * @static
 * @memberOf fabric.Group
 * @param {Object} object Object to create a group from
 * @param {Function} [callback] Callback to invoke when an group instance is created
 */
Group.fromObject = function (object, callback) {
  var objects = object.objects,
    options = fabric.util.object.clone(object, true);
  delete options.objects;
  if (typeof objects === 'string') {
    // it has to be an url or something went wrong.
    fabric.loadSVGFromURL(objects, function (elements) {
      var group = fabric.util.groupSVGElements(elements, object, objects);
      group.set(options);
      callback && callback(group);
    });
    return;
  }
  fabric.util.enlivenObjects(objects, function (enlivenedObjects) {
    fabric.util.enlivenObjects([object.clipPath], function (enlivedClipPath) {
      var options = fabric.util.object.clone(object, true);
      options.clipPath = enlivedClipPath[0];
      delete options.objects;
      callback && callback(Group(enlivenedObjects, options, true));
    });
  });
};

export default Group;