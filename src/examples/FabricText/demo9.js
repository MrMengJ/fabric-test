import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

import Canvas from '../../objects/Canvas';
import { DIRECTION } from '../../constants/shapes';
import { Activity } from '../../shapes/Activity';
import { Role } from '../../shapes/Role';
import { VirtualRole } from '../../shapes/VirtualRole';
import { From } from '../../shapes/From';
import { Decision } from '../../shapes/Decision';
import { Customer } from '../../shapes/Customer';
import { BackIn } from '../../shapes/BackIn';
import { Event } from '../../shapes/Event';
import { DataStore } from '../../shapes/DataStore';
import { ProcessInterface } from '../../shapes/ProcessInterface';
import { KeyCompliancePoint } from '../../shapes/KeyCompliancePoint';
import { Document } from '../../shapes/Document';
import { END } from '../../shapes/END';
import { BackOut } from '../../shapes/BackOut';
import { Handler } from '../../handlers';
import { initMiniMap } from '../../helper/utils';

const StyledCanvas = styled.canvas`
  border: 1px solid red;
`;

const StyledMiniMap = styled.canvas`
  border: 1px solid #000;
`;

let canvas;
let miniMap;
let activity;
let role;
let virtualRole;
let from;
let decision;
let customer;
let backIn;
let event;
let dataStore;
let processInterface;
let kcp;
let _document;
let end;
let backOut;

function Demo9() {
  const canvasEl = useRef(null);
  const miniMapEl = useRef(null);

  useEffect(() => {
    if (canvasEl.current) {
      const canvasOptions = {
        backgroundColor: '#f3f3f3',
        width: 3000,
        height: 800,
        // selectionFullyContained:false
      };

      const miniMapOptions = {
        backgroundColor: '#fff',
        width: 200,
        height: 200,
        selection: false,
      };

      canvas = new Canvas(canvasEl.current, canvasOptions);
      miniMap = new Canvas(miniMapEl.current, miniMapOptions);
      window.ecanvas = canvas;
      new Handler({
        canvas: canvas,
        miniMap: miniMap,
      });

      activity = new Activity({
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
      role = new Role({
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
        direction: DIRECTION.BOTTOM,
        startColor: '#fcff7b',
        endColor: '#ffffc6',
        left: 300,
        top: 100,
        textAlign: 'center',
        verticalAlign: 'middle',
        text: '角色',
      });
      virtualRole = new VirtualRole({
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
        direction: DIRECTION.BOTTOM,
        startColor: '#fcff7b',
        endColor: '#ffffc6',
        left: 500,
        top: 100,
        textAlign: 'center',
        verticalAlign: 'middle',
        text: '虚拟角色',
      });
      from = new From({
        isEditingText: false,
        gradient: true,
        scalePercent: 1,
        thumbnail: false,
        readonly: false,
        hasText: true,
        minimal: false,
        fill: '#fff',
        stroke: '#000',
        direction: DIRECTION.BOTTOM,
        startColor: '#71afff',
        endColor: '#71afff',
        left: 700,
        top: 100,
        textAlign: 'center',
        verticalAlign: 'middle',
        text: 'From',
      });
      decision = new Decision({
        isEditingText: false,
        gradient: false,
        scalePercent: 1,
        thumbnail: false,
        readonly: false,
        hasText: true,
        minimal: false,
        fill: '#ff6666',
        stroke: '#000',
        left: 850,
        top: 100,
        textAlign: 'center',
        verticalAlign: 'middle',
        text: '决策',
      });
      customer = new Customer({
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
        direction: DIRECTION.BOTTOM,
        startColor: '#9494ff',
        endColor: '#cacaff',
        left: 1050,
        top: 100,
        textAlign: 'center',
        verticalAlign: 'middle',
        text: '客户',
      });
      backIn = new BackIn({
        isEditingText: false,
        gradient: true,
        scalePercent: 1,
        thumbnail: false,
        readonly: false,
        hasText: true,
        minimal: false,
        width: 50,
        height: 60,
        fill: '#fff',
        stroke: '#000',
        direction: DIRECTION.BOTTOM,
        startColor: '#9aff9a',
        endColor: '#9aff9a',
        left: 1250,
        top: 100,
        textAlign: 'center',
        verticalAlign: 'middle',
      });
      event = new Event({
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
        direction: DIRECTION.BOTTOM,
        startColor: '#ffd7ff',
        endColor: '#ffd7ff',
        left: 100,
        top: 200,
        textAlign: 'center',
        verticalAlign: 'middle',
        text: '事件',
      });
      dataStore = new DataStore({
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
        direction: DIRECTION.BOTTOM,
        startColor: '#fff',
        endColor: '#fff',
        left: 300,
        top: 200,
        textAlign: 'center',
        verticalAlign: 'middle',
        text: '信息系统',
      });
      processInterface = new ProcessInterface({
        isEditingText: false,
        gradient: false,
        scalePercent: 1,
        thumbnail: false,
        readonly: false,
        hasText: true,
        minimal: false,
        width: 100,
        height: 60,
        fill: '#fff',
        stroke: '#000',
        left: 500,
        top: 200,
        textAlign: 'center',
        verticalAlign: 'middle',
        text: '接口',
      });
      kcp = new KeyCompliancePoint({
        isEditingText: false,
        gradient: false,
        scalePercent: 1,
        thumbnail: false,
        readonly: false,
        hasText: true,
        minimal: false,
        width: 100,
        height: 60,
        stroke: '#ff1010',
        left: 700,
        top: 200,
        textAlign: 'center',
        verticalAlign: 'middle',
        text: 'KCP',
      });
      _document = new Document({
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
        left: 900,
        top: 200,
        textAlign: 'center',
        verticalAlign: 'middle',
      });
      end = new END({
        isEditingText: false,
        gradient: false,
        scalePercent: 1,
        thumbnail: false,
        readonly: false,
        hasText: true,
        minimal: false,
        width: 60,
        height: 60,
        x: 0,
        y: 0,
        fill: '#ccff66',
        stroke: '#000',
        text: 'End',
        left: 1100,
        top: 200,
        textAlign: 'center',
        verticalAlign: 'middle',
      });
      backOut = new BackOut({
        isEditingText: false,
        gradient: false,
        scalePercent: 1,
        thumbnail: false,
        readonly: false,
        hasText: true,
        minimal: false,
        width: 50,
        height: 60,
        fill: '#9aff9a',
        stroke: '#000',
        left: 1250,
        top: 200,
        textAlign: 'center',
        verticalAlign: 'middle',
      });

      canvas.add(activity);
      canvas.add(role);
      canvas.add(virtualRole);
      canvas.add(from);
      canvas.add(decision);
      canvas.add(customer);
      canvas.add(backIn);
      canvas.add(event);
      canvas.add(dataStore);
      canvas.add(processInterface);
      canvas.add(kcp);
      canvas.add(_document);
      canvas.add(end);
      canvas.add(backOut);
      initMiniMap(canvas, miniMap);

      miniMap.renderAll();
      canvas.renderAll();
    }
  }, []);

  return (
    <>
      <StyledCanvas ref={canvasEl} id={'canvas'} />
      <StyledMiniMap ref={miniMapEl} id={'miniMap'} />
    </>
  );
}

Demo9.propTypes = {};

export default Demo9;
