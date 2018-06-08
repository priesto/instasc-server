// pwd = /home/harik/Documents/node/reactjs/insta-sc/server/

const fs = require('fs');
const https = require('https');
const Client = require('instagram-private-api').V1;

const db = require('../database');
const aes = require('../aes');
const aws = require('../aws');
const uploadHelpers = require('./upload-helpers');
const syslog = require('../syslog');

const pid = process.argv[2];

db.getConnection((err, connection) => {
    if(err) logToSyslog(err.toString());

    // Retrieve caption and url from database
    // query : SELECT caption, mediaURL, ig_username, ig_password FROM ( SELECT * FROM posts WHERE posts.pid = 6 ) AS t INNER JOIN accounts ON t.aid = accounts.aid 
    connection.query(
        `SELECT caption, mediaURL, ig_username, ig_password, ig_cookie FROM ( SELECT * FROM posts WHERE posts.pid = ? ) AS t
         INNER JOIN accounts ON t.aid = accounts.aid`, [pid], (error, results, fields) => {

        if(err) logToSyslog(err.toString());

        
        // 'Cannot destructure property ...'  is thrown when `results` is an empty array.
        const { caption, mediaURL, ig_username, ig_password, ig_cookie } = results[0];

        let filename = mediaURL.split('/')[4];

        https.get(mediaURL, async res => {
            if(res.statusCode == 200) {
                res.pipe(fs.createWriteStream(`/tmp/${filename}`));

                // Upload to Instagram
                // TODO: Replace ig_cookie with proper session by using `upload-helpers`.

                try {
                    const ig_cookie_o = JSON.parse(ig_cookie);
                    const ig_password_plain = aes.decrypt(ig_password);
                    const session = await uploadHelpers.getSession(ig_cookie_o.idx, ig_username, ig_password_plain);

                    Client.Upload.photo(session, `/tmp/${filename}`)
                        .then(step => Client.Media.configurePhoto(session, step.params.uploadId, caption))
                        .then(final => {
                            //console.log(final);
                            //console.log(final.params);
            
                            // Set status to 'COMPLETED'.
                            // TODO: Delete image from s3 and shift to Instagram link.
            
                            let url = final.params.images[0].url;

                            aws.deleteObject(filename, (err, data) => {
                                if(err) logToSyslog(err.toString());

                                // SQL Query : UPDATE `posts` SET `mediaURL` = 'https://s3.amazonaws.com/instasc/8dd81eee338b9481f7f5_1519509239659ss.jpeg', `status` = 'FAILED' WHERE `posts`.`pid` = 7 

                                setStatusSuccess(connection, pid);
                                db.end();
                            })

            
                        }).catch(err => {
            
                            // Set status to 'FAILED'.
                            setStatusFailed(connection, pid, err);
                            db.end();

                        })

                } catch (error) {
                    logToSyslog(error);
                }
            }
        })


    })
})


function setStatusFailed(connection, pid, reason) {
    connection.query(`UPDATE posts SET status = 'FAILED' WHERE pid = ?`, [pid], (error, results, fields) => {
        if(error) logToSyslog(error);
        else logToSyslog(reason);
    })
}

function setStatusSuccess(connection, pid) {
    connection.query(`UPDATE posts SET status = 'COMPLETED' WHERE pid = ?`, [pid], (error, results, fields) => {
        if(error) logToSyslog(error);
    })
}

function logToSyslog(err) {
    syslog(err)
        .then(db.end)
        .finally(process.exit)
}