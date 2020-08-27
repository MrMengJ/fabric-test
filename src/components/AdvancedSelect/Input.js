import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { InputGroup } from '@blueprintjs/core';
import { noop } from 'lodash';

function Input(props) {
  const { className, onEnter, onInput, onChange, ...otherProps } = props;
  const [isComposing, setIsComposing] = useState(false);

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = event => {
    if (isComposing) {
      setIsComposing(false);
      handleInput(event, !isComposing);
    }
  };

  const handleInput = (event, isOnComposition = isComposing) => {
    // should not trigger input during composition
    if (isOnComposition) {
      return;
    }
    onInput(event.target.value, event);
  };

  return (
    <InputGroup
      {...otherProps}
      className={className}
      onInput={handleInput}
      onChange={onChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  );
}

Input.propTypes = {
  className: PropTypes.string,
  value: PropTypes.string,
  onEnter: PropTypes.func,
  onInput: PropTypes.func,
  onChange: PropTypes.func
};

Input.defaultProps = {
  className: '',
  onEnter: noop,
  onInput: noop,
  onChange: noop
};

export default Input;
