import React, { Component } from 'react';
import { MenuItem } from '@blueprintjs/core';

import { MENU_ITEM_NAME } from './constants';

class CommonMenuItem extends Component {
  render() {
    return (
      <>
        <MenuItem
          text="剪切"
          name={MENU_ITEM_NAME.CUT_SHAPES}
          onClick={() => console.log('EVENTS.CUT')}
        />
        <MenuItem
          text="复制"
          name={MENU_ITEM_NAME.COPY_SHAPES}
          onClick={() => console.log('EVENTS.COPY')}
        />
        <MenuItem
          text="粘贴"
          name={MENU_ITEM_NAME.PASTE_SHAPES}
          onClick={() => console.log('EVENTS.PASTE_CLIPBOARD')}
        />
        <MenuItem
          text="删除"
          name={MENU_ITEM_NAME.DELETE_SHAPES}
          onClick={() => console.log('delete')}
        />
        <MenuItem
          text="添加为模型"
          name={MENU_ITEM_NAME.ADD_PERSONAL_SHAPE}
          onClick={() => console.log('ADD_PERSONAL_SHAPE')}
        />
      </>
    );
  }
}

export default CommonMenuItem;
