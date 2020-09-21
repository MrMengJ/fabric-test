import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { max } from 'lodash';

import Canvas from '../../objects/Canvas';
import ConnectionLine from '../../objects/ConnectionLine';

const StyledCanvas = styled.canvas`
  border: 1px solid red;
`;

let canvas;

function Demo11() {
  const canvasEl = useRef(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (canvasEl.current) {
      const canvasOptions = {
        backgroundColor: '#f3f3f3',
        // selectionFullyContained:false
      };
      canvas = new Canvas(canvasEl.current, canvasOptions);

      canvas.on('after:render', () => {
        const newZoom = canvas.getZoom();
        if (newZoom !== zoom) {
          setZoom(newZoom);
        }
      });

      const connectionLine = new ConnectionLine(
        [
          { x: 10, y: 10 },
          { x: 10, y: 30 },
          { x: 40, y: 30 },
          { x: 40, y: 50 },
          { x: 100, y: 50 },
          { x: 100, y: 100 },
          // { x: 200, y: 100 },
        ],
        {
          stroke: '#e98516',
          arrowType: 'double-sided',
        }
      );
      canvas.add(connectionLine);

      canvas.renderAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleZoomOut = () => {
    const zoom = canvas.getZoom();
    canvas.setZoom(zoom + 1);
  };

  const handleZoomIn = () => {
    const zoom = canvas.getZoom();
    canvas.setZoom(max([1, zoom - 1]));
  };

  return (
    <>
      <StyledCanvas ref={canvasEl} id={'canvas'} width={1500} height={700} />
      <button onClick={handleZoomOut}>+1 zoom</button>
      <button onClick={handleZoomIn}>-1 zoom</button>
      <p>缩放：{zoom}</p>
    </>
  );
}

Demo11.propTypes = {};

export default Demo11;
