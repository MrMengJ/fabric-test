import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { fabric } from 'fabric';

import ECanvas from '../../objects/ECanvas';

const StyledCanvas = styled.canvas`
  width: 1000px;
  height: 600px;
  border: 1px solid red;
`;

let canvas;

function Demo8() {
  const canvasEl = useRef(null);

  useEffect(() => {
    if (canvasEl.current) {
      const canvasOptions = {
        backgroundColor: '#f3f3f3',
        width: 1000,
        height: 700,
      };

      canvas = new ECanvas(canvasEl.current, canvasOptions);

      const TextBox = new fabric.Textbox(
        '中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test',
        {
          left: 200,
          top: 200,
          width: 200,
          height: 200,
          backgroundColor: 'red',
          fontSize: 14,
          splitByGrapheme: true,
        }
      );

      canvas.add(TextBox);

      canvas.renderAll();
    }
  }, []);

  return <StyledCanvas ref={canvasEl} id={'canvas'} />;
}

Demo8.propTypes = {};

export default Demo8;
