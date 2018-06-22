const db = require('../utils/database');
const aws = require('../utils/aws');
const atrm = require('../utils/atrm');

//TODO: Replace callback with a promise.

module.exports = (pid) => {
    return new Promise((resolve, reject) => {
        db.getConnection((err, connection) => {
            if(err) return reject(err);
        
            connection.query('SELECT * FROM posts WHERE pid = ?', [pid], (err, results, fields) => {
                if(err) return reject(err);
                if(!results.length) return reject(new Error('No post associated with this id'));
    
                let status = results[0].status;
                let filename = results[0].mediaURL.split('/')[4];
                let jobId = results[0].jobid;
        
                connection.query('DELETE FROM posts WHERE pid = ?', [pid], (err, results, fields) => {
                    if(err) return reject(err);
                })
        
                connection.release();
        
                if(status == 'PENDING' || status == 'FAILED') {
                    aws.deleteObject(filename, (err, data) => {
                        if(err) return reject(err);
                    })
    
                    // TODO: Test this part.
                    if(status == 'PENDING') {
                        if(jobId) {
                            atrm(jobId, (err, data) => {
                                if(err) return reject(err);
                            })
                        }
                    }
        
                    return resolve();
                }
            })
        
        })

    })

}