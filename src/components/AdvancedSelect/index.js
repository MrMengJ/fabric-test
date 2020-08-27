import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Popover, Position } from '@blueprintjs/core';
import { isEmpty, findIndex, noop, map, find, cloneDeep } from 'lodash';

import useOnClickOutside from '../../hooks/useOnClickOutside';
import { getRGBA } from '../../utils/style';
import { KEY_CODES } from '../../constants/event';
import { on, off } from '../../utils/dom';

import RightElement from './RightElement';
import Options from './Options';
import MultipleSelect from './MultipleSelect';
import SingleSelect from './SingleSelect';
import { delayHandler, getOptions } from './helper';

const Wrapper = styled.div`
  display: inline-block;
  & input {
    cursor: pointer;
  }
  &:hover {
    input {
      box-shadow: ${props =>
        props.disabled
          ? 'none'
          : `0 0 0 1px ${props => props.theme.BLUE3},
        0 0 0 3px ${props => getRGBA(props.theme.BLUE3, 0.3)},
        inset 0 1px 1px ${props => getRGBA(props.theme.BLACK, 0.2)}`};
    }
  }
`;

function AdvancedSelect(props) {
  const {
    defaultValue,
    noDataText,
    noMatchText,
    disabled,
    className,
    placeholder,
    multiple,
    clearable,
    filterOption,
    minTagCount,
    children,
    onChange,
    onChangeEnd
  } = props;
  const [value, setValue] = useState(props.value ? props.value : defaultValue);
  const [isOpenOptions, setIsOpenOptions] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const containerRef = useRef(null);

  useOnClickOutside([containerRef], () => {
    setIsOpenOptions(false);
  });

  useEffect(() => {
    if (props.value) {
      setValue(props.value);
    }
  }, [props.value]);

  useEffect(() => {
    const handler = event => {
      if (event.keyCode === KEY_CODES.ESCAPE && isOpenOptions) {
        setIsOpenOptions(false);
      }
    };

    on(document, 'keydown', handler);
    return () => {
      off(document, 'keydown', handler);
    };
  }, [isOpenOptions]);

  const getMultipleSelectValue = value => {
    if (isEmpty(value) || !value) {
      return [];
    }
    const optionProps = map(getOptions(children), item => item.props);
    return map(value, item => {
      return find(optionProps, optionProp => {
        return optionProp.value === item;
      });
    });
  };

  const getOptionsValue = value => {
    if (!value) {
      return [];
    }
    return value;
  };

  const handleClick = () => {
    if (disabled) {
      return;
    }
    setIsOpenOptions(!isOpenOptions);
  };

  const handleChange = newValue => {
    setValue(newValue);
    onChange(newValue);
    delayHandler(() => onChangeEnd(newValue), 1000);
  };

  const handleClearAll = () => {
    if (multiple) {
      handleChange(value.slice(0, minTagCount));
    } else {
      handleChange([]);
    }
  };

  const handleRemove = (val, event) => {
    // avoid drop down panel close
    event.stopPropagation();

    if (value.length <= minTagCount) {
      return;
    }

    const index = findIndex(value, item => item === val);
    if (index >= 0) {
      const newValue = cloneDeep(value);
      newValue.splice(index, 1);
      handleChange(newValue);
    }
  };

  const handleSingleSelectBlur = () => {
    setInputValue('');
  };

  const handleSingleSelectChange = value => {
    if (!isOpenOptions) {
      setIsOpenOptions(true);
    }
    setInputValue(value);
  };

  const handleMultipleSelectChange = value => {
    if (!isOpenOptions) {
      setIsOpenOptions(true);
    }
    setInputValue(value);
  };

  return (
    <Wrapper
      className={className}
      disabled={disabled}
      ref={containerRef}
      onClick={handleClick}
    >
      <Popover
        usePortal={true}
        position={Position.BOTTOM}
        isOpen={isOpenOptions}
        modifiers={{
          arrow: {
            enabled: false
          },
          computeStyle: {
            gpuAcceleration: false // fix problem that position is incorrect in ie 11
          }
        }}
        content={
          <Options
            value={getOptionsValue(value)}
            inputValue={inputValue}
            containerRef={containerRef}
            options={getOptions(children, filterOption, inputValue)}
            noDataText={inputValue ? noMatchText : noDataText}
            multiple={multiple}
            minTagCount={minTagCount}
            onChange={handleChange}
          />
        }
      >
        <>
          {!multiple && (
            <SingleSelect
              filterOption={filterOption}
              placeholder={placeholder}
              disabled={disabled}
              value={value}
              options={children}
              onBlur={handleSingleSelectBlur}
              onChange={handleSingleSelectChange}
              rightElement={
                <RightElement
                  isOpenOptions={isOpenOptions}
                  clearable={clearable}
                  containerRef={containerRef}
                  onClearAll={handleClearAll}
                />
              }
            />
          )}
          {multiple && (
            <MultipleSelect
              filterOption={filterOption}
              disabled={disabled}
              value={getMultipleSelectValue(value)}
              placeholder={placeholder}
              onRemove={handleRemove}
              onChange={handleMultipleSelectChange}
              rightElement={
                <RightElement
                  isOpenOptions={isOpenOptions}
                  clearable={clearable}
                  containerRef={containerRef}
                  onClearAll={handleClearAll}
                />
              }
            />
          )}
        </>
      </Popover>
    </Wrapper>
  );
}

AdvancedSelect.propTypes = {
  className: PropTypes.string,
  value: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string])),
  defaultValue: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.number, PropTypes.string])
  ),
  filterOption: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  disabled: PropTypes.bool,
  allowClear: PropTypes.bool,
  multiple: PropTypes.bool,
  clearable: PropTypes.bool,
  placeholder: PropTypes.string,
  noDataText: PropTypes.string,
  noMatchText: PropTypes.string,
  minTagCount: PropTypes.number,
  onChange: PropTypes.func,
  onChangeEnd: PropTypes.func
};

AdvancedSelect.defaultProps = {
  className: '',
  values: [],
  filterOption: false,
  disabled: false,
  allowClear: false,
  multiple: false,
  clearable: false,
  placeholder: '请选择',
  noDataText: '无数据',
  noMatchText: '无匹配数据',
  minTagCount: 0,
  onChange: noop,
  onChangeEnd: noop
};

export default AdvancedSelect;
