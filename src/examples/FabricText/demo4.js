import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import styled from 'styled-components';
import { get, filter, forEach } from 'lodash';

import ECanvas from '../../objects/ECanvas';
import EGroup from '../../objects/EGroup';

const StyledCanvas = styled.canvas`
  width: 1000px;
  height: 600px;
  border: 1px solid red;
`;

let canvas;

function Demo4() {
  const canvasEl = useRef(null);

  useEffect(() => {
    if (canvasEl.current) {
      const canvasOptions = {
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

      const textBox = new fabric.Textbox('Test text', {
        width: 200,
        height: 200,
        backgroundColor: 'red',
        fontSize: 40,
        // lockMovementX: true,
        // lockMovementY: true,
        // lockScalingX: true,
        // lockScalingY: true,
        // hasControls: false,
        // hasBorders: false,
        splitByGrapheme: true,
      });

      const group = new EGroup([rect, textBox], {
        top: 150,
        left: 200,
      });
      canvas.add(group);

      canvas.on('object:scaling', (groupObj) => {
        const objects = get(groupObj, 'target._objects');
        const textBoxObjs = filter(objects, (item) => item.type === 'textbox');
        forEach(textBoxObjs, (item) => {
          item.scaleToWidth(item.width * item.scaleX);
          item.scaleToWidth(item.height * item.scaleY);
        });
        console.log('textBoxObjs', textBoxObjs);
        console.log('objects', objects);
      });

      canvas.renderAll();
    }
  }, []);

  return <StyledCanvas ref={canvasEl} id={'canvas'} />;
}

Demo4.propTypes = {};

export default Demo4;
