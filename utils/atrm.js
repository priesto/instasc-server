const exec = require('child_process').exec;

module.exports = (id, cb) => {
    exec(`atrm ${id}`, (error, stdout, stderr) => {
        if(error) {
            cb(error);
        } else {     
            cb(null, 'success');
        }
    })
}