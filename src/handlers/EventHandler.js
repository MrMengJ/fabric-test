import { fabric } from 'fabric';
import { canvasContextMenu } from '../CanvasContextMenu';
import { updateMiniMap, updateMiniMapVP } from '../helper/utils';
import { KEY_CODES, TRANSACTION_TYPE } from '../constants/event';
import { MENU_ITEM_NAME } from '../CanvasContextMenu/constants';

class EventHandler {
  constructor(handler) {
    this.handler = handler;
    this.initialize();
  }

  initialize() {
    if (this.handler.editable) {
      this.handler.canvas.on({
        'object:modified': this.modified,
        'object:moving': this.moving,
        'object:moved': this.moved,
        'mouse:move': this.mousemove,
        'mouse:down': this.mousedown,
        'mouse:up': this.mouseup,
        'object:scaled': this.scaled,
        'object:rotated': this.rotated,
        'mouse:wheel': this.mousewheel,
        'object:removed': this.removed,
      });
    }
    this.handler.miniMap.on({
      'object:moving': this.miniMapMoving,
      'object:scaling': this.miniMapScaling,
    });
    //this.handler.canvas.wrapperEl.tabIndex = 1000;
    document.addEventListener('keydown', this.keydown, false);
    document.addEventListener('keyup', this.keyup, false);
  }

  moving = (opt) => {
    const { target } = opt;
    if (this.handler.interactionMode === 'crop') {
      //this.handler.cropHandler.moving(opt);
    } else {
      if (this.handler.editable && this.handler.guidelineOption.enabled) {
        this.handler.alignmentLineHandler.movingGuidelines(target);
      }
    }
  };

  miniMapMoving = (opt) => {
    const { e, target } = opt;
    const scaleX = this.handler.canvas.width / target.width;
    const scaleY = this.handler.canvas.height / target.height;
    const zoom = this.handler.canvas.getZoom();
    const delta = new fabric.Point(
      -e.movementX * scaleX * zoom,
      -e.movementY * scaleY * zoom
    );
    this.handler.canvas.relativePan(delta);
  };

  miniMapScaling = (opt) => {
    let canvasSize = {
      width: this.handler.canvas.width,
      height: this.handler.canvas.height,
    };
    const { target } = opt;
    const finalRatio = target.scaleX;
    let canvasRatio = fabric.util.findScaleToFit(canvasSize, this.handler.canvas);
    const canvasZoom = canvasRatio / finalRatio;
    if (
      this.handler.maxZoom / 100 < canvasZoom ||
      this.handler.minZoom / 100 > canvasZoom
    ) {
      return;
    }
    this.handler.canvas.setZoom(canvasZoom);
  };

  moved = (opt) => {
    const { target } = opt;
    if (!this.handler.transactionHandler.active) {
      this.handler.transactionHandler.save(TRANSACTION_TYPE.MOVED);
    }
    if (this.handler.gridOption.enabled) {
      this.handler.gridHandler.resizeGrid(target);
    }
  };

  keydown = (e) => {
    const { editable } = this.handler;
    const { isEditing } = this.handler.canvas;
    if (!isEditing) {
      if (e.keyCode === KEY_CODES.SPACE) {
        e.preventDefault();
        this.handler.interactionHandler.grab();
      } else if (e.ctrlKey && e.keyCode === KEY_CODES.C) {
        e.preventDefault();
        this.handler.copy();
      } else if (e.ctrlKey && e.keyCode === KEY_CODES.V) {
        e.preventDefault();
        this.handler.paste();
      } else if (e.keyCode === KEY_CODES.BACKSPACE || e.keyCode === KEY_CODES.DELETE) {
        e.preventDefault();
        this.handler.remove();
      } else if (e.ctrlKey && e.keyCode === KEY_CODES.X) {
        e.preventDefault();
        this.handler.cut();
      } else if (e.ctrlKey && e.keyCode === KEY_CODES.Z) {
        e.preventDefault();
        this.handler.transactionHandler.undo();
      } else if (e.ctrlKey && e.keyCode === KEY_CODES.Y) {
        e.preventDefault();
        this.handler.transactionHandler.redo();
      } else if (e.ctrlKey && e.keyCode === KEY_CODES.A) {
        e.preventDefault();
        this.handler.selectAll();
      }
    }
  };

  keyup = (e) => {
    if (e.keyCode === 32) {
      this.handler.interactionHandler.selection();
      return;
    }
    if (this.handler.editable && this.handler.guidelineOption.enabled) {
      this.handler.alignmentLineHandler.verticalLines.length = 0;
      this.handler.alignmentLineHandler.horizontalLines.length = 0;
    }
    this.handler.canvas.renderAll();
  };

  mousemove = (event) => {
    if (this.handler.interactionMode === 'grab' && this.panning) {
      this.handler.interactionHandler.moving(event.e);
      this.handler.canvas.requestRenderAll();
      updateMiniMapVP(this.handler.canvas, this.handler.miniMap);
      this.lastPosX = event.e.clientX;
      this.lastPosY = event.e.clientY;
    }
  };

  modified = (opt) => {
    updateMiniMap(this.handler.canvas, this.handler.miniMap);
  };

  mousedown = (opt) => {
    const { editable } = this.handler;
    if (opt.e.altKey && editable && !this.handler.interactionHandler.isDrawingMode()) {
      this.handler.interactionHandler.grab();
      this.panning = true;
      this.lastPosX = opt.e.clientX;
      this.lastPosY = opt.e.clientY;
      return;
    }
    if (this.handler.interactionMode === 'grab') {
      this.panning = true;
    }
    const { button } = opt;
    const contextMenuClick = (type) => {
      switch (type) {
        case MENU_ITEM_NAME.COPY_SHAPES:
          this.handler.copy();
          break;
        case MENU_ITEM_NAME.CUT_SHAPES:
          this.handler.cut();
          break;
        case MENU_ITEM_NAME.PASTE_CLIPBOARD:
          this.handler.paste(opt.e);
          this.handler.canvas.requestRenderAll();
          break;
        case MENU_ITEM_NAME.DELETE_SHAPES:
          this.handler.remove();
          break;
        default:
          break;
      }
    };

    if (button === 3) {
      const activeObj = this.handler.canvas.getActiveObjects();
      const hasClipboard = this.handler.clipboard !== null;
      canvasContextMenu(opt, activeObj, contextMenuClick, hasClipboard);
    }
  };
  mouseup = (e) => {
    if (this.handler.interactionMode === 'grab') {
      this.panning = false;
      return;
    }
    this.handler.canvas.renderAll();
  };

  removed = (event) => {
    updateMiniMap(this.handler.canvas, this.handler.miniMap);
  };

  scaled = () => {
    if (!this.handler.transactionHandler.active) {
      this.handler.transactionHandler.save(TRANSACTION_TYPE.SCALED);
    }
  };

  rotated = () => {
    if (!this.handler.transactionHandler.active) {
      this.handler.transactionHandler.save(TRANSACTION_TYPE.ROTATED);
    }
  };

  mousewheel = (event) => {
    const delta = event.e.deltaY;
    let zoomRatio = this.handler.canvas.getZoom();
    if (delta > 0) {
      zoomRatio -= 0.05;
    } else {
      zoomRatio += 0.05;
    }
    this.handler.zoomHandler.zoomToPoint(
      new fabric.Point(
        this.handler.canvas.getWidth() / 2,
        this.handler.canvas.getHeight() / 2
      ),
      zoomRatio
    );
    updateMiniMapVP(this.handler.canvas, this.handler.miniMap);
    event.e.preventDefault();
    event.e.stopPropagation();
  };
}

export default EventHandler;
