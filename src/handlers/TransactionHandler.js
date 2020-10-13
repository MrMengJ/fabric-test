import { throttle } from 'lodash';
import { fabric } from 'fabric';
import { propertiesToInclude } from '../constants/event';
import {updateMiniMap} from "../helper/utils";

class TransactionHandler {
  constructor(handler) {
    this.handler = handler;
    if (this.handler.editable) {
      this.initialize();
    }
  }

  initialize = () => {
    this.redos = [];
    this.undos = [];
    this.state = [];
    this.active = false;
  };

  save = (type, canvasJSON) => {
    try {
      if (this.state) {
        const json = JSON.stringify(this.state);
        this.redos = [];
        this.undos.push({
          type,
          json,
        });
      }
      const { objects } = canvasJSON || this.handler.canvas.toJSON(propertiesToInclude);
      this.state = objects.filter((obj) => {
        return obj.type !== 'grid';
      });
    } catch (error) {
      console.error(error);
    }
  };

  undo = throttle(() => {
    const undo = this.undos.pop();
    if (!undo) {
      return;
    }
    this.redos.push({
      type: 'redo',
      json: JSON.stringify(this.state),
    });
    this.replay(undo);
  }, 100);

  redo = throttle(() => {
    const redo = this.redos.pop();
    if (!redo) {
      return;
    }
    this.undos.push({
      type: 'undo',
      json: JSON.stringify(this.state),
    });
    this.replay(redo);
  }, 100);

  replay = (transaction) => {
    const objects = JSON.parse(transaction.json);
    this.state = objects;
    this.active = true;
    this.handler.canvas.renderOnAddRemove = false;
    this.handler.clear();
    this.handler.canvas.discardActiveObject();
    fabric.util.enlivenObjects(
      objects,
      (enlivenObjects) => {
        enlivenObjects.forEach((obj) => {
          const targetIndex = this.handler.canvas._objects.length;
          this.handler.canvas.insertAt(obj, targetIndex, false);
        });
        this.handler.canvas.renderOnAddRemove = true;
        this.active = false;
        this.handler.canvas.renderAll();
        updateMiniMap(this.handler.canvas, this.handler.miniMap);
        this.handler.objects = this.handler.getObjects();
      },
      null
    );
  };
}
export default TransactionHandler;
