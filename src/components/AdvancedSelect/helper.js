import { isArray, isFunction, filter, includes, toUpper } from 'lodash';

import Option from './Option';

const isElementOfType = (element, ComponentType) => {
  return (
    element != null &&
    element.type != null &&
    element.type.displayName != null &&
    element.type.displayName === ComponentType.displayName
  );
};

const isOptionElement = child => {
  return isElementOfType(child, Option);
};

export const getOptions = (children, filterOption, inputValue) => {
  const result = isArray(children) ? children : [children];
  if (!filterOption || !inputValue) {
    return result.filter(isOptionElement);
  }
  if (isFunction(filterOption)) {
    return filter(result, item => {
      return isOptionElement(item) && filterOption(inputValue, item.props);
    });
  }
  return filter(result, item => {
    return (
      isOptionElement(item) && includes(toUpper(item.props.label), toUpper(inputValue))
    );
  });
};

let timer;
export const delayHandler = (handler, wait = 0) => {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(handler, wait);
};
