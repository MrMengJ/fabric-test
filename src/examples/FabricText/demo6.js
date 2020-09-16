import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

import Canvas from '../../objects/Canvas';
import LabeledRect from '../../objects/LabeledRect';

const StyledCanvas = styled.canvas`
  width: 1000px;
  height: 600px;
  border: 1px solid red;
`;

let canvas;

function Demo6() {
  const canvasEl = useRef(null);

  useEffect(() => {
    if (canvasEl.current) {
      const canvasOptions = {
        backgroundColor: '#f3f3f3',
        width: 1000,
        height: 700,
      };

      canvas = new Canvas(canvasEl.current, canvasOptions);

      const labeledRect = new LabeledRect({
        left: 200,
        top: 200,
        width: 200,
        height: 200,
        fill: '#34eeeb',
        label: 'test',
      });

      console.log('labeledRect', labeledRect);

      canvas.add(labeledRect);

      canvas.renderAll();
    }
  }, []);

  return <StyledCanvas ref={canvasEl} id={'canvas'} />;
}

Demo6.propTypes = {};

export default Demo6;
