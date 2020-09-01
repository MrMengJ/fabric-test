import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

import ECanvas from '../../objects/ECanvas';
import EText from '../../objects/EText';

const StyledCanvas = styled.canvas`
  width: 1000px;
  height: 600px;
  border: 1px solid red;
`;

let canvas;

function Demo5() {
  const canvasEl = useRef(null);

  useEffect(() => {
    if (canvasEl.current) {
      const canvasOptions = {
        backgroundColor: '#f3f3f3',
        width: 1000,
        height: 700,
      };

      canvas = new ECanvas(canvasEl.current, canvasOptions);

      const textBox = new EText('Test text', {
        left: 200,
        top: 200,
        width: 200,
        height: 200,
        backgroundColor: 'red',
        fontSize: 40,
        splitByGrapheme: true,
      });

      canvas.add(textBox);

      canvas.renderAll();
    }
  }, []);

  return <StyledCanvas ref={canvasEl} id={'canvas'} />;
}

Demo5.propTypes = {};

export default Demo5;
