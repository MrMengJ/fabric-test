import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

import ECanvas from '../../objects/ECanvas';
import EditableTextShape from '../../objects/EditableTextShape';

const StyledCanvas = styled.canvas`
  width: 1000px;
  height: 600px;
  border: 1px solid red;
`;

let canvas;

function Demo7() {
  const canvasEl = useRef(null);

  useEffect(() => {
    if (canvasEl.current) {
      const canvasOptions = {
        backgroundColor: '#f3f3f3',
        width: 1000,
        height: 700,
      };

      canvas = new ECanvas(canvasEl.current, canvasOptions);
      window.ecanvas = canvas;

      const editableTextShape = new EditableTextShape({
        left: 100,
        top: 200,
        width: 300,
        height: 300,
        fill: '#34eeeb',
        // rx: 20,
        // ry: 20,
        fontSize: 20,
        text:
          '中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test\n中文test中文test中文test中文test中文test中文test',
        textAlign: 'center',
        fontFamily: 'Ubuntu',
        // underline: true,
        objectCaching: false,
        textStyle: {
          fill: 'red',
        },
      });

      console.log('editableTextShape', editableTextShape);
      canvas.add(editableTextShape);

      canvas.renderAll();
    }
  }, []);

  return <StyledCanvas ref={canvasEl} id={'canvas'} />;
}

Demo7.propTypes = {};

export default Demo7;
