import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { noop } from 'lodash';
import { Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';

const Li = styled.li`
  position: relative;
  margin: 0;
  padding: 7px 16px;
  clear: both;
  white-space: nowrap;
  text-overflow: ellipsis;
  transition: background 0.3s ease-in-out;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'inherit')};
  color: ${props => {
    if (props.disabled) {
      return props.theme.GRAY5;
    }
    return props.isSelected ? props.theme.BLUE3 : 'inherit';
  }};
  &:hover {
    background-color: ${props =>
      props.disabled ? 'transparent' : props.theme.LIGHT_GRAY3}
`;

const Label = styled.span`
  display: inline-block;
  max-width: 100%;
  padding-right: 10px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  vertical-align: middle;
`;

const TickIcon = styled(Icon)`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: 6px;
`;

function Option(props) {
  const {
    className,
    children,
    value,
    label,
    multiple,
    isSelected,
    disabled,
    onSelect,
    onCancelSelect
  } = props;

  const handleClick = event => {
    if (disabled) {
      return;
    }
    if (isSelected) {
      onCancelSelect(value, event);
    } else {
      onSelect(value, event);
    }
  };

  return (
    <Li
      disabled={disabled}
      className={className}
      onClick={handleClick}
      isSelected={isSelected}
    >
      <Label>{children ? children : label ? label : value}</Label>
      {multiple && isSelected && <TickIcon icon={IconNames.TICK} />}
    </Li>
  );
}

Option.displayName = 'Option';

Option.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  label: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
  disabled: PropTypes.bool,
  isSelected: PropTypes.bool,
  multiple: PropTypes.bool,
  onSelect: PropTypes.func,
  onCancelSelect: PropTypes.func
};

Option.defaultProps = {
  disabled: false,
  isSelected: false,
  multiple: false,
  className: '',
  onSelect: noop,
  onCancelSelect: noop
};

export default Option;
