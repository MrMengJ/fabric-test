import { cloneDeep, has } from 'lodash';

import { GridOption, GuidelineOption, updateMiniMap } from '../helper/utils';
import { TRANSACTION_TYPE } from '../constants/event';
import ActiveSelection from '../objects/ActiveSelection';

import AlignmentLineHandler from './AlignmentLineHandler';
import EventHandler from './EventHandler';
import GridHandler from './GridHandler';
import InteractionHandler from './InteractionHandler';
import ZoomHandler from './ZoomHandler';
import TransactionHandler from './TransactionHandler';

class Handler {
  guidelineOption = GuidelineOption;
  editable = true;
  gridOption = GridOption;
  interactionMode = 'selection';
  minZoom = 30;
  maxZoom = 500;

  constructor(props) {
    this.canvas = props.canvas;
    this.interactionMode = props.interactionMode;
    this.miniMap = props.miniMap;
    this.clipboard = null;
    this.isCut = false;
    this.initialize();
  }

  initialize() {
    //TODO init other func
    this.initHandler();
  }

  initHandler = () => {
    this.alignmentLineHandler = new AlignmentLineHandler(this);
    this.eventHandler = new EventHandler(this);
    this.gridHandler = new GridHandler(this);
    this.interactionHandler = new InteractionHandler(this);
    this.zoomHandler = new ZoomHandler(this);
    this.transactionHandler = new TransactionHandler(this);
  };

  copy = () => {
    const activeObject = this.canvas.getActiveObject();
    if (activeObject) {
      // activeObject.clone((cloned) => {
      //   this.clipboard = cloned;
      // });
      this.clipboard = cloneDeep(activeObject);
    }
    return true;
  };

  paste = e => {
    const {
      onAdd,
      gridOption: { grid = 10 },
      clipboard,
    } = this;
    if (clipboard) {
      const padding = grid;
      const clonedObj = cloneDeep(clipboard);
      this.canvas.discardActiveObject();
      if (e) {
        const point = this.canvas.getPointer(e, true);
        clonedObj.set({
          left: point.x,
          top: point.y,
          evented: true
        });
      }else{
        clonedObj.set({
          left: clonedObj.left + padding,
          top: clonedObj.top + padding,
          evented: true
        });
      }
      if (has(clonedObj, '_objects')) {
        clonedObj.canvas = this.canvas;
        clonedObj.forEachObject((obj) => {
          this.canvas.add(obj);
        });
      } else {
        this.canvas.add(clonedObj);
      }
      clipboard.set({
        top: clonedObj.top,
        left: clonedObj.left,
      });
      clonedObj.setCoords(); // before the resize Grid
      if (this.gridOption.enabled) {
        this.gridHandler.resizeGrid(clonedObj);
      }
      if (onAdd) {
        onAdd(clonedObj);
      }
      this.canvas.setActiveObject(clonedObj);
      this.canvas.requestRenderAll();
      updateMiniMap(this.canvas, this.miniMap);
      if (!this.transactionHandler.active) {
        this.transactionHandler.save(TRANSACTION_TYPE.PASTE);
      }
      return true;
    }
  };

  remove = target => {
    const activeObject = target || this.canvas.getActiveObject();
    if (!activeObject) {
      return;
    }
    this.canvas.discardActiveObject();
    if (has(activeObject, '_objects')) {
      activeObject._objects.forEach((obj) => {
        this.canvas.remove(obj);
      });
    } else {
      this.canvas.remove(activeObject);
    }
  };

  cut = () => {
    this.copy();
    this.remove();
    this.isCut = true;
  };

  clear = (includeWorkarea = false) => {
    if (includeWorkarea) {
      this.canvas.clear();
      this.workarea = null;
    } else {
      this.canvas.discardActiveObject();
      this.canvas.getObjects().forEach(obj => {
        if (obj.type === 'grid') {
          return;
        }
        this.canvas.remove(obj);
      });
    }
    this.objects = this.getObjects();
    this.canvas.renderAll();
  };

  getObjects = () => {
    return this.canvas.getObjects().filter((obj) => {
      return obj.type !== 'grid';

    });
  };

  selectAll = () => {
    this.canvas.discardActiveObject();
    const filteredObjects = this.canvas.getObjects().filter((obj) => {
      if (obj.type === 'grid') {
        return false;
      } else if (obj.locked) {
        return false;
      }
      return true;
    });
    if (!filteredObjects.length) {
      return;
    }
    if (filteredObjects.length === 1) {
      this.canvas.setActiveObject(filteredObjects[0]);
      this.canvas.renderAll();
      return;
    }
    const activeSelection = new ActiveSelection(filteredObjects, {
      canvas: this.canvas
    });
    this.canvas.setActiveObject(activeSelection);
    this.canvas.renderAll();
  };

  destroy = () => {
    this.eventHandler.destroy();
    this.alignmentLineHandler.destroy();
  };
}

export default Handler;
