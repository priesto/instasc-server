const express = require('express');
const multer = require('multer');

const db = require('../utils/database');
const aws = require('../utils/aws');
const at = require('../utils/at');
const atrm = require('../utils/atrm');
const env = require('../utils/env');
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


router.get('/', async (req, res) => {
    const { uid } = req.token;

    // TODO: check if aid belongs to this user.

    try {
        
        const results = await db.query('SELECT * FROM posts WHERE posts.aid IN (SELECT aid FROM accounts WHERE accounts.uid = ?)', [uid]);
        return res.status(200).json(results);

    } catch (error) {
        
        env.isDev() && console.log(error);
        return res.status(500).send();
    }

})

router.post('/', (req, res) => {
    
    //TODO: Revert previous operations if something bad happens during the process.




    upload(req, res, (err) => {
        
        // req.body contains non-file data
        // req.file contain information about the file.
        
        let { caption, timestamp, aid } = req.body;
        
        if(!caption || !timestamp || !req.file || !aid) return res.status(400).json({msg: 'some fields are missing'});
        
        try { timestamp = parseInt(timestamp); }
        catch(e) {
            env.isDev() && console.log(e);
            return res.status(500).send();
        }

        if(err) {
            env.isDev() && console.log(err);
            return res.status(500).send();
        }

        aws.put(req.file.buffer, async (err, url) => {
            if(err) {
                env.isDev() && console.log(err);
                return res.status(500).send();
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
                        env.isDev() && console.log(err);
                        return res.status(500).send();
                    }

                    try {
                        await db.query('UPDATE posts SET jobid = ? WHERE posts.pid = ?', [jobid, pid]);
                        const results = await db.query('SELECT * FROM posts WHERE pid = ?', [pid]);

                        return res.status(201).send(results);
                    } catch (error) {
                        env.isDev() && console.log(error);
                        return res.status(500).send();
                    }

                });

            } catch (error) {
                env.isDev() && console.log(error);
                return res.status(500).send();
            }


        })

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