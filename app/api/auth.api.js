const { httpClient } = require('./httpClient');
/* Attention, it can be used in both methods, only canceltoken is deprecated */
// const controller = new AbortController(); //New way cancellable request axios
/* const generateCancellationToken = () => {
    return new AbortController();
} */

const getVerifyAuth = async (jwt) => {
  const response = await httpClient.post('/idp/auth/verify', {}, {
    headers: {
      'x-auth-token': jwt,
    },
  });
  return response.data;
};

module.exports.getVerifyAuth = getVerifyAuth;
