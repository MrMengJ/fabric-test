import { GridOption, GuidelineOption } from '../helper/utils';
import AlignmentLineHandler from './AlignmentLineHandler';
import EventHandler from './EventHandler';
import GridHandler from './GridHandler';
import InteractionHandler from './InteractionHandler';
import ZoomHandler from './ZoomHandler';
import { cloneDeep, has } from 'lodash';

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
  };

  copy = () => {
    const activeObject = this.canvas.getActiveObject();
    if (activeObject) {
      const cloned = cloneDeep(activeObject);
      // activeObject.clone((cloned) => {
      //   this.clipboard = cloned;
      // });
      this.clipboard = cloned;
    }
    return true;
  };

  paste = (e) => {
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
        //todo handle contentMenu paste
        //TODO paste to pointer position
      }
      clonedObj.set({
        left: clonedObj.left + padding,
        top: clonedObj.top + padding,
        evented: true,
      });
      if (has(clonedObj, '_objects')) {
        clonedObj.canvas = this.canvas;
        clonedObj.forEachObject((obj) => {
          this.canvas.add(obj);
        });
      } else {
        this.canvas.add(clonedObj);
      }

      const newClipboard = clipboard.set({
        top: clonedObj.top,
        left: clonedObj.left,
      });
      this.clipboard = this.isCut ? null : newClipboard;

      //撤销恢复
      // if (!this.transactionHandler.active) {
      //         this.transactionHandler.save('paste');
      //        }
      if (onAdd) {
        onAdd(clonedObj);
      }
      clonedObj.setCoords();
      this.canvas.setActiveObject(clonedObj);
      this.canvas.requestRenderAll();
      return true;
    }
  };

  remove = (target) => {
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

  getObjects = () => {
    const objects = this.canvas.getObjects().filter(obj => {
        if(obj.type === 'grid'){
            return false
        }
        return true;
    });
    return objects;
  };

  destroy = () => {
    this.eventHandler.destroy();
    this.alignmentLineHandler.destroy();
  };
}

export default Handler;
