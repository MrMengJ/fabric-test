import React, { useState } from 'react';
import ChopLines from 'chop-lines';
import styled from 'styled-components';
import { rem, position } from 'polished';
import insane from 'insane';

const Wrapper = styled.div`
  background: white;
  color: darkslategrey;
  font-size: ${rem(16)};
  font-weight: 400;
  max-width: ${rem(540)};
  padding: ${rem(16)};
  position: relative;

  p a {
    color: dodgerblue;
    text-decoration: underline;
  }
`;

const Ellipsis = styled.a`
  background: white;
  font-size: ${rem(12)};
  font-weight: 600;
  outline: none;
  text-transform: uppercase;

  span {
    background: lavender;
    border-radius: ${rem(12)};
    color: slateblue;
    display: inline-block;
    padding: 0 ${rem(8)};
  }

  :hover,
  :focus {
    span {
      color: indigo;
    }
  }

  :before {
    background: linear-gradient(90deg, transparent, white);
    content: '';
    ${position('absolute', 0, '100%', 0, 'auto')};
    width: ${rem(48)};
  }
`;

const Sanitized = ({ html }) => (
  <div
    dangerouslySetInnerHTML={{
      __html: insane(html, { allowedTags: ['p', 'strong', 'em', 'a'] }),
    }}
  />
);

const html = `
  <p>
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis turpis
    nunc, feugiat nec facilisis ac, pretium non erat.
    <strong>
      Pellentesque habitant morbi tristique
      <a href="#">some link</a>
      senectus et netus et malesuada fames ac turpis egestas.
    </strong>
    <em>
      Suspendisse a semper magna. Aenean rhoncus eros non quam eleifend,
      vitae porttitor odio bibendum.
    </em>
  </p>
`;

const ChopLinesExample = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Wrapper>
      {isExpanded ? (
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis turpis nunc,
          feugiat nec facilisis ac, pretium non erat.
          <strong>
            Pellentesque habitant morbi tristique
            <a href="#">some link</a>
            senectus et netus et malesuada fames ac turpis egestas.
          </strong>
          <em>
            Suspendisse a semper magna. Aenean rhoncus eros non quam eleifend, vitae
            porttitor odio bibendum.
          </em>
        </p>
      ) : (
        <ChopLines
          lines={3}
          lineHeight={24}
          ellipsis={
            <Ellipsis onClick={() => setIsExpanded(true)}>
              <span>Read More</span>
            </Ellipsis>
          }
        >
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis turpis nunc,
            feugiat nec facilisis ac, pretium non erat.
            <strong>
              Pellentesque habitant morbi tristique
              <a href="#">some link</a>
              senectus et netus et malesuada fames ac turpis egestas.
            </strong>
            <em>
              Suspendisse a semper magna. Aenean rhoncus eros non quam eleifend, vitae
              porttitor odio bibendum.
            </em>
          </p>
        </ChopLines>
      )}
    </Wrapper>
  );
};

export default ChopLinesExample;
