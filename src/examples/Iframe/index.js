import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@blueprintjs/core';

import IframePage from './iframePage.html';

class Iframe extends Component {
  componentDidMount() {
    //获取iframe元素
    let iFrame = window.frames['myFrame'];
    console.log('iFrame', iFrame);
    //iframe加载完毕后再发送消息，否则子页面接收不到message
    iFrame.contentWindow.postMessage({ a: 1, b: 2 }, '*');
  }

  render() {
    return (
      <div>
        <Button> outer click</Button>
        <iframe src="./iframePage.html" frameBorder="1" id="myFrame" title={'myFrame'} />
      </div>
    );
  }
}

Iframe.propTypes = {};

export default Iframe;
