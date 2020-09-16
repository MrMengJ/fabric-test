import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { max } from 'lodash';

import Canvas from '../../objects/Canvas';
import Group from '../../objects/Group';
import Rect from '../../objects/Rect';

const StyledCanvas = styled.canvas`
  border: 1px solid red;
`;

let canvas;
let editableTextShape;
let editableTextShape2;

function Demo7() {
  const canvasEl = useRef(null);
  const [angle, setAngle] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);

  useEffect(() => {
    if (canvasEl.current) {
      const canvasOptions = {
        backgroundColor: '#f3f3f3',
        width: 1500,
        height: 700,
        // selectionFullyContained:false
      };

      canvas = new Canvas(canvasEl.current, canvasOptions);
      window.ecanvas = canvas;

      canvas.on('after:render', () => {
        const newZoom = canvas.getZoom();
        if (newZoom !== zoom) {
          setZoom(newZoom);
        }

        const newScaleX = editableTextShape.get('scaleX');
        if (newScaleX !== scaleX) {
          setScaleX(newScaleX);
        }

        const newScaleY = editableTextShape.get('scaleY');
        if (newScaleY !== scaleY) {
          setScaleY(newScaleY);
        }

        const newAngle = editableTextShape.get('angle');
        if (newAngle !== angle) {
          setAngle(newAngle);
        }
      });

      editableTextShape = new Rect({
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
        // strokeDashArray:   [10, 5],
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

      editableTextShape2 = new Rect({
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

      // const group = new Group([editableTextShape, editableTextShape2], {
      //   objectCaching: false, // group must set objectCaching false
      // });
      // canvas.add(group);

      // canvas.setZoom(1.5);
      canvas.renderAll();
    }
  }, []);

  const handleAddScaleX = () => {
    editableTextShape.set('scaleX', 3);
    // editableTextShape2.set('scaleX', 3);
    canvas.renderAll();
  };

  const handleAddScaleY = () => {
    editableTextShape.set('scaleY', 3);
    // editableTextShape2.set('scaleY', 3);
    canvas.renderAll();
  };

  const handleZoomOut = () => {
    const zoom = canvas.getZoom();
    canvas.setZoom(zoom + 1);
  };

  const handleZoomIn = () => {
    const zoom = canvas.getZoom();
    canvas.setZoom(max([1, zoom - 1]));
  };

  const handleAddAngle = () => {
    const angle = editableTextShape.get('angle');
    editableTextShape.rotate(angle + 30);
    canvas.renderAll();
  };

  const handleSubtractAngle = () => {
    const angle = editableTextShape.get('angle');
    editableTextShape.rotate(angle - 30);
    canvas.renderAll();
  };

  return (
    <>
      <StyledCanvas ref={canvasEl} id={'canvas'} />
      <button onClick={handleAddScaleX}>scaleX * 3</button>
      <button onClick={handleAddScaleY}>scaleY * 3</button>
      <button onClick={handleZoomOut}>+1 zoom</button>
      <button onClick={handleZoomIn}>-1 zoom</button>
      <button onClick={handleAddAngle}>+ 30°</button>
      <button onClick={handleSubtractAngle}>- 30°</button>
      <p>角度：{angle}</p>
      <p>缩放：{zoom}</p>
      <p>scaleX：{scaleX}</p>
      <p>scaleY：{scaleY}</p>
    </>
  );
}

Demo7.propTypes = {};

export default Demo7;
