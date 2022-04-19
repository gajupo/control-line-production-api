const { logError } = require('../controllers/core');

function containsAny(source, target) {
  // var result = source.filter(function(item){ return target.indexOf(item) > -1});
  return source.find((rol) => rol === target);
}

function authorize(roles = []) {
  // roles param can be a single role string (e.g. Role.User or 'User')
  // or an array of roles (e.g. [Role.Admin, Role.User] or ['Admin', 'User'])
  let rol = roles;
  if (typeof roles === 'string') {
    rol = [roles];
  }

  // authorize based on user role
  return (req, res, next) => {
    if (!containsAny(rol, req.user.rolId)) {
    // user's role is not authorized
      logError(`User is not authorized ${JSON.stringify(req.user)}`);
      return res.status(403).send('Access Denied');
    }
    // authentication and authorization successful
    return next();
  };
}

module.exports = authorize;
