import React, { Component } from 'react';
import LinesEllipsis from '../../components/ReactLinesEllipsis';
import styled from 'styled-components';

const Wrapper = styled.div`
  width: 300px;
  height: 300px;
`;

const text =
  '测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text 测试text';

class ReactLineEllipsis extends Component {
  state = {
    maxLine: 4,
  };

  handleReflow = (rleState) => {
    // const { clamped, text } = rleState;
    console.log('rleState', rleState);
  };

  handleClick = ({ clamped }) => {
    if (clamped) {
      this.setState({ maxLine: 100 });
    }
  };

  render() {
    return (
      <Wrapper>
        <LinesEllipsis
          component={'article'}
          text={text}
          maxLine={this.state.maxLine}
          ellipsis="..."
          trimRight={false}
          onReflow={this.handleReflow}
          onClick={this.handleClick}
        />
      </Wrapper>
    );
  }
}

export default ReactLineEllipsis;
