class ZoomHandler {
    constructor(handler) {
        this.handler = handler;
    }
    zoomToPoint = (point, zoom) => {
        const { minZoom, maxZoom } = this.handler;
        let zoomRatio = zoom;
        if (zoom <= minZoom / 100) {
            zoomRatio = minZoom / 100;
        } else if (zoom >= maxZoom / 100) {
            zoomRatio = maxZoom / 100;
        }
        this.handler.canvas.zoomToPoint(point, zoomRatio);
        this.handler.canvas.requestRenderAll();
    };
}

export default ZoomHandler;