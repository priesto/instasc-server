const exec = require('child_process').exec;

module.exports = (date, pid, cb) => {
    exec(`echo "php $(pwd)/php/upload.php ${pid}" | at ${date}`, (error, stdout, stderr) => {
        if(error) {
            cb(error);
        }
        else cb(null, parseInt(stderr.split('\n')[1].split(' ')[1]));
    })
}