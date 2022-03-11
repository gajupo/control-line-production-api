const { getVerifyAuth } = require('../api/auth.api');

async function VerifyAuth(jwt) {
  try {
    // token = generateCancellationToken();
    const data = await getVerifyAuth(jwt);
    return data;
  } catch (error) {
    // logger.info('Error on verify jwt ', error);
    throw new Error(error);
  }
}

module.exports.VerifyAuth = VerifyAuth;
