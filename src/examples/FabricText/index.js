import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import styled from 'styled-components';

import EText from '../../objects/EText';
import SText from '../../objects/SText';
import EGroup from '../../objects/EGroup';
import ECanvas from '../../objects/ECanvas';

const StyledCanvas = styled.canvas`
  width: 1000px;
  height: 600px;
  border: 1px solid red;
`;

let canvas;

function FabricText() {
  const canvasEl = useRef(null);

  useEffect(() => {
    if (canvasEl.current) {
      const canvasOptions = {
        preserveObjectStacking: true,
        selection: true,
        defaultCursor: 'default',
        backgroundColor: '#f3f3f3',
        width: 1000,
        height: 700,
      };
      canvas = new ECanvas(canvasEl.current, canvasOptions);

      const rect = new fabric.Rect({
        width: 200,
        height: 200,
        fill: '#34eeeb',
      });
      // canvas.add(rect);

      const textBox = new SText('Test text', {
        fontSize: 40,
        backgroundColor: 'red',
        fill: 'green',
        // top: 300,
        // left: 400,
        // lockMovementX: true,
        // lockMovementY: true,
        // lockScalingX: true,
        // lockScalingY: true,
        // hasControls: false,
        // hasBorders: false,
        // lockUniScaling:true
      });
      // canvas.add(textBox);

      const group = new EGroup([rect, textBox], {
        top: 150,
        left: 200,
      });

      canvas.add(group);

      canvas.renderAll();
    }
  }, []);

  return <StyledCanvas ref={canvasEl} id={'canvas'} />;
}

export default FabricText;
