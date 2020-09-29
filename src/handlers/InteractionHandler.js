import { fabric } from 'fabric';

class InteractionHandler {
  constructor(handler) {
    this.handler = handler;
  }

  moving = (e) => {
    /*   if (this.isDrawingMode()) {
            return;
        }*/
    const delta = new fabric.Point(e.movementX, e.movementY);
    this.handler.canvas.relativePan(delta);
    //this.handler.canvas.requestRenderAll();
  };

  grab = (obj) => {
    if (this.handler.interactionMode === 'grab') {
      return;
    }
    this.handler.interactionMode = 'grab';
    this.handler.canvas.selection = false;
    this.handler.canvas.selectable = false;
    this.handler.canvas.defaultCursor = 'grab';
    this.handler.getObjects().forEach(obj => {
      obj.selectable = false;
      obj.evented = false;
    });
    this.handler.canvas.renderAll();
  };

  selection = (obj) => {
    if (this.handler.interactionMode === 'selection') {
      return;
    }
    this.handler.interactionMode = 'selection';
    this.handler.canvas.selection = true;
    this.handler.canvas.defaultCursor = 'default';
      this.handler.getObjects().forEach(obj => {
          obj.selectable = true;
          obj.evented = true;
      });
    this.handler.canvas.renderAll();
  };

  isDrawingMode = () => {
    return (
      this.handler.interactionMode === 'arrow' ||
      this.handler.interactionMode === 'line' ||
      this.handler.interactionMode === 'polygon'
    );
  };
}

export default InteractionHandler;
