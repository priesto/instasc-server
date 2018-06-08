const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config');

module.exports = (req, res, next) => {
    if(req.header('Authorization')) {
        const token = req.header('Authorization').split(' ');
        jwt.verify(token[1], JWT_SECRET, (err, decoded) => {
            if(err || !decoded) return res.status(400).json({msg: 'invalid token'});
            else req.token = decoded;
            next();
        })
    }
    else return res.status(400).json({msg: 'no token'});
}