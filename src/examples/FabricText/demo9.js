import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { max } from 'lodash';

import Canvas from '../../objects/Canvas';
import { DIRECTION } from '../../constants/shapes';
import {Activity} from "../../shapes/Activity";
import {Role} from "../../shapes/Role";
import {VirtualRole} from "../../shapes/VirtualRole";
import {From} from "../../shapes/From";

const StyledCanvas = styled.canvas`
  border: 1px solid red;
`;

let canvas;
let activity;
let role;
let virtualRole;
let from;

function Demo9() {
    const canvasEl = useRef(null);

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

            activity = new Activity({
                isEditingText: false,
                scalePercent: 1,
                thumbnail: false,
                readonly: false,
                hasText: true,
                minimal: false,
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
                top: 100
            });
            role = new Role({
                isEditingText: false,
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
                top: 50,
                textAlign: 'center',
                verticalAlign: 'middle',
                text: '角色',
            });

            virtualRole = new VirtualRole({
                isEditingText: false,
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
                left: 420,
                top: 50,
                textAlign: 'center',
                verticalAlign: 'middle',
                text: '虚拟角色'
            });

            from = new From({
                isEditingText: false,
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
                left: 420,
                top: 50,
                textAlign: 'center',
                verticalAlign: 'middle',
                text: 'From'
            });

            canvas.add(activity);
            canvas.add(role);
            canvas.add(virtualRole);
            canvas.add(from);
            canvas.renderAll();
        }
    }, []);

    const handleZoomOut = () => {
        const zoom = canvas.getZoom();
        canvas.setZoom(zoom + 1);
    };

    const handleZoomIn = () => {
        const zoom = canvas.getZoom();
        canvas.setZoom(max([1, zoom - 1]));
    };

    return (
        <>
            <StyledCanvas ref={canvasEl} id={'canvas'} />
            <button onClick={handleZoomOut}>+1 zoom</button>
            <button onClick={handleZoomIn}>-1 zoom</button>
        </>
    );
}

Demo9.propTypes = {};

export default Demo9;
