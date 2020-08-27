import { useEffect, useRef } from 'react';
import { isEqual } from 'lodash';

function useDeepCompareMemoize(value) {
  const ref = useRef();

  if (!isEqual(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
}

function useDeepCompareEffect(effect, deps) {
  useEffect(effect, useDeepCompareMemoize(deps));
}

export default useDeepCompareEffect;
