import React, { Component } from 'react';
import styled from 'styled-components';
import { map } from 'lodash';
import uuid from 'uuid/v4';

const Ul = styled.ul`
  padding: 0;
  margin: 0;
  width: 500px;
  height: 200px;
  overflow-y: auto;
`;

const Li = styled.li`
  margin: 0;
  padding: 6px;
`;

const Text = styled.span`
  display: inline-block;
  height: 20px;
`;

const produceData = (length) => {
  const result = [];
  for (let i = 0; i < length; i++) {
    result.push(uuid());
  }
  return result;
};

class ScrollTest extends Component {
  constructor(props) {
    super(props);
    this.length = 20;
    this.lastScrollPosition = { x: 0, y: 0 };
    this.state = {
      data: produceData(this.length),
    };
  }

  handleScroll = (event) => {
    const { scrollTop, scrollLeft, scrollHeight, clientHeight } = event.target;
    console.log('scroll top', scrollTop);
    const isScrollDown = scrollTop > this.lastScrollPosition.y;
    const { isScrollingToEnd } = this.state;

    if (isScrollDown && !isScrollingToEnd && scrollHeight <= clientHeight + scrollTop) {
      this.setState({ isScrollingToEnd: true });
      const addedData = produceData(10);
      const newData = addedData.concat(this.state.data);
      console.log('newData', newData);
      setTimeout(() => {
        this.length += 10;
        this.setState({ isScrollingToEnd: false, data: newData });
      }, 3000);
    }
    this.lastScrollPosition = { x: scrollLeft, y: scrollTop };
  };

  render() {
    const { data } = this.state;
    return (
      <Ul onScroll={this.handleScroll}>
        {map(data, (item, index) => {
          return (
            <Li key={item}>
              <Text>{`${item}-${index}`}</Text>
            </Li>
          );
        })}
      </Ul>
    );
  }
}

export default ScrollTest;
