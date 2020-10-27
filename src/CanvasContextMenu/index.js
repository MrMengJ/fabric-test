import React from 'react';
import { ContextMenu, Menu } from '@blueprintjs/core';
import styled from 'styled-components';
import CommonMenuItem from './CommonMenuItem';

const StyledMenu = styled(Menu)`
  min-width: 136px;
`;

export function canvasContextMenu(event, activeObj,onClick, hasClipboard) {
  const { pointer } = event;
  const menu = (
    <StyledMenu>
      <CommonMenuItem
          activeObj={activeObj}
          onClick={onClick}
          clipboard={hasClipboard}
      />
    </StyledMenu>
  );
  ContextMenu.hide();
  ContextMenu.show(menu, { left: pointer.x, top: pointer.y });

  return <></>;
}
