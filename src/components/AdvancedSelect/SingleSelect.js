import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { InputGroup } from '@blueprintjs/core';
import styled from 'styled-components';
import { find, head, isEmpty, map, noop } from 'lodash';

import { getOptions } from './helper';

const StyledInputGroup = styled(InputGroup)`
  input {
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

function SingleSelect(props) {
  const {
    filterOption,
    disabled,
    rightElement,
    options,
    onFocus,
    onBlur,
    onChange
  } = props;
  const [isFocus, setIsFocus] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const optionProps = map(getOptions(options), item => item.props);

  const handleFocus = event => {
    setIsFocus(true);
    onFocus(event);
  };

  const handleBlur = event => {
    setIsFocus(false);
    setInputValue('');
    onBlur(event);
  };

  const handleChange = event => {
    const inputValue = event.target.value;
    setInputValue(inputValue);
    onChange(inputValue);
  };

  const getPlaceholder = (isFocus, { value, placeholder } = props) => {
    if (isFocus) {
      const result = find(optionProps, item => {
        return item.value === head(value);
      });
      return result ? (result.label ? result.label : result.value) : '';
    }
    return placeholder;
  };

  const getValue = (isFocus, inputValue, { value } = props) => {
    if (isFocus) {
      return inputValue;
    }

    if (isEmpty(value) || !value) {
      return '';
    }
    const result = find(optionProps, item => {
      return item.value === head(value);
    });
    return result ? (result.label ? result.label : result.value) : '';
  };

  return (
    <StyledInputGroup
      readOnly={!filterOption}
      placeholder={getPlaceholder(isFocus)}
      disabled={disabled}
      value={getValue(isFocus, inputValue)}
      rightElement={rightElement}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
    />
  );
}

SingleSelect.propTypes = {
  value: PropTypes.array,
  filterOption: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  disabled: PropTypes.bool,
  rightElement: PropTypes.element,
  options: PropTypes.arrayOf(PropTypes.element),
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  onChange: PropTypes.func
};

SingleSelect.defaultProps = {
  value: [],
  filterOption: false,
  disabled: false,
  onFocus: noop,
  onBlur: noop,
  onChange: noop
};

export default SingleSelect;
