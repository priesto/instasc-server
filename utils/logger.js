const morgan = require('morgan');


morgan.token('err', (req) => req.message);
morgan.token('uid', (req) => req.token ? req.token.uid : '');


const Logger = {};

Logger.Error = morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :err :uid', {
    skip: (req, res) => res.statusCode < 400
});

Logger.Info = morgan('tiny', {
    skip: (req, res) => res.statusCode > 399
});


module.exports = Logger;