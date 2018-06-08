const exec = require('child_process').exec;

module.exports = log = (message) => {
    return new Promise((resolve, reject) => {
        exec(`logger -t "insta-sc" ${message}`, (err, stdout, stder) => {
            if(err) reject(err);
            else resolve();
        })
    })
}