const express = require('express');
const multer = require('multer');

const db = require('../utils/database');
const aws = require('../utils/aws');
const at = require('../utils/at');
const atrm = require('../utils/atrm');
const env = require('../utils/env');
const post_delete = require('../utils/post_delete');

const Exception = require('../utils/exception');

const router = express.Router();
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1 * Math.pow(10,6),
        files: 1
    },
    fileFilter: function(req, file, cb) {
        const valid = file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif';
        
        if(valid) cb(null, valid);
        else cb(new Error('Not a valid file'), valid);
    }
}).single('img');


// TODO: Test with wrong inputs.
// TODO: Write `upload` script.


router.get('/', async (req, res, next) => {
    const { uid } = req.token;

    // TODO: check if aid belongs to this user.

    try {
        
        const results = await db.query('SELECT * FROM posts WHERE posts.aid IN (SELECT aid FROM accounts WHERE accounts.uid = ?)', [uid]);
        return res.status(200).json(results);

    } catch (error) {
        return next(new Exception('Database Error', error.message, {uid}, 500));
    }

})

router.post('/', (req, res, next) => {
    
    //TODO: Revert previous operations if something bad happens during the process.




    upload(req, res, async (err) => {
        
        // req.body contains non-file data
        // req.file contain information about the file.

        if(err)
            return next(new Exception('Upload Error', err.message, {file:req.file}, 400));

        let { caption, timestamp, aid } = req.body;

        if(!caption || !timestamp || !req.file || !aid)
            return next(new Exception('Missing fields', null, {caption, timestamp, aid, file:req.file}, 400));
        
        try { timestamp = parseInt(timestamp); }
        catch(e) {
            return next(new Exception('Invalid timestamp', e.message, {timestamp}, 400));
        }


        // Check if timestamp between endOfService and a valid date

        try {
            const results = await db.query('SELECT end_of_service from users WHERE uid = ?', [req.token.uid]);
            
            const endOfService = results[0].end_of_service;
            const now = new Date().getTime();

            const valid = timestamp >= now && timestamp <= parseInt(endOfService);

            if(!valid)
                return next(new Exception('Unauthorized timestamp', null, {timestamp, endOfService}, 400));
            
        } catch (error) {
            return next(new Exception('Database Error', error.message, {uid: req.token.uid}, 500));
        }

        aws.put(req.file.buffer, async (err, url) => {
            if(err) {
                // err is an instance of Error
                let error = err.message || err;
                return next(new Exception('AWSError', error.message, null, 500));
            }

            try {
                await db.query('INSERT INTO posts (caption, timestamp, mediaURL, aid) VALUES (?, ?, ?, ?)', [caption, timestamp, url, aid]);
                const results = await db.query('SELECT LAST_INSERT_ID() AS pid');
    
                let pid = results[0].pid;
    
    
                const date = new Date(timestamp);
                const minutes = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes();
                const hours = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours();
                const dayMonth = date.getDate();
                const month = date.getMonth() + 1;
                const year = date.getFullYear();


                at(`${hours}:${minutes} ${month}/${dayMonth}/${year}`, pid, async (err, jobid) => {

                    if(err) {
                        // err is an instance of Error
                        return next(new Exception('AT Error', err.message, {hours, minutes, month, dayMonth, year, pid}, 500));
                    }

                    try {
                        await db.query('UPDATE posts SET jobid = ? WHERE posts.pid = ?', [jobid, pid]);
                        const results = await db.query('SELECT * FROM posts WHERE pid = ?', [pid]);

                        return res.status(201).send(results);
                    } catch (error) {
                        return next(new Exception('Database Error', error.message, {jobid, pid}, 500));
                    }

                });

            } catch (error) {
                return next(new Exception('Database Error or Timestamp Invalid', error.message, {timestamp, caption, url, aid}, 500));
            }


        })

    })

})

router.delete('/:pid', (req, res, next) => {
    if(!req.params.pid)
        return next(new Exception('Pid is missing', null, {params: req.params}, 400));

    const { pid } = req.params;

    // Si post 'completed' supprimer uniquement l'entrée présente dans la base de donnée.
    // Si post 'failed' alors supprimer également l'image stocker sur Amazon.
    // Si post 'pending' alors supprimer également l'image stocker sur Amazon et le at job.

    post_delete(pid)
        .then(() => res.status(200).send())
        .catch((err) => {
            if(process.env.NODE_ENV === 'development')
                console.log(err);
            return next(new Exception('Could not delete this post', err.message, {pid}, 500));
        })

})

module.exports = router;