import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { forEach, max } from 'lodash';

import Canvas from '../../objects/Canvas';
import Group from '../../objects/Group';
import Rect from '../../objects/Rect';

const StyledCanvas = styled.canvas`
  border: 1px solid red;
`;

let canvas;
let editableTextShape;
let editableTextShape2;
let group;

function Demo12() {
  const canvasEl = useRef(null);
  const [angle, setAngle] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [isConnectionMode, setIsConnectionMode] = useState(false);

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

        const {
          scaleX: newScaleX,
          scaleY: newScaleY,
        } = editableTextShape.getObjectScaling();
        if (newScaleX !== scaleX) {
          setScaleX(newScaleX);
        }

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
        fill: '#eec2ae',
        fontSize: 20,
        // angle: 30,
        text: '222222222222222222222222222',
        // textAlign: 'center',
        // verticalAlign: 'middle',
        fontFamily: 'Ubuntu',
        // fontWeight: 'bold',
        // fontStyle: 'italic',
        underline: true,
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

      // group = new Group([editableTextShape, editableTextShape2], {
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

  const handleConnectionMode = () => {
    const allObjects = canvas.getObjects();
    if (isConnectionMode) {
      canvas.set('connectionMode', false);
      setIsConnectionMode(false);
      forEach(allObjects, (item) => {
        if (item.hasControls) {
          item.setControlsVisibility({
            ml: true,
            mt: true,
            mr: true,
            mb: true,
          });
        }
      });
      canvas.requestRenderAll();
    } else {
      setIsConnectionMode(true);
      canvas.set('connectionMode', true);
      forEach(allObjects, (item) => {
        if (item.hasControls) {
          item.setControlsVisibility({
            ml: false,
            mt: false,
            mr: false,
            mb: false,
          });
        }
      });
      canvas.requestRenderAll();
    }
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
      <button onClick={handleConnectionMode}>
        {isConnectionMode ? '取消连线' : '连线模式'}
      </button>
      <p>角度：{angle}</p>
      <p>缩放：{zoom}</p>
      <p>scaleX：{scaleX}</p>
      <p>scaleY：{scaleY}</p>
    </>
  );
}

Demo12.propTypes = {};

export default Demo12;
