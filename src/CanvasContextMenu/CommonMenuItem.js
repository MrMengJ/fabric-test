import React, { Component } from 'react';
import { MenuItem } from '@blueprintjs/core';
import { isEmpty } from 'lodash';

import { MENU_ITEM_NAME } from './constants';

class CommonMenuItem extends Component {
  render() {
    const { activeObj, onClick, clipboard } = this.props;
    return (
      <>
        <MenuItem
          text="剪切"
          name={MENU_ITEM_NAME.CUT_SHAPES}
          onClick={() => onClick(MENU_ITEM_NAME.CUT_SHAPES)}
          disabled={isEmpty(activeObj)}
        />
        <MenuItem
          text="复制"
          name={MENU_ITEM_NAME.COPY_SHAPES}
          onClick={() => onClick(MENU_ITEM_NAME.COPY_SHAPES)}
          disabled={isEmpty(activeObj)}
        />
        <MenuItem
          text="粘贴"
          name={MENU_ITEM_NAME.PASTE_SHAPES}
          onClick={(e) => onClick(MENU_ITEM_NAME.PASTE_CLIPBOARD, e)}
          disabled={!clipboard}
        />
        <MenuItem
          text="删除"
          name={MENU_ITEM_NAME.DELETE_SHAPES}
          onClick={() => onClick(MENU_ITEM_NAME.DELETE_SHAPES)}
          disabled={isEmpty(activeObj)}
        />
        <MenuItem
          text="添加为模型"
          name={MENU_ITEM_NAME.ADD_PERSONAL_SHAPE}
          onClick={() => onClick(MENU_ITEM_NAME.ADD_PERSONAL_SHAPE)}
          disabled={isEmpty(activeObj)}
        />
      </>
    );
  }
}

export default CommonMenuItem;
