import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { max } from 'lodash';

import Canvas from '../../objects/Canvas';
import ConnectionLine from '../../objects/ConnectionLine';
import { DIRECTION } from '../../constants/shapes';
import { DataStore } from '../../shapes/DataStore';
import { Handler } from '../../handlers';
import { Document } from '../../shapes/Document';
import { Customer } from '../../shapes/Customer';
import { Activity } from '../../shapes/Activity';
import Group from "../../objects/Group";

const StyledCanvas = styled.canvas`
  border: 1px solid red;
`;

const StyledMiniMap = styled.canvas`
  border: 1px solid #000;
`;

const jsonData = {
  objects: [
    {
      type: 'grid',
      version: '4.2.0',
      originX: 'left',
      originY: 'top',
      left: 50,
      top: 50,
      width: 1300,
      height: 500,
      fill: '#fff',
      stroke: '#ECF3FE',
      strokeWidth: 1,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
    },
    {
      id: 'a',
      type: 'DataStore',
      originX: 'left',
      originY: 'top',
      left: 555,
      top: 72,
      width: 200,
      height: 120,
      fill: '#fff',
      stroke: '#000',
      strokeWidth: 1,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      text: '信息系统',
      fontSize: 14,
      fontWeight: 'normal',
      fontFamily: 'Times New Roman',
      fontStyle: 'normal',
      lineHeight: 1.16,
      underline: false,
      overline: false,
      linethrough: false,
      textAlign: 'center',
      charSpacing: 0,
      minWidth: 20,
      splitByGrapheme: true,
      startColor: '#fff',
      endColor: '#fff',
      direction: 'BOTTOM',
      gradient: true,
      verticalAlign: 'middle',
      hasControls: true,
      hasBorders: true,
      textStyle: {
        stroke: null,
        strokeWidth: 1,
        fill: '#000',
      },
      textStyles: {},
    },
    {
      id: 'b',
      type: 'ConnectionLine',
      originX: 'left',
      originY: 'top',
      left: 250,
      top: 250,
      width: 250,
      height: 250,
      fill: null,
      stroke: '#000',
      strokeWidth: 0,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      textAlign: 'left',
      fontSize: 15,
      points: [
        {
          x: 250,
          y: 250,
        },
        {
          x: 375,
          y: 250,
        },
        {
          x: 375,
          y: 500,
        },
        {
          x: 500,
          y: 500,
        },
      ],
      arrowType: 'normal',
      fromPoint: {
        x: 250,
        y: 250,
      },
      toPoint: {
        x: 500,
        y: 500,
      },
      fromDirection: 'right',
      toDirection: 'left',
      text: '大连飞机了的萨鲁法尔\n1232149080\njlj大连飞机',
      hasControls: false,
      hasBorders: true,
      textStyle: {
        stroke: null,
        strokeWidth: 1,
        strokeDashArray: null,
        fill: '#000',
        backgroundColor: '#fff',
      },
    },
  ],
};

let canvas;
let group;
let dataStore;
let kcp;
let connectionLine;
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
        // miniMap: miniMap,
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
        id: '1',
        isEditingText: false,
        gradient: true,
        scalePercent: 1,
        thumbnail: false,
        readonly: false,
        hasText: true,
        minimal: false,
        width: 200,
        height: 120,
        fill: '',
        stroke: '#000',
        // direction: DIRECTION.BOTTOM,
        // startColor: '#fff',
        // endColor: '#fff',
        left: 50,
        top: 50,
        textAlign: 'center',
        verticalAlign: 'middle',
        text: '信息系统',
      });
      console.log('====', dataStore);
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
      //
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
        text: '文档斯大林分类看电视剧奥洛菲\ndasfe',
        left: 40,
        top: 400,
        textAlign: 'center',
        verticalAlign: 'middle',
        opacity: 0.5,
      });
      // canvas.add(_document);

      const customer = new Customer({
        isEditingText: false,
        gradient: true,
        scalePercent: 1,
        thumbnail: false,
        readonly: false,
        hasText: true,
        minimal: false,
        width: 100,
        height: 60,
        fill: '#fff',
        stroke: '#000',
        // direction: DIRECTION.BOTTOM,
        // startColor: '#9494ff',
        // endColor: '#cacaff',
        left: 1050,
        top: 100,
        textAlign: 'center',
        verticalAlign: 'middle',
        text: '客户',
        // opacity: 0.5,
      });
      canvas.add(customer);

      let activity = new Activity({
        gradient: true,
        width: 100,
        height: 60,
        rx: 8,
        ry: 8,
        fill: '#fff',
        stroke: '#000',
        direction: DIRECTION.BOTTOM,
        startColor: '#71afff',
        endColor: '#bddaff',
        left: 100,
        top: 100,
      });
      canvas.add(activity);

      connectionLine = new ConnectionLine({
        id: '2',
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
        // originX: 'center',
        // originY: 'center',
        // left: 50,
        // top: 40,
        fromPoint: { x: 250, y: 250 },
        toPoint: { x: 500, y: 500 },
        // fromDirection: 'left',
        // toDirection: 'right',
        fromDirection: 'right',
        toDirection: 'left',
        text: '大连飞机了的萨鲁法尔\n1232149080\njlj大连飞机',
        // hasControls: true,
        hasBorders: true,
      });
      canvas.add(connectionLine);

      // canvas.add(dataStore);

      // group = new Group([_document, connectionLine]);
      // canvas.add(group);

      // initMiniMap(canvas, miniMap);
      // miniMap.renderAll();
      // canvas.loadFromJSON(JSON.stringify(jsonData));

      canvas.renderAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddScaleX = () => {
    if (connectionLine.group) {
      connectionLine.group.set('scaleX', 2);
    } else {
      connectionLine.set('scaleX', connectionLine.get('scaleX') * 2);
    }
    canvas.renderAll();
  };

  const handleAddScaleY = () => {
    if (connectionLine.group) {
      connectionLine.group.set('scaleY', 2);
    } else {
      connectionLine.set('scaleY', 2);
    }
    canvas.renderAll();
  };

  const handleZoomOut = () => {
    const zoom = canvas.getZoom();
    canvas.zoomToPoint(
      { x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 },
      zoom + 0.5
    );
    // canvas.setZoom(zoom + 1);
  };

  const handleZoomIn = () => {
    const zoom = canvas.getZoom();
    canvas.zoomToPoint(
      { x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 },
      max([1, zoom - 1])
    );
    // canvas.setZoom(max([1, zoom - 1]));
  };

  const handleAddAngle = () => {
    const angle = dataStore.get('angle');
    console.log('dataStore', dataStore);
    console.log('centeredRotation', dataStore.centeredRotation);
    dataStore.rotate(angle + 30);
    debugger;
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

  const handleExportAsSvg = () => {
    const svg = canvas.toSVG();
    console.log('svg', svg);
  };

  return (
    <>
      <StyledCanvas ref={canvasEl} id={'canvas'} width={1500} height={700} />
      <button onClick={handleAddScaleX}>scaleX * 2</button>
      <button onClick={handleAddScaleY}>scaleY * 2</button>
      <button onClick={handleZoomOut}>+1 zoom</button>
      <button onClick={handleZoomIn}>-1 zoom</button>
      <button onClick={handleAddAngle}>+ 30°</button>
      <button onClick={handleSubtractAngle}>- 30°</button>
      <button onClick={handleConnectionMode}>
        {isConnectionMode ? '取消连线' : '连线模式'}
      </button>
      <button onClick={handleExportAsSvg}>导出为Svg</button>
      <br />
      <span>角度：{angle}</span>&nbsp;&nbsp;&nbsp;&nbsp;
      <span>缩放：{zoom}</span>&nbsp;&nbsp;&nbsp;&nbsp;
      <span>scaleX：{scaleX}</span>&nbsp;&nbsp;&nbsp;&nbsp;
      <span>scaleY：{scaleY}</span>&nbsp;&nbsp;&nbsp;&nbsp;
      {/*<StyledMiniMap ref={miniMapEl} id={'miniMap'} />*/}
    </>
  );
}

Demo11.propTypes = {};

export default Demo11;
