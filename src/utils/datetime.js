import moment from 'moment';

export const formatDateTime = (date, format = 'YYYY-MM-DD HH:mm') => {
  return moment(date).format(format);
};

export const formatDate = (date, format = 'YYYY-MM-DD') => {
  return formatDateTime(date, format);
};

export const calculateDurationDays = date => {
  return Math.ceil(moment(date).diff(moment(), 'days', true));
};

export const formatDateTimeToSecond = (
  date,
  format = 'YYYY-MM-DD HH:mm:ss'
) => {
  return formatDateTime(date, format);
};

export const transformDayToMillisecond = day => day * 24 * 60 * 60 * 1000;
