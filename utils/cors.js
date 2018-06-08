module.exports = (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT");
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization");
    req.method === 'OPTIONS' ? res.sendStatus(200) : next();
}