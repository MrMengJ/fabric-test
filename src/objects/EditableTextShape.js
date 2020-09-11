// import { fabric } from '../dist/fabric';
import { fabric } from 'fabric';
import { get, max } from 'lodash';

var clone = fabric.util.object.clone;

const defaultTextStyle = {
  stroke: null,
  strokeWidth: 1,
  fill: '#000',
};

const EditableTextShape = fabric.util.createClass(fabric.Object, {
  type: 'editableTextShape',

  /**
   * Horizontal border radius
   * @type Number
   * @default
   */
  rx: 0,

  /**
   * Vertical border radius
   * @type Number
   * @default
   */
  ry: 0,

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
    'textStyles',
    'width',
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
   * Text vertical alignment. Possible values: "top", "middle", "bottom",
   * @type String
   * @default
   */
  verticalAlign: 'top',

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
    'charSpacing',
    'textStyle',
    'textStyles'
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
    'charSpacing',
    'textStyle',
    'textStyles'
  ),

  /**
   * When `false`, the stoke width will scale with the object.
   * When `true`, the stroke will always match the exact pixel size entered for stroke width.
   * default to false
   * @since 2.6.0
   * @type Boolean
   * @default false
   * @type Boolean
   * @default false
   */
  strokeUniform: true,

  /**
   * Shadow object representing shadow of this shape.
   * <b>Backwards incompatibility note:</b> This property was named "textShadow" (String) until v1.2.11
   * @type fabric.Shadow
   * @default
   */
  shadow: null,

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
   * text style
   * @type Object
   * @default
   */
  textStyle: defaultTextStyle,

  /**
   * Object containing character textStyles - top-level properties -> line numbers,
   * 2nd-level properties - charater numbers
   * @type Object
   * @default
   */
  textStyles: null,

  /**
   * Baseline shift, stlyes only, keep at 0 for the main text object
   * @type {Number}
   * @default
   */
  deltaY: 0,

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
   * Array of properties that define a style unit (of 'textStyles').
   * @type {Array}
   * @default
   */
  _textStyleProperties: [
    'stroke',
    'strokeWidth',
    'fill',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'underline',
    'overline',
    'linethrough',
    'deltaY',
  ],

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
   * When true, objects use center point as the origin of scale transformation.
   * <b>Backwards incompatibility note:</b> This property replaces "centerTransform" (Boolean).
   * @since 1.3.4
   * @type Boolean
   * @default
   */
  centeredScaling: true,

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
   * Constructor
   * @param {Object} [options] Options object
   * @return {EditableTextShape} thisArg
   */
  initialize: function (options = {}) {
    // rect
    this._initRxRy();

    // text
    this.textStyle = options
      ? { ...defaultTextStyle, ...options.textStyle }
      : this.textStyle;
    this.textStyles = options ? options.textStyles || {} : {};
    this.set('text', get(options, 'text', ''));
    this.__skipDimension = true;
    this.callSuper('initialize', options);
    this.__skipDimension = false;
    this.initDimensions();
    this.setupState({ propertySet: '_dimensionAffectingProps' });
    this.initBehavior();
  },

  /**
   * Initializes rx/ry attributes
   * @private
   */
  _initRxRy: function () {
    if (this.rx && !this.ry) {
      this.ry = this.rx;
    } else if (this.ry && !this.rx) {
      this.rx = this.ry;
    }
  },

  /**
   * Renders text instance on a specified context
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  render: function (ctx) {
    // IText
    this.clearContextTop();

    // Text
    // do not render if object is not visible
    if (!this.visible) {
      return;
    }
    if (this.canvas && this.canvas.skipOffscreen && !this.group && !this.isOnScreen()) {
      return;
    }
    if (this._shouldClearDimensionCache()) {
      this.initDimensions();
    }
    this.callSuper('render', ctx);

    // IText
    // clear the cursorOffsetCache, so we ensure to calculate once per renderCursor
    // the correct position but not at every cursor animation.
    this.cursorOffsetCache = {};
    this.renderCursorOrSelection();
  },

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _render: function (ctx) {
    // render rect
    var rx = this.rx ? Math.min(this.rx, this.width / 2) : 0,
      ry = this.ry ? Math.min(this.ry, this.height / 2) : 0,
      w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2,
      isRounded = rx !== 0 || ry !== 0,
      /* "magic number" for bezier approximations of arcs (http://itc.ktu.lt/itc354/Riskus354.pdf) */
      k = 1 - 0.5522847498;
    ctx.beginPath();

    ctx.moveTo(x + rx, y);

    ctx.lineTo(x + w - rx, y);
    isRounded && ctx.bezierCurveTo(x + w - k * rx, y, x + w, y + k * ry, x + w, y + ry);

    ctx.lineTo(x + w, y + h - ry);
    isRounded &&
      ctx.bezierCurveTo(x + w, y + h - k * ry, x + w - k * rx, y + h, x + w - rx, y + h);

    ctx.lineTo(x + rx, y + h);
    isRounded && ctx.bezierCurveTo(x + k * rx, y + h, x, y + h - k * ry, x, y + h - ry);

    ctx.lineTo(x, y + ry);
    isRounded && ctx.bezierCurveTo(x, y + k * ry, x + k * rx, y, x + rx, y);

    ctx.closePath();

    this._renderPaintInOrder(ctx);

    // initDimensions
    this.initDimensions();

    // render text handler

    // set ctx to avoid text scale
    this._resetCtxScaleForTextRender(ctx);

    // ctx.translate(
    //   -((this.width / 2) * max([scaleX - 1, 0])),
    //   -((this.height / 2) * max([scaleY - 1, 0]))
    // );

    // render text
    this._setTextStyles(ctx);
    this._renderTextDecoration(ctx, 'underline');
    this._renderText(ctx);
    this._renderTextDecoration(ctx, 'overline');
    this._renderTextDecoration(ctx, 'linethrough');
  },

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderDashedStroke: function (ctx) {
    var x = -this.width / 2,
      y = -this.height / 2,
      w = this.width,
      h = this.height;

    ctx.beginPath();
    fabric.util.drawDashedLine(ctx, x, y, x + w, y, this.strokeDashArray);
    fabric.util.drawDashedLine(ctx, x + w, y, x + w, y + h, this.strokeDashArray);
    fabric.util.drawDashedLine(ctx, x + w, y + h, x, y + h, this.strokeDashArray);
    fabric.util.drawDashedLine(ctx, x, y + h, x, y, this.strokeDashArray);
    ctx.closePath();
  },

  /**
   * Returns object representation of an instance
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} object representation of an instance
   */
  toObject: function (propertiesToInclude) {
    var additionalProperties = [
      'text',
      'fontSize',
      'fontWeight',
      'fontFamily',
      'fontStyle',
      'lineHeight',
      'underline',
      'overline',
      'linethrough',
      'textAlign',
      'charSpacing',
      'rx',
      'ry',
      'minWidth',
      'splitByGrapheme',
    ].concat(propertiesToInclude);
    var obj = this.callSuper('toObject', additionalProperties);
    obj.textStyle = clone(this.textStyle, true);
    obj.textStyles = clone(this.textStyles, true);
    return obj;
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
    for (var i = 0; i < this._textStyleProperties.length; i++) {
      prop = this._textStyleProperties[i];
      styleObject[prop] =
        typeof style[prop] === 'undefined'
          ? this.textStyle[prop]
            ? this.textStyle[prop]
            : this[prop]
          : style[prop];
    }
    return styleObject;
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
   * Initialize or update text dimensions.
   * Updates this.width and this.height with the proper values.
   * Does not return dimensions.
   */
  initDimensions: function () {
    if (this.__skipDimension) {
      return;
    }
    this.isEditing && this.initDelayedCursor();
    this.clearContextTop();
    this._splitText();
    this._clearCache();
    // clear dynamicMinWidth as it will be different after we re-wrap line
    this.dynamicMinWidth = 0;
    // wrap lines
    this._styleMap = this._generateStyleMap(this._splitText());
    // if after wrapping, the width is smaller than dynamicMinWidth, change the width and re-wrap
    if (this.dynamicMinWidth > this.width) {
      this._set('width', this.dynamicMinWidth);
    }
    if (this.textAlign.indexOf('justify') !== -1) {
      // once text is measured we need to make space fatter to make justified text.
      this.enlargeSpaces();
    }
    this.saveState({ propertySet: '_dimensionAffectingProps' });
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
   * return font declaration string for canvas context
   * @param {Object} [styleObject] object
   * @returns {String} font declaration formatted for canvas context.
   */
  _getFontDeclaration: function (styleObject, forMeasuring) {
    var style = styleObject || this,
      family = this.fontFamily,
      fontIsGeneric = EditableTextShape.genericFonts.indexOf(family.toLowerCase()) > -1;
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
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderTextDecoration: function (ctx, type) {
    if (!this[type] && !this.styleHas(type)) {
      return;
    }
    var heightOfLine,
      size,
      _size,
      lineLeftOffset,
      dy,
      _dy,
      line,
      lastDecoration,
      leftOffset = this._getLeftOffset(),
      topOffset = this._getTopOffset(),
      top,
      boxStart,
      boxWidth,
      charBox,
      currentDecoration,
      maxHeight,
      stroke = this.textStyle.stroke,
      strokeWidth = this.textStyle.strokeWidth,
      currentFill,
      lastFill,
      charSpacing = this._getWidthOfCharSpacing();

    for (var i = 0, len = this._textLines.length; i < len; i++) {
      heightOfLine = this.getHeightOfLine(i);
      if (!this[type] && !this.styleHas(type, i)) {
        topOffset += heightOfLine;
        continue;
      }
      line = this._textLines[i];
      maxHeight = heightOfLine / this.lineHeight;
      lineLeftOffset = this._getLineLeftOffset(i);
      boxStart = 0;
      boxWidth = 0;
      lastDecoration = this.getValueOfPropertyAt(i, 0, type);
      lastFill = this.getValueOfPropertyAt(
        i,
        0,
        stroke && strokeWidth >= 1 ? 'stroke' : 'fill'
      );
      top = topOffset + maxHeight * (1 - this._fontSizeFraction);
      size = this.getHeightOfChar(i, 0);
      dy = this.getValueOfPropertyAt(i, 0, 'deltaY');
      for (var j = 0, jlen = line.length; j < jlen; j++) {
        charBox = this.__charBounds[i][j];
        currentDecoration = this.getValueOfPropertyAt(i, j, type);
        currentFill = this.getValueOfPropertyAt(
          i,
          j,
          stroke && strokeWidth >= 1 ? 'stroke' : 'fill'
        );
        _size = this.getHeightOfChar(i, j);
        _dy = this.getValueOfPropertyAt(i, j, 'deltaY');
        if (
          (currentDecoration !== lastDecoration ||
            currentFill !== lastFill ||
            _size !== size ||
            _dy !== dy) &&
          boxWidth > 0
        ) {
          ctx.fillStyle = lastFill;
          lastDecoration &&
            lastFill &&
            ctx.fillRect(
              leftOffset + lineLeftOffset + boxStart,
              top + this.offsets[type] * size + dy,
              boxWidth,
              this.fontSize / 15
            );
          boxStart = charBox.left;
          boxWidth = charBox.width;
          lastDecoration = currentDecoration;
          lastFill = currentFill;
          size = _size;
          dy = _dy;
        } else {
          boxWidth += charBox.kernedWidth;
        }
      }
      ctx.fillStyle = currentFill;
      currentDecoration &&
        currentFill &&
        ctx.fillRect(
          leftOffset + lineLeftOffset + boxStart,
          top + this.offsets[type] * size + dy,
          boxWidth - charSpacing,
          this.fontSize / 15
        );
      topOffset += heightOfLine;
    }
    // if there is text background color no
    // other shadows should be casted
    this._removeShadow(ctx);
  },

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderText: function (ctx) {
    if (this.paintFirst === 'stroke') {
      this._renderTextStroke(ctx);
      this._renderTextFill(ctx);
    } else {
      this._renderTextFill(ctx);
      this._renderTextStroke(ctx);
    }
  },

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderTextFill: function (ctx) {
    if (!this.textStyle.fill && !this.styleHas('fill')) {
      return;
    }
    this._renderTextCommon(ctx, 'fillText');
  },

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
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
    this._setLineDash(ctx, this.strokeDashArray);
    ctx.beginPath();
    this._renderTextCommon(ctx, 'strokeText');
    ctx.closePath();
    ctx.restore();
  },

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {String} method Method name ("fillText" or "strokeText")
   */
  _renderTextCommon: function (ctx, method) {
    ctx.save();
    var lineHeights = 0,
      left = this._getLeftOffset(),
      top = this._getTopOffset(),
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
    if (!this.textStyles) {
      return true;
    }
    var offset = 0,
      nextLineIndex = lineIndex + 1,
      nextOffset,
      obj,
      shouldLimit = false,
      map = this._styleMap[lineIndex],
      mapNextLine = this._styleMap[lineIndex + 1];
    if (map) {
      lineIndex = map.line;
      offset = map.offset;
    }
    if (mapNextLine) {
      nextLineIndex = mapNextLine.line;
      shouldLimit = nextLineIndex === lineIndex;
      nextOffset = mapNextLine.offset;
    }
    obj =
      typeof lineIndex === 'undefined'
        ? this.textStyles
        : { line: this.textStyles[lineIndex] };
    for (var p1 in obj) {
      for (var p2 in obj[p1]) {
        if (p2 >= offset && (!shouldLimit || p2 < nextOffset)) {
          // eslint-disable-next-line no-unused-vars
          for (var p3 in obj[p1][p2]) {
            return false;
          }
        }
      }
    }
    return true;
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
      shouldFill = method === 'fillText' && fullDecl.fill,
      shouldStroke = method === 'strokeText' && fullDecl.stroke && fullDecl.strokeWidth;

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
    this._setFillStyles(ctx, styleDeclaration);
    this._setStrokeStyles(ctx, styleDeclaration);

    ctx.font = this._getFontDeclaration(styleDeclaration);
  },

  /**
   * Returns true if object has a style property or has it ina specified line
   * This function is used to detect if a text will use a particular property or not.
   * @param {String} property to check for
   * @param {Number} lineIndex to check the style on
   * @return {Boolean}
   */
  styleHas: function (property, lineIndex) {
    // Textbox duplicate
    if (this._styleMap && !this.isWrapping) {
      var map = this._styleMap[lineIndex];
      if (map) {
        lineIndex = map.line;
      }
    }

    // Text duplicate
    if (!this.textStyles || !property || property === '') {
      return false;
    }
    if (typeof lineIndex !== 'undefined' && !this.textStyles[lineIndex]) {
      return false;
    }
    var obj =
      typeof lineIndex === 'undefined'
        ? this.textStyles
        : { 0: this.textStyles[lineIndex] };
    // eslint-disable-next-line
    for (var p1 in obj) {
      // eslint-disable-next-line
      for (var p2 in obj[p1]) {
        if (typeof obj[p1][p2][property] !== 'undefined') {
          return true;
        }
      }
    }
    return false;
  },

  /**
   * @private
   * @return {Number} Left offset
   */
  _getLeftOffset: function () {
    return -this._getActualWidth() / 2;
  },

  /**
   * @private
   * @return {Number} Top offset
   */
  _getTopOffset: function () {
    if (this.verticalAlign === 'top') {
      return -this._getActualHeight() / 2;
    } else if (this.verticalAlign === 'middle') {
      return -this.calcTextHeight() / 2;
    } else if (this.verticalAlign === 'bottom') {
      return -(this.calcTextHeight() - this._getActualHeight() / 2);
    }
    return -this._getActualHeight() / 2;
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

  _getWidthOfCharSpacing: function () {
    if (this.charSpacing !== 0) {
      return (this.fontSize * this.charSpacing) / 1000;
    }
    return 0;
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
   * @private
   * @param {Number} lineIndex index text line
   * @return {Number} Line left offset
   */
  _getLineLeftOffset: function (lineIndex) {
    const actualWidth = this._getActualWidth();
    var lineWidth = this.getLineWidth(lineIndex);
    if (this.textAlign === 'center') {
      return (actualWidth - lineWidth) / 2;
    }
    if (this.textAlign === 'right') {
      return actualWidth - lineWidth;
    }
    if (this.textAlign === 'justify-center' && this.isEndOfWrapping(lineIndex)) {
      return (actualWidth - lineWidth) / 2;
    }
    if (this.textAlign === 'justify-right' && this.isEndOfWrapping(lineIndex)) {
      return actualWidth - lineWidth;
    }
    return 0;
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
    return this.textStyle[property] ? this.textStyle[property] : this[property];
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
        currentLineWidth < this.width &&
        (spaces = this.textLines[i].match(this._reSpacesAndTabs))
      ) {
        numberOfSpaces = spaces.length;
        diffSpace = (this.width - currentLineWidth) / numberOfSpaces;
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
   * Returns string representation of an instance
   * @return {String} String representation of text object
   */
  toString: function () {
    return (
      '#<fabric.Text (' +
      this.complexity() +
      '): { "text": "' +
      this.text +
      '", "fontFamily": "' +
      this.fontFamily +
      '" }>'
    );
  },

  /**
   * Return the dimension and the zoom level needed to create a cache canvas
   * big enough to host the object to be cached.
   * @private
   * @param {Object} dim.x width of object to be cached
   * @param {Object} dim.y height of object to be cached
   * @return {Object}.width width of canvas
   * @return {Object}.height height of canvas
   * @return {Object}.zoomX zoomX zoom value to unscale the canvas before drawing cache
   * @return {Object}.zoomY zoomY zoom value to unscale the canvas before drawing cache
   */
  _getCacheCanvasDimensions: function () {
    var dims = this.callSuper('_getCacheCanvasDimensions');
    var fontSize = this.fontSize;
    dims.width += fontSize * dims.zoomX;
    // dims.height 是cacheCanvas 的高度
    dims.height =
      max([dims.height, this.calcTextHeight() * dims.zoomY]) + fontSize * dims.zoomY;
    return dims;
  },

  /**
   * Renders the text background for lines, taking care of style
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderTextLinesBackground: function (ctx) {
    if (!this.textBackgroundColor && !this.styleHas('textBackgroundColor')) {
      return;
    }
    var lineTopOffset = 0,
      heightOfLine,
      lineLeftOffset,
      originalFill = ctx.fillStyle,
      line,
      lastColor,
      leftOffset = this._getLeftOffset(),
      topOffset = this._getTopOffset(),
      boxStart = 0,
      boxWidth = 0,
      charBox,
      currentColor;

    for (var i = 0, len = this._textLines.length; i < len; i++) {
      heightOfLine = this.getHeightOfLine(i);
      if (!this.textBackgroundColor && !this.styleHas('textBackgroundColor', i)) {
        lineTopOffset += heightOfLine;
        continue;
      }
      line = this._textLines[i];
      lineLeftOffset = this._getLineLeftOffset(i);
      boxWidth = 0;
      boxStart = 0;
      lastColor = this.getValueOfPropertyAt(i, 0, 'textBackgroundColor');
      for (var j = 0, jlen = line.length; j < jlen; j++) {
        charBox = this.__charBounds[i][j];
        currentColor = this.getValueOfPropertyAt(i, j, 'textBackgroundColor');
        if (currentColor !== lastColor) {
          ctx.fillStyle = lastColor;
          lastColor &&
            ctx.fillRect(
              leftOffset + lineLeftOffset + boxStart,
              topOffset + lineTopOffset,
              boxWidth,
              heightOfLine / this.lineHeight
            );
          boxStart = charBox.left;
          boxWidth = charBox.width;
          lastColor = currentColor;
        } else {
          boxWidth += charBox.kernedWidth;
        }
      }
      if (currentColor) {
        ctx.fillStyle = currentColor;
        ctx.fillRect(
          leftOffset + lineLeftOffset + boxStart,
          topOffset + lineTopOffset,
          boxWidth,
          heightOfLine / this.lineHeight
        );
      }
      lineTopOffset += heightOfLine;
    }
    ctx.fillStyle = originalFill;
    // if there is text background color no
    // other shadows should be casted
    this._removeShadow(ctx);
  },

  /**
   * Turns the character into a 'superior figure' (i.e. 'superscript')
   * @param {Number} start selection start
   * @param {Number} end selection end
   * @returns {fabric.Text} thisArg
   * @chainable
   */
  setSuperscript: function (start, end) {
    return this._setScript(start, end, this.superscript);
  },

  /**
   * Turns the character into an 'inferior figure' (i.e. 'subscript')
   * @param {Number} start selection start
   * @param {Number} end selection end
   * @returns {fabric.Text} thisArg
   * @chainable
   */
  setSubscript: function (start, end) {
    return this._setScript(start, end, this.subscript);
  },

  /**
   * Applies 'schema' at given position
   * @private
   * @param {Number} start selection start
   * @param {Number} end selection end
   * @param {Number} schema
   * @returns {fabric.Text} thisArg
   * @chainable
   */
  _setScript: function (start, end, schema) {
    var loc = this.get2DCursorLocation(start, true),
      fontSize = this.getValueOfPropertyAt(loc.lineIndex, loc.charIndex, 'fontSize'),
      dy = this.getValueOfPropertyAt(loc.lineIndex, loc.charIndex, 'deltaY'),
      style = {
        fontSize: fontSize * schema.size,
        deltaY: dy + fontSize * schema.baseline,
      };
    this.setSelectionStyles(style, start, end);
    return this;
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
   * @param {Object} prevStyle
   * @param {Object} thisStyle
   */
  _hasStyleChangedForSvg: function (prevStyle, thisStyle) {
    return (
      this._hasStyleChanged(prevStyle, thisStyle) ||
      prevStyle.overline !== thisStyle.overline ||
      prevStyle.underline !== thisStyle.underline ||
      prevStyle.linethrough !== thisStyle.linethrough
    );
  },

  /**
   * Sets property to a given value. When changing position/dimension -related properties (left, top, scale, angle, etc.) `set` does not update position of object's borders/controls. If you need to update those, call `setCoords()`.
   * @param {String|Object} key Property name or object (if object, iterate over the object properties)
   * @param {Object|Function} value Property value (if function, the value is passed into it and its return value is used as a new one)
   * @return {fabric.Object} thisArg
   * @chainable
   */
  set: function (key, value) {
    this.callSuper('set', key, value);
    var needsDims = false;
    if (typeof key === 'object') {
      for (var _key in key) {
        needsDims = needsDims || this._dimensionAffectingProps.indexOf(_key) !== -1;
      }
    } else {
      needsDims = this._dimensionAffectingProps.indexOf(key) !== -1;
    }
    if (needsDims) {
      this.initDimensions();
      this.setCoords();
    }
    return this;
  },

  /**
   * Returns complexity of an instance
   * @return {Number} complexity
   */
  complexity: function () {
    return 1;
  },

  /**
   * Check if characters in a text have a value for a property
   * whose value matches the textbox's value for that property.  If so,
   * the character-level property is deleted.  If the character
   * has no other properties, then it is also deleted.  Finally,
   * if the line containing that character has no other characters
   * then it also is deleted.
   *
   * @param {string} property The property to compare between characters and text.
   */
  cleanStyle: function (property) {
    if (!this.textStyles || !property || property === '') {
      return false;
    }
    var obj = this.textStyles,
      stylesCount = 0,
      letterCount,
      stylePropertyValue,
      allStyleObjectPropertiesMatch = true,
      graphemeCount = 0,
      styleObject;
    // eslint-disable-next-line
    for (var p1 in obj) {
      letterCount = 0;
      // eslint-disable-next-line
      for (var p2 in obj[p1]) {
        var styleObject = obj[p1][p2],
          stylePropertyHasBeenSet = styleObject.hasOwnProperty(property);

        stylesCount++;

        if (stylePropertyHasBeenSet) {
          if (!stylePropertyValue) {
            stylePropertyValue = styleObject[property];
          } else if (styleObject[property] !== stylePropertyValue) {
            allStyleObjectPropertiesMatch = false;
          }

          if (styleObject[property] === this[property]) {
            delete styleObject[property];
          }
        } else {
          allStyleObjectPropertiesMatch = false;
        }

        if (Object.keys(styleObject).length !== 0) {
          letterCount++;
        } else {
          delete obj[p1][p2];
        }
      }

      if (letterCount === 0) {
        delete obj[p1];
      }
    }
    // if every grapheme has the same style set then
    // delete those styles and set it on the parent
    for (var i = 0; i < this._textLines.length; i++) {
      graphemeCount += this._textLines[i].length;
    }
    if (allStyleObjectPropertiesMatch && stylesCount === graphemeCount) {
      this[property] = stylePropertyValue;
      this.removeStyle(property);
    }
  },

  /**
   * Remove a style property or properties from all individual character styles
   * in a text object.  Deletes the character style object if it contains no other style
   * props.  Deletes a line style object if it contains no other character styles.
   *
   * @param {String} props The property to remove from character styles.
   */
  removeStyle: function (property) {
    if (!this.textStyles || !property || property === '') {
      return;
    }
    var obj = this.textStyles,
      line,
      lineNum,
      charNum;
    for (lineNum in obj) {
      line = obj[lineNum];
      for (charNum in line) {
        delete line[charNum][property];
        if (Object.keys(line[charNum]).length === 0) {
          delete line[charNum];
        }
      }
      if (Object.keys(line).length === 0) {
        delete obj[lineNum];
      }
    }
  },

  /**
   * @private
   */
  _extendStyles: function (index, styles) {
    var loc = this.get2DCursorLocation(index);

    if (!this._getLineStyle(loc.lineIndex)) {
      this._setLineStyle(loc.lineIndex);
    }

    if (!this._getStyleDeclaration(loc.lineIndex, loc.charIndex)) {
      this._setStyleDeclaration(loc.lineIndex, loc.charIndex, {});
    }

    fabric.util.object.extend(
      this._getStyleDeclaration(loc.lineIndex, loc.charIndex),
      styles
    );
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
    var lines = skipWrapping ? this._unwrappedTextLines : this._textLines,
      len = lines.length;
    for (var i = 0; i < len; i++) {
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
   * Sets style of a current selection, if no selection exist, do not set anything.
   * @param {Object} [styles] Styles object
   * @param {Number} [startIndex] Start index to get styles at
   * @param {Number} [endIndex] End index to get styles at, if not specified selectionEnd or startIndex + 1
   * @return {fabric.IText} thisArg
   * @chainable
   */
  setSelectionStyles: function (styles, startIndex, endIndex) {
    if (typeof startIndex === 'undefined') {
      startIndex = this.selectionStart || 0;
    }
    if (typeof endIndex === 'undefined') {
      endIndex = this.selectionEnd || startIndex;
    }
    for (var i = startIndex; i < endIndex; i++) {
      this._extendStyles(i, styles);
    }
    /* not included in _extendStyles to avoid clearing cache more than once */
    this._forceClearCache = true;
    return this;
  },

  /**
   * @param {Number} lineIndex
   * @private
   */
  _deleteLineStyle: function (lineIndex) {
    delete this.textStyles[lineIndex];
  },

  // IText
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
   * Sets selection start (left boundary of a selection)
   * @param {Number} index Index to set selection start to
   */
  setSelectionStart: function (index) {
    index = Math.max(index, 0);
    this._updateAndFire('selectionStart', index);
  },

  /**
   * Sets selection end (right boundary of a selection)
   * @param {Number} index Index to set selection end to
   */
  setSelectionEnd: function (index) {
    index = Math.min(index, this.text.length);
    this._updateAndFire('selectionEnd', index);
  },

  /**
   * @private
   * @param {String} property 'selectionStart' or 'selectionEnd'
   * @param {Number} index new position of property
   */
  _updateAndFire: function (property, index) {
    if (this[property] !== index) {
      this._fireSelectionChanged();
      this[property] = index;
    }
    this._updateTextarea();
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
   * Prepare and clean the contextTop
   */
  clearContextTop: function (skipRestore) {
    if (!this.isEditing || !this.canvas || !this.canvas.contextTop) {
      return;
    }
    var ctx = this.canvas.contextTop,
      v = this.canvas.viewportTransform;
    ctx.save();
    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    this.transform(ctx);
    this._clearTextArea(ctx);
    skipRestore || ctx.restore();
  },
  /**
   * Renders cursor or selection (depending on what exists)
   * it does on the contextTop. If contextTop is not available, do nothing.
   */
  renderCursorOrSelection: function () {
    if (!this.isEditing || !this.canvas || !this.canvas.contextTop) {
      return;
    }
    var boundaries = this._getCursorBoundaries(),
      ctx = this.canvas.contextTop;
    this.clearContextTop(true);
    if (this.selectionStart === this.selectionEnd) {
      this.renderCursor(boundaries, ctx);
    } else {
      this.renderSelection(boundaries, ctx);
    }
    ctx.restore();
  },

  _clearTextArea: function (ctx) {
    // we add 4 pixel, to be sure to do not leave any pixel out
    var width = this.width + 4,
      height = this.height + 4;
    ctx.clearRect(-width / 2, -height / 2, width, height);
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
    for (var i = 0; i < lineIndex; i++) {
      topOffset += this.getHeightOfLine(i);
    }
    lineLeftOffset = this._getLineLeftOffset(lineIndex);
    var bound = this.__charBounds[lineIndex][charIndex];
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
   * Renders cursor
   * @param {Object} boundaries
   * @param {CanvasRenderingContext2D} ctx transformed context to draw on
   */
  renderCursor: function (boundaries, ctx) {
    var cursorLocation = this.get2DCursorLocation(),
      lineIndex = cursorLocation.lineIndex,
      charIndex = cursorLocation.charIndex > 0 ? cursorLocation.charIndex - 1 : 0,
      charHeight = this.getValueOfPropertyAt(lineIndex, charIndex, 'fontSize'),
      multiplier = this.scaleX * this.canvas.getZoom(),
      cursorWidth = this.cursorWidth / multiplier,
      topOffset = boundaries.topOffset,
      dy = this.getValueOfPropertyAt(lineIndex, charIndex, 'deltaY');

    topOffset +=
      ((1 - this._fontSizeFraction) * this.getHeightOfLine(lineIndex)) / this.lineHeight -
      charHeight * (1 - this._fontSizeFraction);

    if (this.inCompositionMode) {
      this.renderSelection(boundaries, ctx);
    }

    ctx.fillStyle =
      this.cursorColor || this.getValueOfPropertyAt(lineIndex, charIndex, 'fill');
    ctx.globalAlpha = this.__isMousedown ? 1 : this._currentCursorOpacity;
    ctx.fillRect(
      boundaries.left + boundaries.leftOffset - cursorWidth / 2,
      topOffset + boundaries.top + dy,
      cursorWidth,
      charHeight
    );
  },

  /**
   * Renders text selection
   * @param {Object} boundaries Object with left/top/leftOffset/topOffset
   * @param {CanvasRenderingContext2D} ctx transformed context to draw on
   */
  renderSelection: function (boundaries, ctx) {
    this._resetCtxScaleForTextRender(ctx);

    var selectionStart = this.inCompositionMode
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

    for (var i = startLine; i <= endLine; i++) {
      var lineOffset = this._getLineLeftOffset(i) || 0,
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
          var charSpacing = this._getWidthOfCharSpacing();
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
  },

  /**
   * High level function to know the height of the cursor.
   * the currentChar is the one that precedes the cursor
   * Returns fontSize of char at the current cursor
   * Unused from the library, is for the end user
   * @return {Number} Character font size
   */
  getCurrentCharFontSize: function () {
    var cp = this._getCurrentCharIndex();
    return this.getValueOfPropertyAt(cp.l, cp.c, 'fontSize');
  },

  /**
   * High level function to know the color of the cursor.
   * the currentChar is the one that precedes the cursor
   * Returns color (fill) of char at the current cursor
   * Unused from the library, is for the end user
   * @return {String} Character color (fill)
   */
  getCurrentCharColor: function () {
    var cp = this._getCurrentCharIndex();
    return this.getValueOfPropertyAt(cp.l, cp.c, 'fill');
  },

  /**
   * Returns the cursor position for the getCurrent.. functions
   * @private
   */
  _getCurrentCharIndex: function () {
    var cursorPosition = this.get2DCursorLocation(this.selectionStart, true),
      charIndex = cursorPosition.charIndex > 0 ? cursorPosition.charIndex - 1 : 0;
    return { l: cursorPosition.lineIndex, c: charIndex };
  },

  /**
   * Initializes all the interactive behavior of IText
   */
  initBehavior: function () {
    this.initAddedHandler();
    this.initRemovedHandler();
    this.initCursorSelectionHandlers();
    this.initDoubleClickSimulation();
    this.mouseMoveHandler = this.mouseMoveHandler.bind(this);
  },

  onDeselect: function () {
    this.isEditing && this.exitEditing();
    this.selected = false;
  },

  /**
   * Initializes "added" event handler
   */
  initAddedHandler: function () {
    var _this = this;
    // TODO IText need rename ?
    this.on('added', function () {
      var canvas = _this.canvas;
      if (canvas) {
        if (!canvas._hasITextHandlers) {
          canvas._hasITextHandlers = true;
          _this._initCanvasHandlers(canvas);
        }
        canvas._iTextInstances = canvas._iTextInstances || [];
        canvas._iTextInstances.push(_this);
      }
    });
  },

  initRemovedHandler: function () {
    var _this = this;
    // TODO IText need rename ?
    this.on('removed', function () {
      var canvas = _this.canvas;
      if (canvas) {
        canvas._iTextInstances = canvas._iTextInstances || [];
        fabric.util.removeFromArray(canvas._iTextInstances, _this);
        if (canvas._iTextInstances.length === 0) {
          canvas._hasITextHandlers = false;
          _this._removeCanvasHandlers(canvas);
        }
      }
    });
  },

  /**
   * register canvas event to manage exiting on other instances
   * @private
   */
  _initCanvasHandlers: function (canvas) {
    // TODO IText need rename ?
    canvas._mouseUpITextHandler = function () {
      if (canvas._iTextInstances) {
        canvas._iTextInstances.forEach(function (obj) {
          obj.__isMousedown = false;
        });
      }
    };
    canvas.on('mouse:up', canvas._mouseUpITextHandler);
  },

  /**
   * remove canvas event to manage exiting on other instances
   * @private
   */
  _removeCanvasHandlers: function (canvas) {
    canvas.off('mouse:up', canvas._mouseUpITextHandler);
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
          obj.renderCursorOrSelection();
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
   * Returns selected text
   * @return {String}
   */
  getSelectedText: function () {
    return this._text.slice(this.selectionStart, this.selectionEnd).join('');
  },

  /**
   * Find new selection index representing start of current word according to current selection index
   * @param {Number} startFrom Current selection index
   * @return {Number} New selection index
   */
  findWordBoundaryLeft: function (startFrom) {
    var offset = 0,
      index = startFrom - 1;

    // remove space before cursor first
    if (this._reSpace.test(this._text[index])) {
      while (this._reSpace.test(this._text[index])) {
        offset++;
        index--;
      }
    }
    while (/\S/.test(this._text[index]) && index > -1) {
      offset++;
      index--;
    }

    return startFrom - offset;
  },

  /**
   * Find new selection index representing end of current word according to current selection index
   * @param {Number} startFrom Current selection index
   * @return {Number} New selection index
   */
  findWordBoundaryRight: function (startFrom) {
    var offset = 0,
      index = startFrom;

    // remove space after cursor first
    if (this._reSpace.test(this._text[index])) {
      while (this._reSpace.test(this._text[index])) {
        offset++;
        index++;
      }
    }
    while (/\S/.test(this._text[index]) && index < this._text.length) {
      offset++;
      index++;
    }

    return startFrom + offset;
  },

  /**
   * Find new selection index representing start of current line according to current selection index
   * @param {Number} startFrom Current selection index
   * @return {Number} New selection index
   */
  findLineBoundaryLeft: function (startFrom) {
    var offset = 0,
      index = startFrom - 1;

    while (!/\n/.test(this._text[index]) && index > -1) {
      offset++;
      index--;
    }

    return startFrom - offset;
  },

  /**
   * Find new selection index representing end of current line according to current selection index
   * @param {Number} startFrom Current selection index
   * @return {Number} New selection index
   */
  findLineBoundaryRight: function (startFrom) {
    var offset = 0,
      index = startFrom;

    while (!/\n/.test(this._text[index]) && index < this._text.length) {
      offset++;
      index++;
    }

    return startFrom + offset;
  },

  /**
   * Finds index corresponding to beginning or end of a word
   * @param {Number} selectionStart Index of a character
   * @param {Number} direction 1 or -1
   * @return {Number} Index of the beginning or end of a word
   */
  searchWordBoundary: function (selectionStart, direction) {
    var text = this._text,
      index = this._reSpace.test(text[selectionStart])
        ? selectionStart - 1
        : selectionStart,
      _char = text[index],
      // wrong
      reNonWord = fabric.reNonWord;

    while (!reNonWord.test(_char) && index > 0 && index < text.length) {
      index += direction;
      _char = text[index];
    }
    if (reNonWord.test(_char)) {
      index += direction === 1 ? 0 : 1;
    }
    return index;
  },

  /**
   * Selects a word based on the index
   * @param {Number} selectionStart Index of a character
   */
  selectWord: function (selectionStart) {
    selectionStart = selectionStart || this.selectionStart;
    var newSelectionStart = this.searchWordBoundary(
        selectionStart,
        -1
      ) /* search backwards */,
      newSelectionEnd = this.searchWordBoundary(selectionStart, 1); /* search forward */

    this.selectionStart = newSelectionStart;
    this.selectionEnd = newSelectionEnd;
    this._fireSelectionChanged();
    this._updateTextarea();
    this.renderCursorOrSelection();
  },

  /**
   * Selects a line based on the index
   * @param {Number} selectionStart Index of a character
   * @return {fabric.IText} thisArg
   * @chainable
   */
  selectLine: function (selectionStart) {
    selectionStart = selectionStart || this.selectionStart;
    var newSelectionStart = this.findLineBoundaryLeft(selectionStart),
      newSelectionEnd = this.findLineBoundaryRight(selectionStart);

    this.selectionStart = newSelectionStart;
    this.selectionEnd = newSelectionEnd;
    this._fireSelectionChanged();
    this._updateTextarea();
    return this;
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
      this.exitEditingOnOthers(this.canvas);
    }

    this.isEditing = true;

    this.initHiddenTextarea(e);
    this.hiddenTextarea.focus();
    this.hiddenTextarea.value = this.text;
    this._updateTextarea();
    this._saveEditingProps();
    this._setEditingProps();
    this._textBeforeEdit = this.text;

    this._tick();
    this.fire('editing:entered');
    this._fireSelectionChanged();
    if (!this.canvas) {
      return this;
    }
    this.canvas.fire('text:editing:entered', { target: this });
    this.initMouseMoveHandler();
    this.canvas.requestRenderAll();
    return this;
  },

  exitEditingOnOthers: function (canvas) {
    if (canvas._iTextInstances) {
      canvas._iTextInstances.forEach(function (obj) {
        obj.selected = false;
        if (obj.isEditing) {
          obj.exitEditing();
        }
      });
    }
  },

  /**
   * Initializes "mousemove" event handler
   */
  initMouseMoveHandler: function () {
    this.canvas.on('mouse:move', this.mouseMoveHandler);
  },

  /**
   * @private
   */
  mouseMoveHandler: function (options) {
    if (!this.__isMousedown || !this.isEditing) {
      return;
    }

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
      this.renderCursorOrSelection();
    }
  },

  /**
   * @private
   */
  _setEditingProps: function () {
    this.hoverCursor = 'text';

    if (this.canvas) {
      this.canvas.defaultCursor = this.canvas.moveCursor = 'text';
    }

    this.borderColor = this.editingBorderColor;
    this.hasControls = this.selectable = false;
    this.lockMovementX = this.lockMovementY = true;
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
   * convert from fabric to textarea values
   */
  fromGraphemeToStringSelection: function (start, end, _text) {
    var smallerTextStart = _text.slice(0, start),
      graphemeStart = smallerTextStart.join('').length;
    if (start === end) {
      return { selectionStart: graphemeStart, selectionEnd: graphemeStart };
    }
    var smallerTextEnd = _text.slice(start, end),
      graphemeEnd = smallerTextEnd.join('').length;
    return { selectionStart: graphemeStart, selectionEnd: graphemeStart + graphemeEnd };
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
  updateTextareaPosition: function () {
    if (this.selectionStart === this.selectionEnd) {
      var style = this._calcTextareaPosition();
      this.hiddenTextarea.style.left = style.left;
      this.hiddenTextarea.style.top = style.top;
    }
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
   * @private
   */
  _saveEditingProps: function () {
    this._savedProps = {
      hasControls: this.hasControls,
      borderColor: this.borderColor,
      lockMovementX: this.lockMovementX,
      lockMovementY: this.lockMovementY,
      hoverCursor: this.hoverCursor,
      selectable: this.selectable,
      defaultCursor: this.canvas && this.canvas.defaultCursor,
      moveCursor: this.canvas && this.canvas.moveCursor,
    };
  },

  /**
   * @private
   */
  _restoreEditingProps: function () {
    if (!this._savedProps) {
      return;
    }

    this.hoverCursor = this._savedProps.hoverCursor;
    this.hasControls = this._savedProps.hasControls;
    this.borderColor = this._savedProps.borderColor;
    this.selectable = this._savedProps.selectable;
    this.lockMovementX = this._savedProps.lockMovementX;
    this.lockMovementY = this._savedProps.lockMovementY;

    if (this.canvas) {
      this.canvas.defaultCursor = this._savedProps.defaultCursor;
      this.canvas.moveCursor = this._savedProps.moveCursor;
    }
  },

  /**
   * Exits from editing state
   * @return {fabric.IText} thisArg
   * @chainable
   */
  exitEditing: function () {
    var isTextChanged = this._textBeforeEdit !== this.text;
    var hiddenTextarea = this.hiddenTextarea;
    this.selected = false;
    this.isEditing = false;

    this.selectionEnd = this.selectionStart;

    if (hiddenTextarea) {
      hiddenTextarea.blur && hiddenTextarea.blur();
      hiddenTextarea.parentNode && hiddenTextarea.parentNode.removeChild(hiddenTextarea);
    }
    this.hiddenTextarea = null;
    this.abortCursorAnimation();
    this._restoreEditingProps();
    this._currentCursorOpacity = 0;
    if (this._shouldClearDimensionCache()) {
      this.initDimensions();
      this.setCoords();
    }
    this.fire('editing:exited');
    isTextChanged && this.fire('modified');
    if (this.canvas) {
      this.canvas.off('mouse:move', this.mouseMoveHandler);
      this.canvas.fire('text:editing:exited', { target: this });
      isTextChanged && this.canvas.fire('object:modified', { target: this });
    }
    return this;
  },

  /**
   * remove and reflow a style block from start to end.
   * @param {Number} start linear start position for removal (included in removal)
   * @param {Number} end linear end position for removal ( excluded from removal )
   */
  removeStyleFromTo: function (start, end) {
    var cursorStart = this.get2DCursorLocation(start, true),
      cursorEnd = this.get2DCursorLocation(end, true),
      lineStart = cursorStart.lineIndex,
      charStart = cursorStart.charIndex,
      lineEnd = cursorEnd.lineIndex,
      charEnd = cursorEnd.charIndex,
      i,
      styleObj;
    if (lineStart !== lineEnd) {
      // step1 remove the trailing of lineStart
      if (this.textStyles[lineStart]) {
        for (i = charStart; i < this._unwrappedTextLines[lineStart].length; i++) {
          delete this.textStyles[lineStart][i];
        }
      }
      // step2 move the trailing of lineEnd to lineStart if needed
      if (this.textStyles[lineEnd]) {
        for (i = charEnd; i < this._unwrappedTextLines[lineEnd].length; i++) {
          styleObj = this.textStyles[lineEnd][i];
          if (styleObj) {
            this.textStyles[lineStart] || (this.textStyles[lineStart] = {});
            this.textStyles[lineStart][charStart + i - charEnd] = styleObj;
          }
        }
      }
      // step3 detects lines will be completely removed.
      for (i = lineStart + 1; i <= lineEnd; i++) {
        delete this.textStyles[i];
      }
      // step4 shift remaining lines.
      this.shiftLineStyles(lineEnd, lineStart - lineEnd);
    } else {
      // remove and shift left on the same line
      if (this.textStyles[lineStart]) {
        styleObj = this.textStyles[lineStart];
        var diff = charEnd - charStart,
          numericChar,
          _char;
        for (i = charStart; i < charEnd; i++) {
          delete styleObj[i];
        }
        for (_char in this.textStyles[lineStart]) {
          numericChar = parseInt(_char, 10);
          if (numericChar >= charEnd) {
            styleObj[numericChar - diff] = styleObj[_char];
            delete styleObj[_char];
          }
        }
      }
    }
  },

  /**
   * Shifts line styles up or down
   * @param {Number} lineIndex Index of a line
   * @param {Number} offset Can any number?
   */
  shiftLineStyles: function (lineIndex, offset) {
    // shift all line styles by offset upward or downward
    // do not clone deep. we need new array, not new style objects
    var clonedStyles = clone(this.textStyles);
    for (var line in this.textStyles) {
      var numericLine = parseInt(line, 10);
      if (numericLine > lineIndex) {
        this.textStyles[numericLine + offset] = clonedStyles[numericLine];
        if (!clonedStyles[numericLine - offset]) {
          delete this.textStyles[numericLine];
        }
      }
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

  /**
   * Handle insertion of more consecutive style lines for when one or more
   * newlines gets added to the text. Since current style needs to be shifted
   * first we shift the current style of the number lines needed, then we add
   * new lines from the last to the first.
   * @param {Number} lineIndex Index of a line
   * @param {Number} charIndex Index of a char
   * @param {Number} qty number of lines to add
   * @param {Array} copiedStyle Array of objects styles
   */
  insertNewlineStyleObject: function (lineIndex, charIndex, qty, copiedStyle) {
    var currentCharStyle,
      newLineStyles = {},
      somethingAdded = false,
      isEndOfLine = this._unwrappedTextLines[lineIndex].length === charIndex;

    qty || (qty = 1);
    this.shiftLineStyles(lineIndex, qty);
    if (this.textStyles[lineIndex]) {
      currentCharStyle = this.textStyles[lineIndex][
        charIndex === 0 ? charIndex : charIndex - 1
      ];
    }
    // we clone styles of all chars
    // after cursor onto the current line
    for (var index in this.textStyles[lineIndex]) {
      var numIndex = parseInt(index, 10);
      if (numIndex >= charIndex) {
        somethingAdded = true;
        newLineStyles[numIndex - charIndex] = this.textStyles[lineIndex][index];
        // remove lines from the previous line since they're on a new line now
        if (!(isEndOfLine && charIndex === 0)) {
          delete this.textStyles[lineIndex][index];
        }
      }
    }
    var styleCarriedOver = false;
    if (somethingAdded && !isEndOfLine) {
      // if is end of line, the extra style we copied
      // is probably not something we want
      this.textStyles[lineIndex + qty] = newLineStyles;
      styleCarriedOver = true;
    }
    if (styleCarriedOver) {
      // skip the last line of since we already prepared it.
      qty--;
    }
    // for the all the lines or all the other lines
    // we clone current char style onto the next (otherwise empty) line
    while (qty > 0) {
      if (copiedStyle && copiedStyle[qty - 1]) {
        this.textStyles[lineIndex + qty] = { 0: clone(copiedStyle[qty - 1]) };
      } else if (currentCharStyle) {
        this.textStyles[lineIndex + qty] = { 0: clone(currentCharStyle) };
      } else {
        delete this.textStyles[lineIndex + qty];
      }
      qty--;
    }
    this._forceClearCache = true;
  },

  /**
   * Inserts style object for a given line/char index
   * @param {Number} lineIndex Index of a line
   * @param {Number} charIndex Index of a char
   * @param {Number} quantity number Style object to insert, if given
   * @param {Array} copiedStyle array of style objects
   */
  insertCharStyleObject: function (lineIndex, charIndex, quantity, copiedStyle) {
    if (!this.textStyles) {
      this.textStyles = {};
    }
    var currentLineStyles = this.textStyles[lineIndex],
      currentLineStylesCloned = currentLineStyles ? clone(currentLineStyles) : {};

    quantity || (quantity = 1);
    // shift all char styles by quantity forward
    // 0,1,2,3 -> (charIndex=2) -> 0,1,3,4 -> (insert 2) -> 0,1,2,3,4
    for (var index in currentLineStylesCloned) {
      var numericIndex = parseInt(index, 10);
      if (numericIndex >= charIndex) {
        currentLineStyles[numericIndex + quantity] =
          currentLineStylesCloned[numericIndex];
        // only delete the style if there was nothing moved there
        if (!currentLineStylesCloned[numericIndex - quantity]) {
          delete currentLineStyles[numericIndex];
        }
      }
    }
    this._forceClearCache = true;
    if (copiedStyle) {
      while (quantity--) {
        if (!Object.keys(copiedStyle[quantity]).length) {
          continue;
        }
        if (!this.textStyles[lineIndex]) {
          this.textStyles[lineIndex] = {};
        }
        this.textStyles[lineIndex][charIndex + quantity] = clone(copiedStyle[quantity]);
      }
      return;
    }
    if (!currentLineStyles) {
      return;
    }
    var newStyle = currentLineStyles[charIndex ? charIndex - 1 : 1];
    while (newStyle && quantity--) {
      this.textStyles[lineIndex][charIndex + quantity] = clone(newStyle);
    }
  },

  /**
   * Inserts style object(s)
   * @param {Array} insertedText Characters at the location where style is inserted
   * @param {Number} start cursor index for inserting style
   * @param {Array} [copiedStyle] array of style objects to insert.
   */
  insertNewStyleBlock: function (insertedText, start, copiedStyle) {
    var cursorLoc = this.get2DCursorLocation(start, true),
      addedLines = [0],
      linesLength = 0;
    // get an array of how many char per lines are being added.
    for (var i = 0; i < insertedText.length; i++) {
      if (insertedText[i] === '\n') {
        linesLength++;
        addedLines[linesLength] = 0;
      } else {
        addedLines[linesLength]++;
      }
    }
    // for the first line copy the style from the current char position.
    if (addedLines[0] > 0) {
      this.insertCharStyleObject(
        cursorLoc.lineIndex,
        cursorLoc.charIndex,
        addedLines[0],
        copiedStyle
      );
      copiedStyle = copiedStyle && copiedStyle.slice(addedLines[0] + 1);
    }
    linesLength &&
      this.insertNewlineStyleObject(
        cursorLoc.lineIndex,
        cursorLoc.charIndex + addedLines[0],
        linesLength
      );
    for (var i = 1; i < linesLength; i++) {
      if (addedLines[i] > 0) {
        this.insertCharStyleObject(
          cursorLoc.lineIndex + i,
          0,
          addedLines[i],
          copiedStyle
        );
      } else if (copiedStyle) {
        this.textStyles[cursorLoc.lineIndex + i][0] = copiedStyle[0];
      }
      copiedStyle = copiedStyle && copiedStyle.slice(addedLines[i] + 1);
    }
    // we use i outside the loop to get it like linesLength
    if (addedLines[i] > 0) {
      this.insertCharStyleObject(cursorLoc.lineIndex + i, 0, addedLines[i], copiedStyle);
    }
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
   * Initializes "dbclick" event handler
   */
  initDoubleClickSimulation: function () {
    // for double click
    this.__lastClickTime = +new Date();

    // for triple click
    this.__lastLastClickTime = +new Date();

    this.__lastPointer = {};

    this.on('mousedown', this.onMouseDown);
  },

  /**
   * Default event handler to simulate triple click
   * @private
   */
  onMouseDown: function (options) {
    if (!this.canvas) {
      return;
    }
    this.__newClickTime = +new Date();
    var newPointer = options.pointer;
    if (this.isTripleClick(newPointer)) {
      this.fire('tripleclick', options);
      this._stopEvent(options.e);
    }
    this.__lastLastClickTime = this.__lastClickTime;
    this.__lastClickTime = this.__newClickTime;
    this.__lastPointer = newPointer;
    this.__lastIsEditing = this.isEditing;
    this.__lastSelected = this.selected;
  },

  isTripleClick: function (newPointer) {
    return (
      this.__newClickTime - this.__lastClickTime < 500 &&
      this.__lastClickTime - this.__lastLastClickTime < 500 &&
      this.__lastPointer.x === newPointer.x &&
      this.__lastPointer.y === newPointer.y
    );
  },

  /**
   * @private
   */
  _stopEvent: function (e) {
    e.preventDefault && e.preventDefault();
    e.stopPropagation && e.stopPropagation();
  },

  /**
   * Initializes event handlers related to cursor or selection
   */
  initCursorSelectionHandlers: function () {
    this.initMousedownHandler();
    this.initMouseupHandler();
    this.initClicks();
  },

  /**
   * Default handler for double click, select a word
   */
  doubleClickHandler: function (options) {
    if (!this.isEditing) {
      return;
    }
    this.selectWord(this.getSelectionStartFromPointer(options.e));
  },

  /**
   * Default handler for triple click, select a line
   */
  tripleClickHandler: function (options) {
    if (!this.isEditing) {
      return;
    }
    this.selectLine(this.getSelectionStartFromPointer(options.e));
  },

  /**
   * Initializes double and triple click event handlers
   */
  initClicks: function () {
    this.on('mousedblclick', this.doubleClickHandler);
    this.on('tripleclick', this.tripleClickHandler);
  },

  /**
   * Default event handler for the basic functionalities needed on _mouseDown
   * can be overridden to do something different.
   * Scope of this implementation is: find the click position, set selectionStart
   * find selectionEnd, initialize the drawing of either cursor or selection area
   * initializing a mousedDown on a text area will cancel fabricjs knowledge of
   * current compositionMode. It will be set to false.
   */
  _mouseDownHandler: function (options) {
    if (!this.canvas || !this.editable || (options.e.button && options.e.button !== 1)) {
      return;
    }

    this.__isMousedown = true;

    if (this.selected) {
      this.inCompositionMode = false;
      this.setCursorByClick(options.e);
    }

    if (this.isEditing) {
      this.__selectionStartOnMouseDown = this.selectionStart;
      if (this.selectionStart === this.selectionEnd) {
        this.abortCursorAnimation();
      }
      this.renderCursorOrSelection();
    }
  },

  /**
   * Default event handler for the basic functionalities needed on mousedown:before
   * can be overridden to do something different.
   * Scope of this implementation is: verify the object is already selected when mousing down
   */
  _mouseDownHandlerBefore: function (options) {
    if (!this.canvas || !this.editable || (options.e.button && options.e.button !== 1)) {
      return;
    }
    // we want to avoid that an object that was selected and then becomes unselectable,
    // may trigger editing mode in some way.
    this.selected = this === this.canvas._activeObject;
  },

  /**
   * Initializes "mousedown" event handler
   */
  initMousedownHandler: function () {
    this.on('mousedown', this._mouseDownHandler);
    this.on('mousedown:before', this._mouseDownHandlerBefore);
  },

  /**
   * Initializes "mouseup" event handler
   */
  initMouseupHandler: function () {
    this.on('mouseup', this.mouseUpHandler);
  },

  /**
   * standard hander for mouse up, overridable
   * @private
   */
  mouseUpHandler: function (options) {
    this.__isMousedown = false;
    if (
      !this.editable ||
      this.group ||
      (options.transform && options.transform.actionPerformed) ||
      (options.e.button && options.e.button !== 1)
    ) {
      return;
    }

    if (this.canvas) {
      var currentActive = this.canvas._activeObject;
      if (currentActive && currentActive !== this) {
        // avoid running this logic when there is an active object
        // this because is possible with shift click and fast clicks,
        // to rapidly deselect and reselect this object and trigger an enterEdit
        return;
      }
    }

    if (this.__lastSelected && !this.__corner) {
      this.selected = false;
      this.__lastSelected = false;
      this.enterEditing(options.e);
      if (this.selectionStart === this.selectionEnd) {
        this.initDelayedCursor(true);
      } else {
        this.renderCursorOrSelection();
      }
    } else {
      this.selected = true;
    }
  },

  /**
   * Changes cursor location in a text depending on passed pointer (x/y) object
   * @param {Event} e Event object
   */
  setCursorByClick: function (e) {
    var newSelection = this.getSelectionStartFromPointer(e),
      start = this.selectionStart,
      end = this.selectionEnd;
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
    var mouseOffset = this.getLocalPointer(e),
      prevWidth = 0,
      width = 0,
      height = 0,
      charIndex = 0,
      lineIndex = 0,
      lineLeftOffset,
      line,
      topOffset = this.height / 2 + this._getTopOffset();

    for (var i = 0, len = this._textLines.length; i < len; i++) {
      if (height <= mouseOffset.y - topOffset) {
        height += this.getHeightOfLine(i) * this.scaleY;
        lineIndex = i;
        if (i > 0) {
          charIndex += this._textLines[i - 1].length + this.missingNewlineOffset(i - 1);
        }
      } else {
        break;
      }
    }
    lineLeftOffset = this._getLineLeftOffset(lineIndex);
    width = lineLeftOffset * this.scaleX;
    line = this._textLines[lineIndex];
    for (var j = 0, jlen = line.length; j < jlen; j++) {
      prevWidth = width;
      // i removed something about flipX here, check.
      width += this.__charBounds[lineIndex][j].kernedWidth * this.scaleX;
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
      this.renderCursorOrSelection();
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
      copiedStyle,
      removeFrom,
      removeTo;
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
      if (selection) {
        removeFrom = selectionStart;
        removeTo = selectionEnd;
      } else if (backDelete) {
        // detect differencies between forwardDelete and backDelete
        removeFrom = selectionEnd - removedText.length;
        removeTo = selectionEnd;
      } else {
        removeFrom = selectionEnd;
        removeTo = selectionEnd + removedText.length;
      }
      this.removeStyleFromTo(removeFrom, removeTo);
    }
    if (insertedText.length) {
      if (
        fromPaste &&
        insertedText.join('') === fabric.copiedText &&
        !fabric.disableStyleCopyPaste
      ) {
        copiedStyle = fabric.copiedTextStyle;
      }
      this.insertNewStyleBlock(insertedText, selectionStart, copiedStyle);
    }
    this.updateFromTextArea();
    this.fire('changed');
    if (this.canvas) {
      this.canvas.fire('text:changed', { target: this });
      this.canvas.requestRenderAll();
    }
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
    var action = 'get' + direction + 'CursorOffset',
      offset = this[action](e, this._selectionDirection === 'right');
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
    var newSelection =
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
   * Removes characters from start/end
   * start/end ar per grapheme position in _text array.
   *
   * @param {Number} start
   * @param {Number} end default to start + 1
   */
  removeChars: function (start, end) {
    if (typeof end === 'undefined') {
      end = start + 1;
    }
    this.removeStyleFromTo(start, end);
    this._text.splice(start, end - start);
    this.text = this._text.join('');
    this.set('dirty', true);
    if (this._shouldClearDimensionCache()) {
      this.initDimensions();
      this.setCoords();
    }
    this._removeExtraneousStyles();
  },

  /**
   * insert characters at start position, before start position.
   * start  equal 1 it means the text get inserted between actual grapheme 0 and 1
   * if style array is provided, it must be as the same length of text in graphemes
   * if end is provided and is bigger than start, old text is replaced.
   * start/end ar per grapheme position in _text array.
   *
   * @param {String} text text to insert
   * @param {Array} style array of style objects
   * @param {Number} start
   * @param {Number} end default to start + 1
   */
  insertChars: function (text, style, start, end) {
    if (typeof end === 'undefined') {
      end = start;
    }
    if (end > start) {
      this.removeStyleFromTo(start, end);
    }
    var graphemes = fabric.util.string.graphemeSplit(text);
    this.insertNewStyleBlock(graphemes, start, style);
    this._text = [].concat(this._text.slice(0, start), graphemes, this._text.slice(end));
    this.text = this._text.join('');
    this.set('dirty', true);
    if (this._shouldClearDimensionCache()) {
      this.initDimensions();
      this.setCoords();
    }
    this._removeExtraneousStyles();
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

  // Textbox
  /**
   * Minimum width of textbox, in pixels.
   * @type Number
   * @default
   */
  minWidth: 20,

  /**
   * Minimum calculated width of a textbox, in pixels.
   * fixed to 2 so that an empty textbox cannot go to 0
   * and is still selectable without text.
   * @type Number
   * @default
   */
  dynamicMinWidth: 2,

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
   * Generate an object that translates the style object so that it is
   * broken up by visual lines (new lines and automatic wrapping).
   * The original text styles object is broken up by actual lines (new lines only),
   * which is only sufficient for Text / IText
   * @private
   */
  _generateStyleMap: function (textInfo) {
    var realLineCount = 0,
      realLineCharCount = 0,
      charCount = 0,
      map = {};

    for (var i = 0; i < textInfo.graphemeLines.length; i++) {
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
   * @param {Number} lineIndex
   * @param {Number} charIndex
   * @private
   */
  _getStyleDeclaration: function (lineIndex, charIndex) {
    if (this._styleMap && !this.isWrapping) {
      var map = this._styleMap[lineIndex];
      if (!map) {
        return null;
      }
      lineIndex = map.line;
      charIndex = map.offset + charIndex;
    }

    var lineStyle = this.textStyles && this.textStyles[lineIndex];
    if (!lineStyle) {
      return null;
    }
    return lineStyle[charIndex];
  },

  /**
   * @param {Number} lineIndex
   * @param {Number} charIndex
   * @param {Object} style
   * @private
   */
  _setStyleDeclaration: function (lineIndex, charIndex, style) {
    var map = this._styleMap[lineIndex];
    lineIndex = map.line;
    charIndex = map.offset + charIndex;

    this.textStyles[lineIndex][charIndex] = style;
  },

  /**
   * @param {Number} lineIndex
   * @param {Number} charIndex
   * @private
   */
  _deleteStyleDeclaration: function (lineIndex, charIndex) {
    var map = this._styleMap[lineIndex];
    lineIndex = map.line;
    charIndex = map.offset + charIndex;
    delete this.textStyles[lineIndex][charIndex];
  },

  /**
   * probably broken need a fix
   * Returns the real style line that correspond to the wrapped lineIndex line
   * Used just to verify if the line does exist or not.
   * @param {Number} lineIndex
   * @returns {Boolean} if the line exists or not
   * @private
   */
  _getLineStyle: function (lineIndex) {
    var map = this._styleMap[lineIndex];
    return !!this.styles[map.line];
  },

  /**
   * Set the line style to an empty object so that is initialized
   * @param {Number} lineIndex
   * @param {Object} style
   * @private
   */
  _setLineStyle: function (lineIndex) {
    var map = this._styleMap[lineIndex];
    this.textStyles[map.line] = {};
  },

  /**
   * Wraps text using the 'width' property of Textbox. First this function
   * splits text on newlines, so we preserve newlines entered by the user.
   * Then it wraps each line using the width of the Textbox by calling
   * _wrapLine().
   * @param {Array} lines The string array of text that is split into lines
   * @param {Number} desiredWidth width you want to wrap to
   * @returns {Array} Array of lines
   */
  _wrapText: function (lines, desiredWidth) {
    var wrapped = [],
      i;
    this.isWrapping = true;
    for (i = 0; i < lines.length; i++) {
      wrapped = wrapped.concat(this._wrapLine(lines[i], i, desiredWidth));
    }
    this.isWrapping = false;
    return wrapped;
  },

  /**
   * Helper function to measure a string of text, given its lineIndex and charIndex offset
   * it gets called when charBounds are not available yet.
   * @param {CanvasRenderingContext2D} ctx
   * @param {String} text
   * @param {number} lineIndex
   * @param {number} charOffset
   * @returns {number}
   * @private
   */
  _measureWord: function (word, lineIndex, charOffset) {
    var width = 0,
      prevGrapheme,
      skipLeft = true;
    charOffset = charOffset || 0;
    for (var i = 0, len = word.length; i < len; i++) {
      var box = this._getGraphemeBox(
        word[i],
        lineIndex,
        i + charOffset,
        prevGrapheme,
        skipLeft
      );
      width += box.kernedWidth;
      prevGrapheme = word[i];
    }
    return width;
  },

  /**
   * Wraps a line of text using the width of the Textbox and a context.
   * @param {Array} line The grapheme array that represent the line
   * @param {Number} lineIndex
   * @param {Number} desiredWidth width you want to wrap the line to
   * @param {Number} reservedSpace space to remove from wrapping for custom functionalities
   * @returns {Array} Array of line(s) into which the given text is wrapped
   * to.
   */
  _wrapLine: function (_line, lineIndex, desiredWidth, reservedSpace) {
    var lineWidth = 0,
      splitByGrapheme = this.splitByGrapheme,
      graphemeLines = [],
      line = [],
      // spaces in different languges?
      words = splitByGrapheme
        ? fabric.util.string.graphemeSplit(_line)
        : _line.split(this._wordJoiners),
      word = '',
      offset = 0,
      infix = splitByGrapheme ? '' : ' ',
      wordWidth = 0,
      infixWidth = 0,
      largestWordWidth = 0,
      lineJustStarted = true,
      additionalSpace = this._getWidthOfCharSpacing(),
      reservedSpace = reservedSpace || 0;
    // fix a difference between split and graphemeSplit
    if (words.length === 0) {
      words.push([]);
    }
    desiredWidth -= reservedSpace;
    for (var i = 0; i < words.length; i++) {
      // if using splitByGrapheme words are already in graphemes.
      word = splitByGrapheme ? words[i] : fabric.util.string.graphemeSplit(words[i]);
      wordWidth = this._measureWord(word, lineIndex, offset);
      offset += word.length;

      lineWidth += infixWidth + wordWidth - additionalSpace;
      if (lineWidth >= desiredWidth && !lineJustStarted) {
        graphemeLines.push(line);
        line = [];
        lineWidth = wordWidth;
        lineJustStarted = true;
      } else {
        lineWidth += additionalSpace;
      }

      if (!lineJustStarted && !splitByGrapheme) {
        line.push(infix);
      }
      line = line.concat(word);

      infixWidth = splitByGrapheme ? 0 : this._measureWord([infix], lineIndex, offset);
      offset++;
      lineJustStarted = false;
      // keep track of largest word
      if (wordWidth > largestWordWidth) {
        largestWordWidth = wordWidth;
      }
    }

    i && graphemeLines.push(line);

    if (largestWordWidth + reservedSpace > this.dynamicMinWidth) {
      this.dynamicMinWidth = largestWordWidth - additionalSpace + reservedSpace;
    }
    return graphemeLines;
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
    newText = {
      _unwrappedLines: newLines,
      lines: lines,
      graphemeText: newText,
      graphemeLines: newLines,
    };

    var graphemeLines = this._wrapText(newText.lines, this._getActualWidth()),
      lines = new Array(graphemeLines.length);
    for (var i = 0; i < graphemeLines.length; i++) {
      lines[i] = graphemeLines[i].join('');
    }
    newText.lines = lines;
    newText.graphemeLines = graphemeLines;
    return newText;
  },

  getMinWidth: function () {
    return Math.max(this.minWidth, this.dynamicMinWidth);
  },

  _removeExtraneousStyles: function () {
    var linesToKeep = {};
    for (var prop in this._styleMap) {
      if (this._textLines[prop]) {
        linesToKeep[this._styleMap[prop].line] = 1;
      }
    }
    for (var prop in this.styles) {
      if (!linesToKeep[prop]) {
        delete this.styles[prop];
      }
    }
  },

  //  custom added

  /**
   * Get object actual width
   */
  _getActualWidth: function () {
    return this.getTotalObjectScaling().scaleX * this.width;
  },

  /**
   * Get object actual height
   */
  _getActualHeight: function () {
    return this.getTotalObjectScaling().scaleY * this.height;
  },

  /**
   * set ctx to avoid text scale
   * @param ctx
   */
  _resetCtxScaleForTextRender: function (ctx) {
    const transform = ctx.getTransform();
    const radians = fabric.util.degreesToRadians(
      this.group ? this.group.get('angle') + this.get('angle') : this.get('angle')
    );
    const scaleX = this.objectCaching ? transform.a : transform.a / Math.cos(radians);
    const scaleY = this.objectCaching ? transform.d : transform.d / Math.cos(radians);
    ctx.scale(1 / scaleX, 1 / scaleY);
  },
});

EditableTextShape.genericFonts = [
  'sans-serif',
  'serif',
  'cursive',
  'fantasy',
  'monospace',
];

EditableTextShape.fromObject = function (object, callback) {
  return fabric.Object._fromObject('EditableTextShape', object, callback);
};

export default EditableTextShape;
