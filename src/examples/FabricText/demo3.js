import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import styled from 'styled-components';

import Canvas from '../../objects/Canvas';
import Group from '../../objects/Group';

const StyledCanvas = styled.canvas`
  width: 1000px;
  height: 600px;
  border: 1px solid red;
`;

let canvas;

const fabricDblClick = (obj, handler) => {
  return function (options) {
    if (obj.clicked) handler(options);
    else {
      obj.clicked = true;
      setTimeout(function () {
        obj.clicked = false;
      }, 500);
    }
  };
};

function Demo3() {
  const canvasEl = useRef(null);

  let groupItems = [];
  const ungroup = function (group) {
    groupItems = group._objects;
    group._restoreObjectsState();
    canvas.remove(group);
    for (var i = 0; i < groupItems.length; i++) {
      canvas.add(groupItems[i]);
    }
    // if you have disabled render on addition
    canvas.renderAll();
  };

  useEffect(() => {
    if (canvasEl.current) {
      const canvasOptions = {
        backgroundColor: '#f3f3f3',
        width: 1000,
        height: 700,
      };

      window.canvas = new Canvas(canvasEl.current, canvasOptions);
      canvas = window.canvas;

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
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        hasControls: false,
        hasBorders: false,
      });

      textBox.on('editing:exited', function () {
        groupItems.forEach(function (obj) {
          canvas.remove(obj);
        });
        let grp = new Group(groupItems);
        grp.on(
          'mousedown',
          fabricDblClick(grp, function () {
            ungroup(grp);
            canvas.setActiveObject(textBox);
            textBox.enterEditing();
            textBox.selectAll();
          })
        );
        canvas.add(grp);
        canvas.renderAll();
      });

      const group = new Group([rect, textBox], {
        top: 150,
        left: 200,
      });

      group.on(
        'mousedown',
        fabricDblClick(textBox, function () {
          ungroup(group);
          canvas.setActiveObject(textBox);
          textBox.enterEditing();
          textBox.selectAll();
        })
      );

      canvas.add(group);

      const rect1 = new fabric.Rect({
        width: 200,
        height: 200,
        fill: '#4caaee',
      });

      const textBox1 = new fabric.Textbox('Test text2', {
        width: 200,
        height: 200,
        backgroundColor: 'red',
        fontSize: 40,
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        hasControls: false,
        hasBorders: false,
      });

      textBox1.on('editing:exited', function () {
        groupItems.forEach(function (obj) {
          canvas.remove(obj);
        });
        let grp = new Group(groupItems);
        grp.on(
          'mousedown',
          fabricDblClick(grp, function () {
            ungroup(grp);
            canvas.setActiveObject(textBox1);
            textBox1.enterEditing();
            textBox1.selectAll();
          })
        );
        canvas.add(grp);
        canvas.renderAll();
      });

      const group1 = new Group([rect1, textBox1], {
        top: 150,
        left: 600,
      });

      group1.on(
        'mousedown',
        fabricDblClick(textBox1, function () {
          ungroup(group1);
          canvas.setActiveObject(textBox1);
          textBox1.enterEditing();
          textBox1.selectAll();
        })
      );

      canvas.add(group1);

      canvas.renderAll();
    }
  }, []);

  return <StyledCanvas ref={canvasEl} id={'canvas'} />;
}

Demo3.propTypes = {};

export default Demo3;
