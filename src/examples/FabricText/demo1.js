import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import styled from 'styled-components';

import ECanvas from '../../objects/ECanvas';
import EGroup from '../../objects/EGroup';
import EText from '../../objects/EText';

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

function Demo1() {
  const canvasEl = useRef(null);

  let groupItems = [];
  const ungroup = function (group) {
    groupItems = group.getObjects();
    group.destroy();
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

      window.canvas = new ECanvas(canvasEl.current, canvasOptions);
      canvas = window.canvas;

      const rect = new fabric.Rect({
        width: 200,
        height: 200,
        fill: '#34eeeb',
        selectable: false,
      });

      const textBox = new EText(
        'dsafe 圣达菲的三分框架打飞机饿了达力芬额苏打绿飞机了dsafe了',
        {
          width: 200,
          splitByGrapheme: true,
          backgroundColor: 'red',
          fontSize: 40,
          lockMovementX: true,
          lockMovementY: true,
          lockScalingX: true,
          lockScalingY: true,
          hasControls: false,
          hasBorders: false,
        }
      );

      textBox.on('editing:exited', function () {
        groupItems.forEach(function (obj) {
          canvas.remove(obj);
        });
        let grp = new EGroup(groupItems);
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

      const group = new EGroup([rect, textBox], {
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

      canvas.renderAll();
    }
  }, []);

  return <StyledCanvas ref={canvasEl} id={'canvas'} />;
}

Demo1.propTypes = {};

export default Demo1;
