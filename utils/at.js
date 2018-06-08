const exec = require('child_process').exec;

module.exports = (date, pid, cb) => {
    exec(`echo "node $(pwd)/utils/insta/upload.js ${pid}" | at ${date}`, (error, stdout, stderr) => {
        if(error) {
            console.log(error);
            cb('unable to exec `at` command, exit code: ' + error.code);
        }
        else cb(null, parseInt(stderr.split('\n')[1].split(' ')[1]));
    })
}