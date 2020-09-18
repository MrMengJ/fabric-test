import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { fabric } from 'fabric';

import Canvas from '../../objects/Canvas';

const StyledCanvas = styled.canvas`
  border: 1px solid red;
`;

let canvas;

function Demo10() {
  const canvasEl = useRef(null);

  useEffect(() => {
    if (canvasEl.current) {
      const canvasOptions = {
        backgroundColor: '#f3f3f3',
        width: 1500,
        height: 700,
        // selectionFullyContained:false
      };
      canvas = new Canvas(canvasEl.current, canvasOptions);

      function makeLine(coords) {
        return new fabric.Line(coords, {
          fill: 'red',
          stroke: 'red',
          strokeWidth: 5,
          selectable: false,
          evented: false,
        });
      }

      var line = makeLine([250, 125, 250, 175]),
        line2 = makeLine([250, 175, 250, 250]),
        line3 = makeLine([250, 250, 300, 350]),
        line4 = makeLine([250, 250, 200, 350]),
        line5 = makeLine([250, 175, 175, 225]),
        line6 = makeLine([250, 175, 325, 225]);

      // canvas.add(line, line2, line3, line4, line5, line6);

      var poly = new fabric.Polyline(
        [
          { x: 10, y: 10 },
          { x: 50, y: 30 },
          { x: 40, y: 70 },
          { x: 60, y: 50 },
          { x: 100, y: 150 },
          { x: 40, y: 100 },
        ],
        {
          stroke: 'blue',
          left: 100,
          top: 100,
        }
      );
      canvas.add(poly);

      canvas.renderAll();
    }
  }, []);

  return <StyledCanvas ref={canvasEl} id={'canvas'} />;
}

Demo10.propTypes = {};

export default Demo10;
