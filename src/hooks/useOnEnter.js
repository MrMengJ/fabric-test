import { useEffect } from 'react';
import { findDOMNode } from 'react-dom';

import { on, off } from '../utils/dom';

/**
 * Attach keyboard "enter" event
 *
 * @param {Object} refOrNode: ref or dom node
 * @param {function} handler: event handler
 */
export function useOnEnter(refOrNode, handler) {
  useEffect(() => {
    const listener = event => {
      if (event.key === 'Enter') {
        handler(event);
      }
    };
    const isDomElement = value => value instanceof Element;

    if (isDomElement(refOrNode)) {
      on(refOrNode, 'keyup', listener);
      return () => {
        off(refOrNode, 'keyup', listener);
      };
    }

    if (!refOrNode.current) {
      return;
    }
    const domElement = isDomElement(refOrNode.current)
      ? refOrNode.current
      : findDOMNode(refOrNode.current);
    on(domElement, 'keyup', listener);
    return () => {
      off(domElement, 'keyup', listener);
    };
  }, [refOrNode, handler]);
}
