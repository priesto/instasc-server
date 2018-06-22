class Exception extends Error {
    constructor(message, err, fields, status) {
        super(message);

        this.name = this.constructor.name;
        this.status = status || 500;
        this.fields = fields || {};
        this.err = err || null;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = Exception;