import { fabric } from 'fabric';

class AlignmentLineHandler {
  aligningLineOffset = 5;
  aligningLineMargin = 4;
  aligningLineWidth = 1;
  aligningLineColor = 'rgb(255,0,0)';
  zoom = 1;

  constructor(Handler) {
    this.handler = Handler;
    this.initialize();
  }

  initialize() {
    if (this.handler.guidelineOption.enabled) {
      this.handler.canvas.on({
        'before:render': this.beforeRender,
        'after:render': this.afterRender,
      });
    } else {
      this.handler.canvas.off({
        'before:render': this.beforeRender,
        'after:render': this.afterRender,
      });
    }
    this.ctx = this.handler.canvas.getSelectionContext();
    this.aligningLineOffset = 5;
    this.aligningLineMargin = 4;
    this.aligningLineWidth = 0.5;
    this.aligningLineColor = 'rgb(255,0,0)';
    this.viewportTransform = this.handler.canvas.viewportTransform;
    this.zoom = 1;
    this.verticalLines = [];
    this.horizontalLines = [];
  }

  destroy() {
    this.handler.canvas.off({
      'before:render': this.beforeRender,
      'after:render': this.afterRender,
    });
  }

  beforeRender = (_opt) => {
    this.handler.canvas.clearContext(this.handler.alignmentLineHandler.ctx);
  };
  afterRender = (_opt) => {
    for (let i = this.handler.alignmentLineHandler.verticalLines.length; i--; ) {
      this.handler.alignmentLineHandler.drawVerticalLine(
        this.handler.alignmentLineHandler.verticalLines[i]
      );
    }
    for (let i = this.handler.alignmentLineHandler.horizontalLines.length; i--; ) {
      this.handler.alignmentLineHandler.drawHorizontalLine(
        this.handler.alignmentLineHandler.horizontalLines[i]
      );
    }
    this.handler.alignmentLineHandler.verticalLines.length = 0;
    this.handler.alignmentLineHandler.horizontalLines.length = 0;
  };

  drawVerticalLine = (coords) => {
    this.drawLine(
      coords.x + 0.5,
      coords.y1 > coords.y2 ? coords.y2 : coords.y1,
      coords.x + 0.5,
      coords.y2 > coords.y1 ? coords.y2 : coords.y1
    );
  };

  drawHorizontalLine = (coords) => {
    this.drawLine(
      coords.x1 > coords.x2 ? coords.x2 : coords.x1,
      coords.y + 0.5,
      coords.x2 > coords.x1 ? coords.x2 : coords.x1,
      coords.y + 0.5
    );
  };

  drawLine = (x1, y1, x2, y2) => {
    const { ctx, aligningLineWidth, aligningLineColor, viewportTransform, zoom } = this;
    ctx.save();
    ctx.lineWidth = aligningLineWidth;
    ctx.strokeStyle = aligningLineColor;
    ctx.beginPath();
    ctx.moveTo(x1 * zoom + viewportTransform[4], y1 * zoom + viewportTransform[5]);
    ctx.lineTo(x2 * zoom + viewportTransform[4], y2 * zoom + viewportTransform[5]);
    ctx.stroke();
    ctx.restore();
  };

  isInRange = (v1, v2) => {
    const { aligningLineMargin } = this;
    v1 = Math.round(v1);
    v2 = Math.round(v2);
    for (let i = v1 - aligningLineMargin, len = v1 + aligningLineMargin; i <= len; i++) {
      if (i === v2) {
        return true;
      }
    }
    return false;
  };

  movingGuidelines = (target) => {
    const canvasObjects = this.handler.canvas.getObjects();
    const activeObjectCenter = target.getCenterPoint();
    const activeObjectLeft = activeObjectCenter.x;
    const activeObjectTop = activeObjectCenter.y;
    const activeObjectBoundingRect = target.getBoundingRect();
    const activeObjectHeight =
      activeObjectBoundingRect.height / this.viewportTransform[3];
    const activeObjectWidth = activeObjectBoundingRect.width / this.viewportTransform[0];
    let horizontalInTheRange = false;
    let verticalInTheRange = false;
    const { _currentTransform: transform } = this.handler.canvas;
    if (!transform) {
      return;
    }

    for (let i = canvasObjects.length; i--; ) {
      if (canvasObjects[i] === target) {
        continue;
      }

      const objectCenter = canvasObjects[i].getCenterPoint();
      const objectLeft = objectCenter.x;
      const objectTop = objectCenter.y;
      const objectBoundingRect = canvasObjects[i].getBoundingRect();
      const objectHeight = objectBoundingRect.height / this.viewportTransform[3];
      const objectWidth = objectBoundingRect.width / this.viewportTransform[0];

      // snap by the horizontal center line
      if (this.isInRange(objectLeft, activeObjectLeft)) {
        verticalInTheRange = true;
        this.verticalLines.push({
          x: objectLeft,
          y1:
            objectTop < activeObjectTop
              ? objectTop - objectHeight / 2 - this.aligningLineOffset
              : objectTop + objectHeight / 2 + this.aligningLineOffset,
          y2:
            activeObjectTop > objectTop
              ? activeObjectTop + activeObjectHeight / 2 + this.aligningLineOffset
              : activeObjectTop - activeObjectHeight / 2 - this.aligningLineOffset,
        });

        target.setPositionByOrigin(
          new fabric.Point(objectLeft, activeObjectTop),
          'center',
          'center'
        );
      }

      // snap by the left edge
      if (
        this.isInRange(
          objectLeft - objectWidth / 2,
          activeObjectLeft - activeObjectWidth / 2
        )
      ) {
        verticalInTheRange = true;
        this.verticalLines.push({
          x: objectLeft - objectWidth / 2,
          y1:
            objectTop < activeObjectTop
              ? objectTop - objectHeight / 2 - this.aligningLineOffset
              : objectTop + objectHeight / 2 + this.aligningLineOffset,
          y2:
            activeObjectTop > objectTop
              ? activeObjectTop + activeObjectHeight / 2 + this.aligningLineOffset
              : activeObjectTop - activeObjectHeight / 2 - this.aligningLineOffset,
        });

        target.setPositionByOrigin(
          new fabric.Point(
            objectLeft - objectWidth / 2 + activeObjectWidth / 2,
            activeObjectTop
          ),
          'center',
          'center'
        );
      }

      // snap by the right edge
      if (
        this.isInRange(
          objectLeft + objectWidth / 2,
          activeObjectLeft + activeObjectWidth / 2
        )
      ) {
        verticalInTheRange = true;
        this.verticalLines.push({
          x: objectLeft + objectWidth / 2,
          y1:
            objectTop < activeObjectTop
              ? objectTop - objectHeight / 2 - this.aligningLineOffset
              : objectTop + objectHeight / 2 + this.aligningLineOffset,
          y2:
            activeObjectTop > objectTop
              ? activeObjectTop + activeObjectHeight / 2 + this.aligningLineOffset
              : activeObjectTop - activeObjectHeight / 2 - this.aligningLineOffset,
        });

        target.setPositionByOrigin(
          new fabric.Point(
            objectLeft + objectWidth / 2 - activeObjectWidth / 2,
            activeObjectTop
          ),
          'center',
          'center'
        );
      }

      // snap by the vertical center line
      if (this.isInRange(objectTop, activeObjectTop)) {
        horizontalInTheRange = true;
        this.horizontalLines.push({
          y: objectTop,
          x1:
            objectLeft < activeObjectLeft
              ? objectLeft - objectWidth / 2 - this.aligningLineOffset
              : objectLeft + objectWidth / 2 + this.aligningLineOffset,
          x2:
            activeObjectLeft > objectLeft
              ? activeObjectLeft + activeObjectWidth / 2 + this.aligningLineOffset
              : activeObjectLeft - activeObjectWidth / 2 - this.aligningLineOffset,
        });

        target.setPositionByOrigin(
          new fabric.Point(activeObjectLeft, objectTop),
          'center',
          'center'
        );
      }

      // snap by the top edge
      if (
        this.isInRange(
          objectTop - objectHeight / 2,
          activeObjectTop - activeObjectHeight / 2
        )
      ) {
        horizontalInTheRange = true;
        this.horizontalLines.push({
          y: objectTop - objectHeight / 2,
          x1:
            objectLeft < activeObjectLeft
              ? objectLeft - objectWidth / 2 - this.aligningLineOffset
              : objectLeft + objectWidth / 2 + this.aligningLineOffset,
          x2:
            activeObjectLeft > objectLeft
              ? activeObjectLeft + activeObjectWidth / 2 + this.aligningLineOffset
              : activeObjectLeft - activeObjectWidth / 2 - this.aligningLineOffset,
        });

        target.setPositionByOrigin(
          new fabric.Point(
            activeObjectLeft,
            objectTop - objectHeight / 2 + activeObjectHeight / 2
          ),
          'center',
          'center'
        );
      }

      // snap by the bottom edge
      if (
        this.isInRange(
          objectTop + objectHeight / 2,
          activeObjectTop + activeObjectHeight / 2
        )
      ) {
        horizontalInTheRange = true;
        this.horizontalLines.push({
          y: objectTop + objectHeight / 2,
          x1:
            objectLeft < activeObjectLeft
              ? objectLeft - objectWidth / 2 - this.aligningLineOffset
              : objectLeft + objectWidth / 2 + this.aligningLineOffset,
          x2:
            activeObjectLeft > objectLeft
              ? activeObjectLeft + activeObjectWidth / 2 + this.aligningLineOffset
              : activeObjectLeft - activeObjectWidth / 2 - this.aligningLineOffset,
        });

        target.setPositionByOrigin(
          new fabric.Point(
            activeObjectLeft,
            objectTop + objectHeight / 2 - activeObjectHeight / 2
          ),
          'center',
          'center'
        );
      }
    }

    if (!horizontalInTheRange) {
      this.horizontalLines.length = 0;
    }

    if (!verticalInTheRange) {
      this.verticalLines.length = 0;
    }
  };
}

export default AlignmentLineHandler;
