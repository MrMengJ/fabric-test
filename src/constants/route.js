import { reduce } from 'lodash';

export const Routes = {
  headquartersPrList: '/headquarters-prlist',
  areaPrList: '/area-prlist',
  regionPrListDetail: '/regionPrListDetail',
  prListDetail: '/prListDetail'
};

export const FullPathRoutes = {
  headquartersPrList: fullPath('headquartersPrList'),
  areaPrList: fullPath('areaPrList'),
  prListDetail: fullPath('prListDetail'),
  regionPrListDetail: fullPath('regionPrListDetail')
};

function fullPath(path) {
  const routes = path.split('.');
  return reduce(
    routes,
    (result, value) => {
      return result + Routes[value];
    },
    ''
  );
}
