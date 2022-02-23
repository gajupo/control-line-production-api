const services = require('../services');
async function auth(req, res, next) {
    const jwt = req.header('x-auth-token');
    //not only send back a 401 error also teminate de request, using return statement
    if(!jwt) return res.status(401).send('Access Denied. No token provided');
    try {
        const decoded = await services.Auth.VerifyAuth(jwt);
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).send('Invalid Token');
    }
}

module.exports.auth = auth;