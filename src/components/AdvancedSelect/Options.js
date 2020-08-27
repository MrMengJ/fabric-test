import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { includes, isEmpty, map, findIndex, cloneDeep, noop } from 'lodash';
import styled from 'styled-components';

import Option from './Option';

const List = styled.ul`
  padding: 0;
  margin: 0;
  min-width: 100%;
  max-height: 240px;
  overflow-y: auto;
  list-style: none;
  cursor: pointer;
`;

const EmptyOption = styled(Option)`
  color: ${props => props.theme.GRAY3};
  &:hover {
    background-color: inherit;
  }
`;

function Options(props) {
  const {
    noDataText,
    options,
    style,
    value,
    multiple,
    minTagCount,
    containerRef,
    inputValue,
    onChange
  } = props;
  const [dropDownWidth, setDropDownWidth] = useState(0);

  useEffect(
    () => {
      if (containerRef && containerRef.current) {
        const width = containerRef.current.getBoundingClientRect().width;
        if (width !== dropDownWidth) {
          setDropDownWidth(containerRef.current.getBoundingClientRect().width);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [containerRef, value, inputValue]
  );

  const handleSelect = (val, event) => {
    if (multiple) {
      // avoid drop down panel close
      event.stopPropagation();
    }
    const newValue = multiple ? [...value, val] : [val];
    onChange(newValue, event);
  };

  const handleCancelSelect = (val, event) => {
    if (!multiple) {
      return;
    }

    // avoid drop down panel close
    event.stopPropagation();

    if (value.length <= minTagCount) {
      return;
    }
    const index = findIndex(value, item => item === val);
    if (index >= 0) {
      const newValue = cloneDeep(value);
      newValue.splice(index, 1);
      onChange(newValue, event);
    }
  };

  if (isEmpty(options)) {
    return (
      <List style={{ style, width: dropDownWidth }}>
        <EmptyOption value={noDataText} />
      </List>
    );
  }
  return (
    <List style={{ ...style, width: dropDownWidth }}>
      {map(options, (element, index) => {
        const isSelected = includes(value, element.props.value);
        return React.cloneElement(element, {
          key: index,
          isSelected,
          multiple,
          onSelect: handleSelect,
          onCancelSelect: handleCancelSelect
        });
      })}
    </List>
  );
}

Options.propTypes = {
  noDataText: PropTypes.string.isRequired,
  containerRef: PropTypes.object.isRequired,
  options: PropTypes.arrayOf(PropTypes.element),
  style: PropTypes.object,
  value: PropTypes.array,
  multiple: PropTypes.bool,
  onChange: PropTypes.func,
  minTagCount: PropTypes.number,
  inputValue: PropTypes.string
};

Options.defaultProps = {
  style: {},
  value: [],
  multiple: false,
  onChange: noop,
  minTagCount: 0,
  inputValue: ''
};

export default Options;
