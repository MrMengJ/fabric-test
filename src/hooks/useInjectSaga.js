import { useContext, useEffect } from 'react';
import { ReactReduxContext } from 'react-redux';

import getInjectors from '../utils/sagaInjectors';

function useInjectSaga({ key, saga, mode }) {
  const context = useContext(ReactReduxContext);
  useEffect(() => {
    const injectors = getInjectors(context.store);
    injectors.injectSaga(key, { saga, mode });
    return () => {
      injectors.ejectSaga(key);
    };
    // eslint-disable-next-line
  }, []);
}

export default useInjectSaga;
