const { getVerifyAuth } = require('../api/auth.api');

async function VerifyAuth(jwt) {
  const data = await getVerifyAuth(jwt);
  return data;
}

module.exports.VerifyAuth = VerifyAuth;
