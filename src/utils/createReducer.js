import { produce } from 'immer';

export default function createReducer(initialState, handlers) {
  return produce((state = initialState, action) => {
    if (handlers.hasOwnProperty(action.type)) {
      return handlers[action.type](state, action);
    }
    return state;
  });
}
