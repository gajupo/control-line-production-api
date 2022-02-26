const _ = require('lodash');
module.exports = authorize;

function authorize(roles = []) {
    // roles param can be a single role string (e.g. Role.User or 'User') 
    // or an array of roles (e.g. [Role.Admin, Role.User] or ['Admin', 'User'])
    if (typeof roles === 'string') {
        roles = [roles];
    }

    // authorize based on user role
    return (req, res, next) => {
        if (!containsAny(roles, req.user.rolId)) {
            // user's role is not authorized
            return res.status(403).send('Access Denied');
        }
        // authentication and authorization successful
        next();
    }
}

function containsAny(source, target) {
    const result = source.find(rol => rol === target);
    //var result = source.filter(function(item){ return target.indexOf(item) > -1});   
    return result ? true : false;
} 