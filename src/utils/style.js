import _ from 'lodash';

const SPECIAL_CHARS_REGEXP = /([:\-_]+(.))/g;
const MOZ_HACK_REGEXP = /^moz([A-Z])/;

const camelCase = name => {
  return name
    .replace(SPECIAL_CHARS_REGEXP, (_, separator, letter, offset) =>
      offset ? letter.toUpperCase() : letter
    )
    .replace(MOZ_HACK_REGEXP, 'Moz$1');
};

// getStyle
export const getStyle = (element, styleName) => {
  if (!element || !styleName) return null;
  styleName = camelCase(styleName);
  if (styleName === 'float') {
    styleName = 'cssFloat';
  }
  try {
    const computed = document.defaultView.getComputedStyle(element, '');
    return element.style[styleName] || computed ? computed[styleName] : null;
  } catch (e) {
    return element.style[styleName];
  }
};

export const getRGBA = (color, alpha = 1) => {
  const rgb = _.chain(color)
    .tail()
    .chunk((color.length - 1) / 3)
    .map(channel =>
      _.chain(channel)
        .concat(channel.length === 1 ? channel[0] : '')
        .join('')
        .parseInt(16)
        .value()
    )
    .value();
  return `rgba(${rgb},${alpha})`;
};
