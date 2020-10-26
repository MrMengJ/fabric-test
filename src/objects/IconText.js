import { fabric } from 'fabric';
import { isEmpty, forEach } from 'lodash';
import Text from './Text';
import { ICON_SET, ICON_TYPE } from './constants';

const deleteIcon =
  "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";
let img = document.createElement('img');
img.src = deleteIcon;
let cornerSize = 15;

const IconText = fabric.util.createClass(Text, {
  cursor: 'pointer',
  icon: [
    {
      type: ICON_TYPE.PROCESS,
      event: (e, target) => {
        console.log('###',e);
        window.open("http://www.w3school.com.cn")
      },
    },
  ],
  render: function (ctx) {
    this.callSuper('render', ctx);
    if (!isEmpty(this.icon)) {
      forEach(this.icon, (item) => this._renderIcon(ctx, item.type));
    }
  },
  _renderIcon: function (ctx, type) {
    ctx.save();
    ctx.setTransform(
      this.canvas.getRetinaScaling(),
      0,
      0,
      this.canvas.getRetinaScaling(),
      0,
      0
    );
    let point = this._getTransformPoint(type, this);
    ctx.translate(point.x, point.y);
    //icon synchronous scaling
    let currentSizeX =
      this.getObjectScaling().scaleX * this.canvas.getZoom() * cornerSize;
    let currentSizeY =
      this.getObjectScaling().scaleY * this.canvas.getZoom() * cornerSize;
    ctx.drawImage(img, -currentSizeX / 2, -currentSizeY / 2, currentSizeX, currentSizeY);
    ctx.restore();
  },
  _findIcon: function (pointer) {
    let iconType;
    let iconCoords = this._getTotalIconPoint();
    if (!isEmpty(iconCoords)) {
      forEach(iconCoords, (item) => {
        const { type, coord } = item;
        if (
          pointer.x >= coord.x1 &&
          pointer.x <= coord.x2 &&
          pointer.y >= coord.y1 &&
          pointer.y <= coord.y2
        ) {
          iconType = type;
        }
      });
    }
    return iconType;
  },
  _getTransformPoint: function (type) {
    const transformMatrix = this.calcTransformMatrix();
    const translateMatrix = this._calcTranslateMatrix();
    translateMatrix[4] = transformMatrix[4];
    translateMatrix[5] = transformMatrix[5];
    const rotateMatrix = fabric.util.calcRotateMatrix({
      angle: this._getActualAngle(),
    });
    const vpt = this.getViewportTransform();
    const startMatrix = fabric.util.multiplyTransformMatrices(vpt, translateMatrix);
    const dim = new fabric.Point(this._getActualWidth(), this._getActualHeight());
    let finalMatrix = fabric.util.multiplyTransformMatrices(startMatrix, rotateMatrix);
    finalMatrix = fabric.util.multiplyTransformMatrices(finalMatrix, [
      1 / vpt[0],
      0,
      0,
      1 / vpt[3],
      0,
      0,
    ]);
    return fabric.util.transformPoint(
      {
        x: dim.x * ICON_SET[type].x,
        y: dim.y * ICON_SET[type].y,
      },
      finalMatrix
    );
  },
  _getTotalIconPoint: function () {
    let iconCoords = [];
    if (!isEmpty(this.icon)) {
      forEach(this.icon, (item) => {
        const centrePoint = this._getTransformPoint(item.type, this);
        let currentSizeX =
          this.getObjectScaling().scaleX * this.canvas.getZoom() * cornerSize;
        let currentSizeY =
          this.getObjectScaling().scaleY * this.canvas.getZoom() * cornerSize;
        let frontier = {
          x1: centrePoint.x - currentSizeX / 2,
          y1: centrePoint.y - currentSizeY / 2,
          x2: centrePoint.x + currentSizeX / 2,
          y2: centrePoint.y + currentSizeY / 2,
        };
        iconCoords.push({
          type: item.type,
          coord: frontier,
        });
      });
    }
    return iconCoords;
  },
  _getIconHandler: function (type) {
    let event;
    forEach(this.icon, (item) => {
      if (item.type === type) {
        event = item.event;
      }
    });
    return event;
  },
});

export default IconText;
