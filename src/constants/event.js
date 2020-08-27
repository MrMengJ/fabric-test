export const EVENT = {
  CLICK: 'click',
  MOUSE_UP: 'mouseup',
  MOUSE_DOWN: 'mousedown',
  MOUSE_MOVE: 'mousemove',
  CONTEXT_MENU: 'contextmenu',
  KEY_DOWN: 'keydown',
  KEY_UP: 'keyup',
  WHEEL: 'wheel',
  RESIZE: 'resize',
  SCROLL: 'scroll',
  TOUCHEND: 'touchend'
};

export const KEY_CODES = {
  ESCAPE: 27,
  SPACE: 32,
  ENTER: 13,
  FORWARD_SLASH: 191,
  ARROW_LEFT: 37,
  ARROW_UP: 38,
  ARROW_RIGHT: 39,
  ARROW_DOWN: 40,
  Z: 90,
  S: 83,
  BACKSPACE: 8,
  DELETE: 46
};

export const isLeftMouseClick = event => {
  return event.button === 0;
};

export const isRightMouseClick = event => {
  // in mac os, ctrl + left click will also trigger contextMenu event
  return event.button === 2 || (event.ctrlKey && event.button === 1);
};
