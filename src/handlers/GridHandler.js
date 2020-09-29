import { Grid } from '../shapes/Grid';

class GridHandler {
  grid = null;
  constructor(handler) {
    this.handler = handler;
    this.width = 1300;
    this.height = 500;
    this.left = 50;
    this.gridLength = 20;
    this.top = 50;
    this.ctx = this.handler.canvas.getSelectionContext();
    this.initialize();
  }

  /**
   * Init grid
   *
   */
  initialize = () => {
    const { grid, enabled } = this.handler.gridOption;
    if (enabled && grid) {
      this.grid = new Grid({
        width: this.width,
        height: this.height,
        grid: this.gridLength,
        left: this.left,
        top: this.top,
      });
      this.grid.set({
        type: 'grid',
      });
      this.handler.canvas.add(this.grid);
    }
  };

  resizeGrid = (obj) => {
    const {
      aCoords: { br },
    } = obj;
    let rerender = false;
    if (br.x > this.left + this.width) {
      this.width = br.x - this.left + 20;
      rerender = true;
    }
    if (br.y > this.top + this.height) {
      this.height = br.y - this.top + 20;
      rerender = true;
    }
    if (rerender) {
      this.grid.set({
        width: this.width,
        height: this.height,
      });
      this.handler.canvas.renderAll();
    }
  };
}

export default GridHandler;
