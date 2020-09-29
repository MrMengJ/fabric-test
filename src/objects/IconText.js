import { fabric } from 'fabric';
import Text from './Text';

const IconText = fabric.util.createClass(Text, {
  render: function (ctx) {
    this.callSuper('render', ctx);
  },
});

export default IconText;
