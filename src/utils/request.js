import _ from 'lodash';

/**
 * Parses the JSON returned by a network request
 *
 * @param  {object} response A response from a network request
 *
 * @return {object}          The parsed JSON from the request
 */
function parseJSON(response) {
  if (response.status === 204 || response.status === 205) {
    return null;
  }
  return response.json();
}

/**
 * Checks if a network request came back fine, and throws an error if not
 *
 * @param  {object} response   A response from a network request
 *
 * @return {object|undefined} Returns either the response, or throws an error
 */
async function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }

  const error = new Error(response.statusText);
  const backendError = await response.json();
  error.response = {
    status: response.status,
    code: backendError.code,
    message: backendError.message,
    errors: backendError.errors,
    errorCode: backendError.errorCode
  };
  throw error;
}

/**
 * Requests a URL, returning a promise
 *
 * @param  {string} url       The URL we want to request
 * @param  {object} [options] The options we want to pass to "fetch"
 *
 * @param {Boolean} isUploadFiles
 * @param {Function} onSuccess
 * @return {object}           The response data
 */
export default function request(
  url,
  options,
  isUploadFiles = false,
  onSuccess = parseJSON
) {
  const fetchFn = () => {
    if (
      !_.isUndefined(options.body) &&
      _.isUndefined(_.get(options, ['headers', 'Content-Type'])) &&
      !isUploadFiles
    ) {
      _.set(
        options,
        ['headers', 'Content-Type'],
        'application/json;charset=UTF-8'
      );
    }

    return fetch(url, { credentials: 'include', ...options })
      .then(checkStatus)
      .then(onSuccess);
  };
  return fetchFn().catch(error => {
    throw error;
  });
}
