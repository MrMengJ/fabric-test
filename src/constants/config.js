export const API_ADDRESS =
  process.env.REACT_APP_API_ADDRESS || 'http://118.25.216.14:8088';

export const IsIE = () => {
  return window.ActiveXObject || 'ActiveXObject' in window;
};
