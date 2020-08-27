import { isArray, isEmpty } from 'lodash';

export const isUnEmptyArray = value => isArray(value) && !isEmpty(value);
