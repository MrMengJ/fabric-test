import { fabric } from 'fabric';

const BaseObject = fabric.util.createClass(fabric.Object, {
  /**
   * Color of controlling borders of an object (when it's active)
   * @type String
   * @default
   */
  borderColor: '#4285F4',

  /**
   * Array specifying dash pattern of an object's borders (hasBorder must be true)
   * @since 1.6.2
   * @type Array
   */
  borderDashArray: [8, 5],

  /**
   * Opacity of object's controlling borders when object is active and moving
   * @type Number
   * @default
   */
  borderOpacityWhenMoving: 0.4,

  /**
   * Color of controlling corners of an object (when it's active)
   * @type String
   * @default
   */
  cornerColor: '#fff',

  /**
   * Color of controlling corners of an object (when it's active and transparentCorners false)
   * @since 1.6.2
   * @type String
   * @default
   */
  cornerStrokeColor: '#4285F4',

  /**
   * Specify style of control, 'rect' or 'circle'
   * @since 1.6.2
   * @type String
   */
  cornerStyle: 'rect',

  /**
   * Array specifying dash pattern of an object's control (hasBorder must be true)
   * @since 1.6.2
   * @type Array
   */
  cornerDashArray: null,

  /**
   * When true, object's controlling corners are rendered as transparent inside (i.e. stroke instead of fill)
   * @type Boolean
   * @default
   */
  transparentCorners: false,
});

export default BaseObject;
