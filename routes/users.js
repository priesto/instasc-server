const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const { isEmail, isEmpty } = require('validator');
const { JWT_SECRET } = require('../config');

const db = require('../utils/database');
const env = require('../utils/env');

const router = express.Router();

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if(isEmpty(email) || isEmpty(password)) return res.status(400).json({msg: 'you must provide credentials'});
    if(!isEmail(email)) return res.status(401).json({msg: 'not an email'});

    try {
        const results = await db.query('SELECT uid, password, end_of_service FROM users WHERE email = ?', [email])

        // results: [{uid, password}]
        if(results.length === 0) return res.status(401).json({msg: 'user does not exist'});
        if(results.length > 1) return res.status(500).json({msg: 'an error occured'});

        let uid = results[0].uid;
        let hash = results[0].password;
        let endOfService = results[0].end_of_service;

        bcrypt.compare(password, hash, function(err, result) {
            if(!result) return res.status(401).json({msg: 'wrong credentials'});
            jwt.sign({uid: uid}, JWT_SECRET, { expiresIn: '3h'}, (err, token) => {
                if(err) return res.status(500).json({msg: 'could not generate a token'});
                res.status(200).json({msg: 'you are now connected', token, endOfService});
            })
        });

    } catch (error) {
        env.isDev() && console.log(error);
        return res.status(500).json({msg: 'database error'});
    }

})

router.post('/signup', (req, res) => {
    const { email, password, username } = req.body;

    if(isEmpty(email) || isEmpty(password) || isEmpty(username)) return res.status(400).json({msg: 'you must provide credentials'});
    if(!isEmail(email)) return res.status(400).json({msg: 'not an email'});

    bcrypt.genSalt(10, function(err, salt) {
        if(err) {
            env.isDev() && console.log('bcrypt error:', err);
            return res.status(500).json({msg: 'bcrypt error'});
        }

        //TODO: Sanitize inputs.
        bcrypt.hash(password, salt, async function(err, hash) {
            if(err) {
                env.isDev() && console.log(err);
                return res.status(500).json({msg: 'hash error', err});
            }


            try {
                let endOfService = new Date();

                endOfService = endOfService.setDate(endOfService.getDate() + 3);

                await db.query('INSERT INTO users (email, password, username, end_of_service) VALUES (?, ?, ?, ?)', [email, hash, username, endOfService]);
                
                const results = await db.query('SELECT uid, end_of_service from users WHERE email = ?', [email]);
                const { uid, end_of_service } = results[0];

                jwt.sign({uid: uid}, JWT_SECRET, { expiresIn: '3h'}, (err, token) => {
                    if(err) {
                        env.isDev() && console.log(err);
                        return res.status(500).json({msg: 'could not generate a token'});
                    }

                    res.status(201).json({msg: 'user created', token, endOfService: end_of_service});
                });

            } catch (error) {
                env.isDev() && console.log(error);
                return res.status(500).send();
            }

        });
    });
    
})


//TODO: Refactor `env.isDev() && console && return` part

module.exports = router;