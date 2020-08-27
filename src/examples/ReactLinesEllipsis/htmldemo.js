import React, { Component } from 'react';
import HTMLEllipsis from '../../components/ReactLinesEllipsis/html';
import styled from 'styled-components';
import { Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import ReactDOMServer from 'react-dom/server';

const Wrapper = styled.div`
  width: 40px;
  height: 300px;
`;

const IconWrapper = styled.div`
  width: 40px;
`;

const html = () => {
  return (
    <>
      <IconWrapper>
        <Icon icon={IconNames.HELP} />
        <Icon icon={IconNames.HELP} />
      </IconWrapper>
      <IconWrapper>
        <Icon icon={IconNames.HELP} />
        <Icon icon={IconNames.HELP} />
      </IconWrapper>
      <IconWrapper>
        <Icon icon={IconNames.HELP} />
        <Icon icon={IconNames.HELP} />
      </IconWrapper>
      <IconWrapper>
        <Icon icon={IconNames.HELP} />
        <Icon icon={IconNames.HELP} />
      </IconWrapper>
      <IconWrapper>
        <Icon icon={IconNames.HELP} />
        <Icon icon={IconNames.HELP} />
      </IconWrapper>
      <IconWrapper>
        <Icon icon={IconNames.HELP} />
        <Icon icon={IconNames.HELP} />
      </IconWrapper>
      <IconWrapper>
        <Icon icon={IconNames.HELP} />
        <Icon icon={IconNames.HELP} />
      </IconWrapper>
    </>
  );
};

class ReactLineEllipsis extends Component {
  state = {
    maxLine: 2,
  };

  handleReflow = (rleState) => {
    // const { clamped, text } = rleState;
    console.log('rleState', rleState);
  };

  handleClick = () => {
    this.setState({ maxLine: 100 });
  };

  render() {
    const a = ReactDOMServer.renderToString(html());

    return (
      <Wrapper>
        <HTMLEllipsis
          unsafeHTML={a}
          maxLine={this.state.maxLine}
          ellipsis="..."
          onReflow={this.handleReflow}
          onClick={this.handleClick}
        />
      </Wrapper>
    );
  }
}

export default ReactLineEllipsis;
