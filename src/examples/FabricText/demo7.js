import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { fabric } from 'fabric';

import ECanvas from '../../objects/ECanvas';
import EditableTextShape from '../../objects/EditableTextShape';

const StyledCanvas = styled.canvas`
  border: 1px solid red;
`;

let canvas;
let editableTextShape;
let editableTextShape2;

function Demo7() {
  const canvasEl = useRef(null);
  const [angle, setAngle] = useState();

  useEffect(() => {
    if (canvasEl.current) {
      const canvasOptions = {
        backgroundColor: '#f3f3f3',
        width: 1500,
        height: 700,
        // selectionFullyContained:false
      };

      canvas = new fabric.Canvas(canvasEl.current, canvasOptions);
      window.ecanvas = canvas;

      editableTextShape = new EditableTextShape({
        left: 100,
        top: 100,
        width: 300,
        height: 300,
        fill: '#34eeeb',
        // scaleX: 3,
        // rx: 20,
        // ry: 20,
        fontSize: 20,
        // angle: 163,
        text:
          '中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test中文test\n中文test中文test中文test中文test中文test中文test',
        textAlign: 'center',
        verticalAlign: 'middle',
        fontFamily: 'Ubuntu',
        // fontWeight: 'bold',
        // fontStyle: 'italic',
        underline: true,
        borderColor: '#f94eff',
        stroke: '#feff5b',
        strokeWidth: 0,
        // strokeDashArray: [10, 5],
        // selectable:false,
        // overline: true,
        // linethrough: true,
        // lockScalingX: true,
        // lockScalingY: true,
        // objectCaching: true,
        textStyle: {
          fill: 'red',
        },
      });

      editableTextShape2 = new EditableTextShape({
        type: '=========',
        left: 500,
        top: 100,
        width: 300,
        height: 300,
        fill: '#34eeeb',
        fontSize: 20,
        // angle: 30,
        text: '222222222222222222222222222',
        // textAlign: 'center',
        // verticalAlign: 'middle',
        fontFamily: 'Ubuntu',
        // fontWeight: 'bold',
        // fontStyle: 'italic',
        underline: true,
        borderColor: '#f94eff',
        stroke: '#feff5b',
        strokeWidth: 0,
        // strokeDashArray: [10, 5],
        // selectable:false,
        // overline: true,
        // linethrough: true,
        // objectCaching: true,
        textStyle: {
          fill: 'red',
        },
      });

      canvas.add(editableTextShape);
      canvas.add(editableTextShape2);

      // const group = new fabric.Group([editableTextShape, editableTextShape2], {
      //   objectCaching: false, // group must set objectCaching false
      // });
      // canvas.add(group);

      // canvas.setZoom(1.5);
      canvas.renderAll();
    }
  }, []);

  const handleAddScale = () => {
    editableTextShape.set('scaleX', 3);
    // editableTextShape2.set('scaleX', 3);
    canvas.renderAll();
  };

  const handleZoomOut = () => {
    const zoom = canvas.getZoom();
    console.log('zoom', zoom);
    canvas.setZoom(zoom + 1);
  };

  const handleAddAngle = () => {
    const angle = editableTextShape.get('angle');
    editableTextShape.rotate(angle + 30);
    setAngle(angle + 30);
    canvas.renderAll();
  };

  const handleSubtractAngle = () => {
    const angle = editableTextShape.get('angle');
    editableTextShape.rotate(angle - 30);
    setAngle(angle - 30);
    canvas.renderAll();
  };

  return (
    <>
      <StyledCanvas ref={canvasEl} id={'canvas'} />
      <button onClick={handleAddScale}>+ scale</button>
      <button onClick={handleZoomOut}>+ zoom</button>
      <button onClick={handleAddAngle}>+ 30°</button>
      <button onClick={handleSubtractAngle}>- 30°</button>
      <p>角度：{angle}</p>
    </>
  );
}

Demo7.propTypes = {};

export default Demo7;
