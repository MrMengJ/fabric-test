import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { noop } from 'lodash';

import { on, off } from '../../utils/dom';

const IconWrapper = styled.div`
  padding: 6px;
  cursor: pointer;
`;

const DropDownIcon = styled.div`
  transform: ${props => (props.isOpenOptions ? `rotate(180deg)` : 'none')};
  transition: transform 0.3s;
`;

function RightElement(props) {
  const { containerRef, isOpenOptions, clearable, onClearAll } = props;
  const [isMouseHover, setIsMouseHover] = useState(false);
  useEffect(
    () => {
      if (containerRef && containerRef.current) {
        const mouseEnterHandler = () => {
          if (!isOpenOptions && clearable) {
            setIsMouseHover(true);
          }
        };

        const mouseLeaveHandler = () => {
          if (!isOpenOptions && clearable) {
            setIsMouseHover(false);
          }
        };

        const containerElement = containerRef.current;
        on(containerElement, 'mouseenter', mouseEnterHandler);
        on(containerElement, 'mouseleave', mouseLeaveHandler);
        return () => {
          off(containerElement, 'mouseenter', mouseEnterHandler);
          off(containerElement, 'mouseleave', mouseLeaveHandler);
        };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [containerRef]
  );

  return (
    <IconWrapper>
      {isMouseHover ? (
        <Icon icon={IconNames.SMALL_CROSS} onClick={onClearAll} />
      ) : (
        <DropDownIcon isOpenOptions={isOpenOptions}>
          <Icon icon={IconNames.CHEVRON_DOWN} />
        </DropDownIcon>
      )}
    </IconWrapper>
  );
}

RightElement.propTypes = {
  isOpenOptions: PropTypes.bool.isRequired,
  clearable: PropTypes.bool,
  containerRef: PropTypes.object,
  onClearAll: PropTypes.func
};

RightElement.defaultProps = {
  clearable: false,
  onClearAll: noop
};

export default RightElement;
