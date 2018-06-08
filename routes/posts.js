const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const { JWT_SECRET } = require('../config');
const db = require('../utils/database');
const aws = require('../utils/aws');
const at = require('../utils/at');
const atrm = require('../utils/atrm');
const post_delete = require('../utils/post_delete');


const router = express.Router();
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1 * Math.pow(10,6),
        files: 1
    }
}).single('img');


// TODO: Test with wrong inputs.
// TODO: Write `upload` script.


router.get('/', (req, res) => {
    const { uid } = req.token;

    // TODO: check if aid belongs to this user.

    db.getConnection((err, connection) => {
        if(err) {
            console.error('could not get connection from pool.', err);
            return res.status(500).send();
        }

        connection.query('SELECT * FROM posts WHERE posts.aid IN (SELECT aid FROM accounts WHERE accounts.uid = ?)', [uid], (error, results, fields) => {
            connection.release();
            if(error) {
                console.log(error);
                return res.status(500).json({msg: 'database error'});
            }
            res.status(200).json(results);
        })

    })
})

router.post('/', (req, res) => {
    
    //TODO: Revert previous operations if something bad happens during the process.

    upload(req, res, (err) => {
        // req.body contains non-file data
        // req.file contain information about the file.
        let { caption, timestamp, aid } = req.body;
        if(!caption || !timestamp || !req.file || !aid) return res.status(400).json({msg: 'some fields are missing'});
        
        try { timestamp = parseInt(timestamp); }
        catch(e) { console.log(e); return res.status(500).json({msg: 'timestamp must be an integer'}) }

        if(err) return res.status(500).json({msg: 'could not upload your file to the server', err});
        else {
            aws.put(req.file.buffer, (err, url) => {
                if(err) return res.status(500).json({msg: 'could not upload to s3.', err});
                else {
                    db.getConnection((err, connection) => {
                        if(err) {
                            console.error('could not get connection from pool.', err);
                            return res.status(500).send();
                        }
                
                        connection.query('INSERT INTO posts (caption, timestamp, mediaURL, aid) VALUES (?, ?, ?, ?)', [caption, timestamp, url, aid], (error, results, fields) => {
                            if(error) {
                                console.log(error);
                                return res.status(500).json({msg: 'database error during insert statement'});
                            }


                            connection.query('SELECT LAST_INSERT_ID() AS pid', (error, results, fields) => {
                                if(error) {
                                    console.log(error);
                                    return res.status(500).json({msg: 'could not retrieve post id.'});
                                }

                                let pid = results[0].pid;

                                try {
                                    const date = new Date(timestamp);
                                    const minutes = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes();
                                    const hours = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours();
                                    const dayMonth = date.getDate();
                                    const month = date.getMonth() + 1;
                                    const year = date.getFullYear();
    
                                    at(`${hours}:${minutes} ${month}/${dayMonth}/${year}`, pid, (err, jobid) => {
                                        err ? res.status(500).json({msg: 'could not schedule post with `at`', err}) : null;
                                        connection.query('UPDATE posts SET jobid = ? WHERE posts.pid = ?', [jobid, pid], (error, results, fields) => {
                                            if(error) {
                                                console.log(error);
                                                return res.status(500).json({msg: 'could not update jobid'});
                                            }
                                            
                                            // Return inserted post.
                                            connection.query('SELECT * FROM posts WHERE pid = ?', [pid], (err, results, fields) => {
                                                connection.release();
                
                                                if(err) return res.status(500).json({msg: 'unable to retrieve new post from database'});
                                                else return res.status(200).send(results);
                                            })
                                            
                                        })
                                    });


                                } catch (e) {
                                    console.log(e);
                                    return res.status(500).json({msg: 'an error occured while trying to schedule the post.'});
                                }
                            })                    
                        })
                    })
                }
            })
        }
    })
})

router.delete('/:pid', (req, res) => {
    if(!req.params.pid) return res.status(400).json({msg: 'missing id'});

    const { pid } = req.params;

    // Si post 'completed' supprimer uniquement l'entrée présente dans la base de donnée.
    // Si post 'failed' alors supprimer également l'image stocker sur Amazon.
    // Si post 'pending' alors supprimer également l'image stocker sur Amazon et le at job.

    post_delete(pid)
        .then(() => res.status(200).send())
        .catch((err) => {
            console.log(err);
            return res.status(500).json(err);
        })

})

module.exports = router;