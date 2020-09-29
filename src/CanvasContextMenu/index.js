import React from 'react';
import { ContextMenu, Menu } from '@blueprintjs/core';
import styled from 'styled-components';
import CommonMenuItem from './CommonMenuItem';

const StyledMenu = styled(Menu)`
  min-width: 136px;
`;

export function canvasContextMenu(event) {
  const { e, target, pointer } = event;
  console.log('event', event);
  console.log('target', target);
  const menu = (
    <StyledMenu>
      <CommonMenuItem />
    </StyledMenu>
  );
  ContextMenu.hide();
  ContextMenu.show(menu, { left: pointer.x, top: pointer.y });

  return <></>;
}
