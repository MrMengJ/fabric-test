import { useContext, useEffect } from 'react';
import { ReactReduxContext } from 'react-redux';

import getInjectors from '../utils/reducerInjectors';

function useInjectReducer({ key, reducer }) {
  const context = useContext(ReactReduxContext);
  useEffect(() => {
    const injectors = getInjectors(context.store);
    injectors.injectReducer(key, reducer);
    // eslint-disable-next-line
  }, []);
}

export default useInjectReducer;
