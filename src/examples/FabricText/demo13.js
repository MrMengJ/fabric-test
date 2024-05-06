import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { fabric } from 'fabric';

const StyledCanvas = styled.canvas`
  border: 1px solid red;
`;

let canvas;
var multiply = fabric.util.multiplyTransformMatrices;
var invert = fabric.util.invertTransform;
let boss, minion1, minion2;

function Demo13() {
  const canvasEl = useRef(null);

  useEffect(() => {
    if (canvasEl.current) {
      canvas = new fabric.Canvas(canvasEl.current, { selectionFullyContained: true });
      boss = new fabric.Rect({ width: 150, height: 200, fill: 'red' });
      minion1 = new fabric.Rect({ width: 40, height: 40, fill: 'blue' });
      minion2 = new fabric.Rect({ width: 40, height: 40, fill: 'blue' });

      canvas.add(boss, minion1, minion2);
      canvas.setZoom(2);
      canvas.renderAll();

      boss.on('moving', updateMinions);
      boss.on('rotating', updateMinions);
      boss.on('scaling', updateMinions);

      document.getElementById('bind').onclick = function () {
        var minions = canvas.getObjects().filter((o) => o !== boss);
        var bossTransform = boss.calcTransformMatrix();
        var invertedBossTransform = invert(bossTransform);
        console.log('bossTransform', bossTransform);
        console.log('invertedBossTransform', invertedBossTransform);
        minions.forEach((o) => {
          var desiredTransform = multiply(invertedBossTransform, o.calcTransformMatrix());
          console.log('desiredTransform', desiredTransform);
          // save the desired relation here.
          o.relationship = desiredTransform;
        });
      };
    }
  }, []);

  function updateMinions() {
    var minions = canvas.getObjects().filter((o) => o !== boss);
    minions.forEach((o) => {
      if (!o.relationship) {
        return;
      }
      var relationship = o.relationship;
      var newTransform = multiply(boss.calcTransformMatrix(), relationship);
      var opt = fabric.util.qrDecompose(newTransform);
      console.log('opt', opt);
      o.set({
        flipX: false,
        flipY: false,
      });
      o.setPositionByOrigin({ x: opt.translateX, y: opt.translateY }, 'center', 'center');
      o.set(opt);
      o.setCoords();
    });
  }

  return (
    <>
      <StyledCanvas ref={canvasEl} id={'canvas'} width={1500} height={700} />
      <button id={'bind'}>Bind MINION TO BOSS</button>
    </>
  );
}

Demo13.propTypes = {};

export default Demo13;
