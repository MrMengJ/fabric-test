import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { forEach, max } from 'lodash';

import Canvas from '../../objects/Canvas';
import ConnectionLine from '../../objects/ConnectionLine';
import { DIRECTION } from '../../constants/shapes';
import { DataStore } from '../../shapes/DataStore';
import { KeyCompliancePoint } from '../../shapes/KeyCompliancePoint';
import { Handler } from '../../handlers';
import { initMiniMap } from '../../helper/utils';
import { Document } from '../../shapes/Document';
import { Customer } from '../../shapes/Customer';

const StyledCanvas = styled.canvas`
  border: 1px solid red;
`;

const StyledMiniMap = styled.canvas`
  border: 1px solid #000;
`;

let canvas;
let dataStore;
let kcp;
let miniMap;

function Demo11() {
  const canvasEl = useRef(null);
  const miniMapEl = useRef(null);
  const [angle, setAngle] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [isConnectionMode, setIsConnectionMode] = useState(false);

  useEffect(() => {
    if (canvasEl.current) {
      const canvasOptions = {
        backgroundColor: '#f3f3f3',
        // selectionFullyContained:false
      };
      canvas = new Canvas(canvasEl.current, canvasOptions);
      window.ecanvas = canvas;

      const miniMapOptions = {
        backgroundColor: '#fff',
        width: 200,
        height: 200,
        selection: false,
      };
      miniMap = new Canvas(miniMapEl.current, miniMapOptions);
      new Handler({
        canvas: canvas,
        miniMap: miniMap,
      });

      canvas.on('after:render', () => {
        const newZoom = canvas.getZoom();
        if (newZoom !== zoom) {
          setZoom(newZoom);
        }

        // const { scaleX: newScaleX, scaleY: newScaleY } = dataStore.getObjectScaling();
        // if (newScaleX !== scaleX) {
        //   setScaleX(newScaleX);
        // }
        //
        // if (newScaleY !== scaleY) {
        //   setScaleY(newScaleY);
        // }
        //
        // const newAngle = dataStore.get('angle');
        // if (newAngle !== angle) {
        //   setAngle(newAngle);
        // }
      });

      dataStore = new DataStore({
        isEditingText: false,
        gradient: true,
        scalePercent: 1,
        thumbnail: false,
        readonly: false,
        hasText: true,
        minimal: false,
        width: 200,
        height: 120,
        fill: '#fff',
        stroke: '#000',
        direction: DIRECTION.BOTTOM,
        startColor: '#fff',
        endColor: '#fff',
        left: 500,
        top: 200,
        textAlign: 'center',
        verticalAlign: 'middle',
        text: '信息系统',
      });
      canvas.add(dataStore);
      //
      // kcp = new KeyCompliancePoint({
      //   isEditingText: false,
      //   gradient: false,
      //   scalePercent: 1,
      //   thumbnail: false,
      //   readonly: false,
      //   hasText: true,
      //   minimal: false,
      //   width: 100,
      //   height: 60,
      //   stroke: '#ff1010',
      //   left: 200,
      //   top: 300,
      //   textAlign: 'center',
      //   verticalAlign: 'middle',
      //   text: 'KCP',
      // });
      // canvas.add(kcp);

      let _document = new Document({
        isEditingText: false,
        gradient: false,
        scalePercent: 1,
        thumbnail: false,
        readonly: false,
        hasText: true,
        minimal: false,
        width: 100,
        height: 60,
        x: 0,
        y: 0,
        fill: '#ffff00',
        stroke: '#000',
        text: '文档',
        left: 40,
        top: 200,
        textAlign: 'center',
        verticalAlign: 'middle',
      });
      canvas.add(_document);

      // const customer = new Customer({
      //   isEditingText: false,
      //   gradient: true,
      //   scalePercent: 1,
      //   thumbnail: false,
      //   readonly: false,
      //   hasText: true,
      //   minimal: false,
      //   width: 100,
      //   height: 60,
      //   fill: '#fff',
      //   stroke: '#000',
      //   direction: DIRECTION.BOTTOM,
      //   startColor: '#9494ff',
      //   endColor: '#cacaff',
      //   left: 1050,
      //   top: 100,
      //   textAlign: 'center',
      //   verticalAlign: 'middle',
      //   text: '客户',
      // });
      // canvas.add(customer);

      const connectionLine = new ConnectionLine({
        // points: [
        //   { x: 10, y: 10 },
        //   { x: 10, y: 130 },
        //   { x: 140, y: 130 },
        //   { x: 140, y: 250 },
        //   { x: 240, y: 250 },
        //   { x: 240, y: 300 },
        //   { x: 300, y: 300 },
        // ],
        // stroke: '#e98516',
        // arrowType: 'double-sided',
        // evented: false,
        // originX: 'cente r',
        // originY: 'center',
        // left: 50,
        // top: 40,
        fromPoint: { x: 50, y: 50 },
        toPoint: { x: 300, y: 300 },
        fromDirection: 'left',
        toDirection: 'right',
        text: '大连飞机了的萨鲁法尔\n1232149080\njlj大连飞机',
        hasControls: true,
        hasBorders: true,
      });
      // canvas.add(connectionLine);

      initMiniMap(canvas, miniMap);
      miniMap.renderAll();
      canvas.renderAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddScaleX = () => {
    dataStore.set('scaleX', 3);
    canvas.renderAll();
  };

  const handleAddScaleY = () => {
    dataStore.set('scaleY', 3);
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
    const angle = dataStore.get('angle');
    dataStore.rotate(angle + 30);
    canvas.renderAll();
  };

  const handleSubtractAngle = () => {
    const angle = dataStore.get('angle');
    dataStore.rotate(angle - 30);
    canvas.renderAll();
  };

  const handleConnectionMode = () => {
    canvas.setConnectionMode(!isConnectionMode);
    setIsConnectionMode(!isConnectionMode);
  };

  return (
    <>
      <StyledCanvas ref={canvasEl} id={'canvas'} width={1500} height={700} />
      <button onClick={handleAddScaleX}>scaleX * 3</button>
      <button onClick={handleAddScaleY}>scaleY * 3</button>
      <button onClick={handleZoomOut}>+1 zoom</button>
      <button onClick={handleZoomIn}>-1 zoom</button>
      <button onClick={handleAddAngle}>+ 30°</button>
      <button onClick={handleSubtractAngle}>- 30°</button>
      <button onClick={handleConnectionMode}>
        {isConnectionMode ? '取消连线' : '连线模式'}
      </button>
      <br />
      <span>角度：{angle}</span>&nbsp;&nbsp;&nbsp;&nbsp;
      <span>缩放：{zoom}</span>&nbsp;&nbsp;&nbsp;&nbsp;
      <span>scaleX：{scaleX}</span>&nbsp;&nbsp;&nbsp;&nbsp;
      <span>scaleY：{scaleY}</span>&nbsp;&nbsp;&nbsp;&nbsp;
      <StyledMiniMap ref={miniMapEl} id={'miniMap'} />
    </>
  );
}

Demo11.propTypes = {};

export default Demo11;
