import { fabric } from 'fabric';

var clone = fabric.util.object.clone;

const EText = fabric.util.createClass(fabric.Text, {
  type: 'EText',

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
   * Constructor
   * @param {String} text Text string
   * @param {Object} [options] Options object
   * @return {fabric.IText} thisArg
   */
  initialize: function (text, options) {
    this.callSuper('initialize', text, options);
    this.initBehavior();
  },

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
   * Initialize text dimensions. Render all text on given context
   * or on a offscreen canvas to get the text width with measureText.
   * Updates this.width and this.height with the proper values.
   * Does not return dimensions.
   * @private
   */
  initDimensions: function () {
    this.isEditing && this.initDelayedCursor();
    this.clearContextTop();
    this.callSuper('initDimensions');
  },

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  render: function (ctx) {
    this.clearContextTop();
    this.callSuper('render', ctx);
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
    this.callSuper('_render', ctx);
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
   * @private
   */
  _removeExtraneousStyles: function () {
    for (var prop in this.styles) {
      if (!this._textLines[prop]) {
        delete this.styles[prop];
      }
    }
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
      if (this.styles[lineStart]) {
        for (i = charStart; i < this._unwrappedTextLines[lineStart].length; i++) {
          delete this.styles[lineStart][i];
        }
      }
      // step2 move the trailing of lineEnd to lineStart if needed
      if (this.styles[lineEnd]) {
        for (i = charEnd; i < this._unwrappedTextLines[lineEnd].length; i++) {
          styleObj = this.styles[lineEnd][i];
          if (styleObj) {
            this.styles[lineStart] || (this.styles[lineStart] = {});
            this.styles[lineStart][charStart + i - charEnd] = styleObj;
          }
        }
      }
      // step3 detects lines will be completely removed.
      for (i = lineStart + 1; i <= lineEnd; i++) {
        delete this.styles[i];
      }
      // step4 shift remaining lines.
      this.shiftLineStyles(lineEnd, lineStart - lineEnd);
    } else {
      // remove and shift left on the same line
      if (this.styles[lineStart]) {
        styleObj = this.styles[lineStart];
        var diff = charEnd - charStart,
          numericChar,
          _char;
        for (i = charStart; i < charEnd; i++) {
          delete styleObj[i];
        }
        for (_char in this.styles[lineStart]) {
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
    var clonedStyles = clone(this.styles);
    for (var line in this.styles) {
      var numericLine = parseInt(line, 10);
      if (numericLine > lineIndex) {
        this.styles[numericLine + offset] = clonedStyles[numericLine];
        if (!clonedStyles[numericLine - offset]) {
          delete this.styles[numericLine];
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
    if (this.styles[lineIndex]) {
      currentCharStyle = this.styles[lineIndex][
        charIndex === 0 ? charIndex : charIndex - 1
      ];
    }
    // we clone styles of all chars
    // after cursor onto the current line
    for (var index in this.styles[lineIndex]) {
      var numIndex = parseInt(index, 10);
      if (numIndex >= charIndex) {
        somethingAdded = true;
        newLineStyles[numIndex - charIndex] = this.styles[lineIndex][index];
        // remove lines from the previous line since they're on a new line now
        if (!(isEndOfLine && charIndex === 0)) {
          delete this.styles[lineIndex][index];
        }
      }
    }
    var styleCarriedOver = false;
    if (somethingAdded && !isEndOfLine) {
      // if is end of line, the extra style we copied
      // is probably not something we want
      this.styles[lineIndex + qty] = newLineStyles;
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
        this.styles[lineIndex + qty] = { 0: clone(copiedStyle[qty - 1]) };
      } else if (currentCharStyle) {
        this.styles[lineIndex + qty] = { 0: clone(currentCharStyle) };
      } else {
        delete this.styles[lineIndex + qty];
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
    if (!this.styles) {
      this.styles = {};
    }
    var currentLineStyles = this.styles[lineIndex],
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
        if (!this.styles[lineIndex]) {
          this.styles[lineIndex] = {};
        }
        this.styles[lineIndex][charIndex + quantity] = clone(copiedStyle[quantity]);
      }
      return;
    }
    if (!currentLineStyles) {
      return;
    }
    var newStyle = currentLineStyles[charIndex ? charIndex - 1 : 1];
    while (newStyle && quantity--) {
      this.styles[lineIndex][charIndex + quantity] = clone(newStyle);
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
        this.styles[cursorLoc.lineIndex + i][0] = copiedStyle[0];
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
      line;

    for (var i = 0, len = this._textLines.length; i < len; i++) {
      if (height <= mouseOffset.y) {
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
      this.styles = {};
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
});

export default EText;
