import _, { isNil, isNull, isString } from 'lodash';

export const on = (element, event, handler, options) => {
  if (document.addEventListener) {
    if (element && event && handler) {
      element.addEventListener(event, handler, options);
    }
  } else {
    if (element && event && handler) {
      element.attachEvent('on' + event, handler);
    }
  }
};

export const off = (element, event, handler, options) => {
  if (document.removeEventListener) {
    if (element && event && handler) {
      element.removeEventListener(event, handler, options);
    }
  } else {
    if (element && event && handler) {
      element.detachEvent('on' + event, handler);
    }
  }
};

export const getElementOffsetInAnother = (element, another) => {
  const el = isString(element) ? document.getElementById(element) : element;
  const anotherEl = isString(another)
    ? document.getElementById(another)
    : another;
  if (
    isNull(el) ||
    isNull(anotherEl) ||
    el.style.display === 'none' ||
    anotherEl.style.display === 'none'
  ) {
    return null;
  }
  return {
    top: el.offsetTop - el.parentElement.offsetTop,
    left: el.offsetLeft - el.parentElement.offsetLeft
  };
};

export const scrollScrollbar = (element, distance) => {
  const el = isString(element) ? document.getElementById(element) : element;
  if (el) {
    el.scrollTop += distance;
  }
};

export const scrollScrollbarToTop = element => {
  const el = isString(element) ? document.getElementById(element) : element;
  if (el) {
    el.scrollTop = 0;
  }
};

export const scrollScrollbarToBottom = element => {
  const el = isString(element) ? document.getElementById(element) : element;
  if (el) {
    el.scrollTop = 9999;
  }
};

export const isTextInput = e => {
  const elem = e.target;
  // we check these cases for unit testing, but this should not happen
  // during normal operation
  if (elem == null || elem.closest == null) {
    return false;
  }

  const editable = elem.closest('input, textarea, [contenteditable=true]');

  if (editable == null) {
    return false;
  }

  // don't let checkboxes, switches, and radio buttons prevent hotkey behavior
  if (editable.tagName.toLowerCase() === 'input') {
    const inputType = editable.type;
    if (inputType === 'checkbox' || inputType === 'radio') {
      return false;
    }
  }

  // don't let read-only fields prevent hotkey behavior
  return !editable.readOnly;
};

export const isEvent = e =>
  !isNil(e) && e.nativeEvent && e.nativeEvent instanceof Event;

let cached;
export const getScrollBarSize = () => {
  if (_.isUndefined(cached)) {
    const inner = document.createElement('div');
    inner.style.width = '100%';
    inner.style.height = '200px';

    const outer = document.createElement('div');
    const outerStyle = outer.style;

    outerStyle.position = 'absolute';
    outerStyle.top = 0;
    outerStyle.left = 0;
    outerStyle.pointerEvents = 'none';
    outerStyle.visibility = 'hidden';
    outerStyle.width = '200px';
    outerStyle.height = '150px';
    outerStyle.overflow = 'hidden';

    outer.appendChild(inner);

    document.body.appendChild(outer);

    const widthContained = inner.offsetWidth;
    outer.style.overflow = 'scroll';
    let widthScroll = inner.offsetWidth;
    if (widthContained === widthScroll) {
      widthScroll = outer.clientWidth;
    }
    document.body.removeChild(outer);
    cached = widthContained - widthScroll;
  }
  return cached;
};
