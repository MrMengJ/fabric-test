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
  TOUCHEND: 'touchend',
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
  X: 88,
  C: 67,
  V: 86,
  Y: 89,
  A: 65,
  BACKSPACE: 8,
  DELETE: 46,
};

export const TRANSACTION_TYPE = {
  ADD: 'ADD',
  REMOVE: 'REMOVE',
  MOVED: 'MOVED',
  SCALED: 'SCALED',
  ROTATED: 'ROTATED',
  SKEWED: 'SKEWED',
  GROUP: 'GROUP',
  UNGROUP: 'UNGROUP',
  PASTE: 'PASTE',
  BRING_FORWARD: 'BRING_FORWARD',
  BRING_TO_FRONT: 'BRING_TO_FRONT',
  SEND_BACKWARDS: 'SEND_BACKWARDS',
  SEND_TO_BACK: 'SEND_TO_BACK',
  REDO: 'REDO',
  UNDO: 'UNDO',
};

export const propertiesToInclude = [
  'id',
  'type',
  'startColor',
  'endColor',
  'direction',
  'gradient',
  'textAlign',
  'verticalAlign',
  'width',
  'height',
];

export const isLeftMouseClick = (event) => {
  return event.button === 0;
};

export const isRightMouseClick = (event) => {
  // in mac os, ctrl + left click will also trigger contextMenu event
  return event.button === 2 || (event.ctrlKey && event.button === 1);
};
