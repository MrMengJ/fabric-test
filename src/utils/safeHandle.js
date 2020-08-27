import { isFunction } from 'lodash';

export const safeInvoke = (func, ...args) => {
  if (isFunction(func)) {
    return func(...args);
  }
  return undefined;
};
