import { fabric } from 'fabric';

export const GuidelineOption = {
  /**
   * When have moved object, whether should show guideline
   * @type {boolean}
   */
  enabled: true,
};

export const GridOption = {
  enabled: true,
  grid: 20,
};

export const InteractionMode =
  'selection' | 'grselectionab' | 'polygon' | 'line' | 'arrow' | 'link' | 'crop';

export const createCanvasEl = (canvas, miniMap) => {
  let canvasSize = { width: canvas.getWidth(), height: canvas.getHeight() };
  let originalVPT = canvas.viewportTransform;
  // zoom to fit the design in the display canvas
  let designRatio = fabric.util.findScaleToFit(canvasSize, canvas);

  // zoom to fit the display the design in the minimap.
  let miniMapRatio = fabric.util.findScaleToFit(canvas, miniMap);

  let scaling = miniMap.getRetinaScaling();

  let finalWidth = canvasSize.width * designRatio;
  let finalHeight = canvasSize.height * designRatio;

  canvas.viewportTransform = [
    designRatio,
    0,
    0,
    designRatio,
    (canvas.getWidth() - finalWidth) / 2,
    (canvas.getHeight() - finalHeight) / 2,
  ];
  let canvasEl = canvas.toCanvasElement(miniMapRatio * scaling);
  canvas.viewportTransform = originalVPT;
  return canvasEl;
};

export const updateMiniMap = (canvas, miniMap) => {
  miniMap.backgroundImage._element = createCanvasEl(canvas, miniMap);
  miniMap.requestRenderAll();
};

export const updateMiniMapVP = (canvas, miniMap) => {
  let canvasSize = { width: canvas.width, height: canvas.height };
  let rect = miniMap.getObjects()[0];
  let canvasRatio = fabric.util.findScaleToFit(canvasSize, canvas);
  let totalRatio = fabric.util.findScaleToFit(canvasSize, miniMap);
  let finalRatio = canvasRatio / canvas.getZoom();
  rect.scaleX = finalRatio;
  rect.scaleY = finalRatio;
  rect.top =
    miniMap.backgroundImage.top -
    (canvas.viewportTransform[5] * totalRatio) / canvas.getZoom();
  rect.left =
    miniMap.backgroundImage.left -
    (canvas.viewportTransform[4] * totalRatio) / canvas.getZoom();
  miniMap.requestRenderAll();
};

export const initMiniMap = (canvas, miniMap) => {
  let canvasEl = createCanvasEl(canvas, miniMap);
  let backgroundImage = new fabric.Image(canvasEl);
  backgroundImage.scaleX = 1 / canvas.getRetinaScaling();
  backgroundImage.scaleY = 1 / canvas.getRetinaScaling();
  miniMap.centerObject(backgroundImage);
  miniMap.backgroundColor = 'white';
  miniMap.backgroundImage = backgroundImage;
  miniMap.requestRenderAll();
  let minimapView = new fabric.Rect({
    top: backgroundImage.top,
    left: backgroundImage.left,
    width: backgroundImage.width / canvas.getRetinaScaling(),
    height: backgroundImage.height / canvas.getRetinaScaling(),
    fill: 'rgba(0, 0, 255, 0.3)',
    cornerSize: 6,
    transparentCorners: false,
    cornerColor: 'blue',
    strokeWidth: 0
  });

  /*    const handleScaling = (event,transform,x,y) => {
        const { scaleX, scaleY } = transform;
        const mapScale = 1 /  canvas.getZoom();
        console.log('@@@',mapScale,scaleX);
        if(scaleX < mapScale || scaleY < mapScale){
            return;
        }
        fabric.controlsUtils.scalingEqually(event,transform,x,y);
    };
    fabric.Object.prototype.controls.br = new fabric.Control({
        ...fabric.Object.prototype.controls.br,
        actionHandler: handleScaling,
    });*/
  minimapView.controls = {
    br: fabric.Object.prototype.controls.br
  };

  miniMap.add(minimapView);
};