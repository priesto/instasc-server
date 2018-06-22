const express = require('express');
const redis = require('redis');

const { JWT_SECRET } = require('../config');
const db = require('../utils/database');
const aes = require('../utils/aes');
const env = require('../utils/env');
const post_delete = require('../utils/post_delete');

const Exception = require('../utils/exception');

const router = express.Router();

router.get('/', async (req, res, next) => {
    let { uid } = req.token;

    try {
        const results = await db.query('SELECT aid, ig_username, ig_img, proxy, uid FROM accounts WHERE uid = ?', [uid]);
        res.status(200).json(results);
    } catch (error) {
        return next(new Exception('Database Error', error.message, {uid}, 500));
    }

});

router.post('/', async (req, res, next) => {
    let { username, password, proxy } = req.body;

    if(!username || !password)
        return next(new Exception('Missing fields', null, {username, password, proxy}, 400));

    if(!proxy) proxy = null;

    // Check if username not already added by someone else

    try {
        const results = await db.query('SELECT aid from accounts WHERE username = ?', [username]);
        if(results.length !== 0) return res.status(400).send();
    } catch (error) {
        return next(new Exception('Database Error', error.message, {uid}, 500));
    }

    const publisher = redis.createClient();
    const subscriber = redis.createClient();

    const json = { username, password };

    subscriber.on('message', async (channel, message) => {
        if(message === '401' | message === '403') {

            // An error occured during the connection or a session already exists.
            publisher.quit();
            subscriber.quit();

            return res.status(message).send();
        }

        try {

            // Predis seems to escape some characters such as double quotes, and on top of that
            // double quotes are added at the beginning and the end of the JSON string.
            // So, for the moment we simply use `replace` and `slice` to delete those extra chars.
            // TODO: Find a solution.

            message = message.replace(/\\/g, '').slice(0, -1).slice(1);

            const obj = JSON.parse(message);
            const cipher = aes.encrypt(password);
            
            await db.query(`
                INSERT INTO accounts (aid, ig_username, ig_password, ig_img, proxy, uid)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [obj.id, username, cipher, obj.img, proxy, req.token.uid]
            );

            const results = await db.query('SELECT aid, ig_username, ig_img, proxy, uid FROM accounts WHERE uid = ?', [req.token.uid]);

            publisher.quit();
            subscriber.quit();

            return res.status(201).send(results);
            
        } catch (error) {            
            publisher.quit();
            subscriber.quit();

            return next(new Exception('Unknown Error', error.message, {message, username, password, proxy}, 500));
        }

    })
    
    subscriber.on('subscribe', (channel, count) => {
        // Send data to PHP script after subscription to the response channel 
        publisher.publish('request', JSON.stringify(json));
    })
    
    subscriber.subscribe('response');
    
})

router.put('/', async (req, res, next) => {
    const { newPassword, newProxy, aid } = req.body;

    if(!newPassword && !newProxy) 
        return next(new Exception('Missing fields', null, {newPassword, newProxy, aid}, 400));

    if(!aid)
        return next(new Exception('Aid is missing', null, {aid, newPassword, newProxy}, 400));

    let sql;

    // TODO: Sanitize user input.

    if(newPassword) {
        const cipher = aes.encrypt(newPassword);
        if (newProxy) sql = `UPDATE accounts SET ig_password = '${cipher}', proxy = '${newProxy}' WHERE aid = ${aid}`;
        else sql = `UPDATE accounts SET ig_password = '${cipher}' WHERE aid = ${aid}`;
    } else {
        // uniquement proxy
        sql = `UPDATE accounts SET proxy = '${newProxy}' WHERE aid = ${aid}`;
    }


    try {
    
        await db.query(sql);
        return res.status(200).send();

    } catch (error) {
        return next(new Exception('Database Error', error.message, {sql}, 500));
    }

})


router.delete('/:aid', async (req,res, next) => {
    // 1. Supprimer tous les posts appartenant à cette utilisateur.
    // 2. Supprimer ce compte.

    const { aid } = req.params;

    if(!aid)
        return next(new Exception('Aid is missing', null, {aid}, 400));    

    // Créer boucle et supprimer tous les posts en utilisant
    // 'delete endpoint' de la route users.

    try {
        
        const results = await db.query('SELECT * FROM posts WHERE aid = ?', [aid]);

        for (let index = 0; index < results.length; index++) {
            try {
                await post_delete(results[index].pid)
            } catch (e) {
                // Figure what to do if an error occurs with the deletion of a post.
                // Stop everything? Continue?

                console.log('could not delete this post');
                console.log(e);
            }             
        }

        await db.query('DELETE FROM accounts WHERE aid = ?', [aid]);
        return res.status(200).send();
    } catch (error) {
        return next(new Exception('Database Error', error.message, {aid}, 500));
    }

})

module.exports = router;