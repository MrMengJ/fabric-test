import React from 'react';
import styled from 'styled-components';

import ClampLines from '../../components/ReactClampLines';

// import './style.css';

const Wrapper = styled.div`
  //height: 100px;
`;

const ipsum =
  'Spicy jalapeno bacon ipsum dolor amet drumstick sirloin chuck shankle. Flank ribeye pancetta andouille ham hock. Turkey cow tenderloin landjaeger filet mignon hamburger. Pig tail strip steak pastrami t-bone venison bresaola biltong corned beef drumstick pork hamburger tri-tip. Tongue ham hock corned beef tri-tip meatball t-bone fatback andouille sirloin chuck jowl biltong pastrami. Ham hock ground round landjaeger tail strip steak. Ham sirloin pork loin salami spare ribs. Jerky cow short ribs ground round. Hamburger porchetta shankle meatloaf shank. Tongue ham hock corned beef tri-tip meatball t-bone fatback andouille sirloin chuck jowl biltong pastrami. Ham hock ground round landjaeger tail strip steak. Ham sirloin pork loin salami spare ribs. Jerky cow short ribs ground round. Hamburger porchetta shankle meatloaf shank. Tongue ham hock corned beef tri-tip meatball t-bone fatback andouille sirloin chuck jowl biltong pastrami. Ham hock ground round landjaeger tail strip steak. Ham sirloin pork loin salami spare ribs. Jerky cow short ribs ground round. Hamburger porchetta shankle meatloaf shank. Tongue ham hock corned beef tri-tip meatball t-bone fatback andouille sirloin chuck jowl biltong pastrami. Ham hock ground round landjaeger tail strip steak. Ham sirloin pork loin salami spare ribs. Jerky cow short ribs ground round. Hamburger porchetta shankle meatloaf shank. Tongue ham hock corned beef tri-tip meatball t-bone fatback andouille sirloin chuck jowl biltong pastrami. Ham hock ground round landjaeger tail strip steak. Ham sirloin pork loin salami spare ribs. Jerky cow short ribs ground round. Hamburger porchetta shankle meatloaf shank. Tongue ham hock corned beef tri-tip meatball t-bone fatback andouille sirloin chuck jowl biltong pastrami. Ham hock ground round landjaeger tail strip steak. Ham sirloin pork loin salami spare ribs. Jerky cow short ribs ground round. Hamburger porchetta shankle meatloaf shank.';

const chText =
  '我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 我是中文 ';

function ClampLinesExample(props) {
  return (
    <Wrapper>
      <h3>Default</h3>
      <ClampLines text={chText} id="default" />

      {/*<h3>Custom button labels, custom ellipsis and custom CSS class</h3>*/}
      {/*<ClampLines*/}
      {/*  text={ipsum}*/}
      {/*  id="custom"*/}
      {/*  lines={4}*/}
      {/*  moreText="Expand"*/}
      {/*  lessText="Collapse"*/}
      {/*  className="custom-class"*/}
      {/*  ellipsis="_ _"*/}
      {/*  innerElement="span"*/}
      {/*/>*/}
    </Wrapper>
  );
}

ClampLinesExample.propTypes = {};

export default ClampLinesExample;
