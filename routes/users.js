const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const { isEmail, isEmpty } = require('validator');
const { JWT_SECRET } = require('../config');

const db = require('../utils/database');
const env = require('../utils/env');

const Exception = require('../utils/exception');

const router = express.Router();

router.post('/login', async (req, res, next) => {
    const { email, password } = req.body;

    if(isEmpty(email) || isEmpty(password) || !isEmail(email))
        return next(new Exception('Invalid email or missing credentials', null, {email, password}, 400));

    try {
        const results = await db.query('SELECT uid, password, end_of_service FROM users WHERE email = ?', [email])

        // results: [{uid, password}]

        if(results.length === 0)
            return next(new Exception('Could not find this user', null, {email, password}, 400));

        if(results.length > 1)
            return next(new Exception('Multiple users with same email', null, {email}, 500));

        let uid = results[0].uid;
        let hash = results[0].password;
        let endOfService = results[0].end_of_service;

        bcrypt.compare(password, hash, function(err, result) {
            if(!result) return next(new Exception('Invalid credentials', null, {email, password}, 400));

            jwt.sign({uid: uid}, JWT_SECRET, { expiresIn: '3h'}, (err, token) => {
                if(err) return next(new Exception('Could not generate a token', err, null, 500));
                res.status(200).json({msg: 'you are now connected', token, endOfService});
            })

        });

    } catch (error) {
        let ex = new Exception('Database error', error.message, null, 500);
        return next(ex);
    }

})

router.post('/signup', (req, res, next) => {
    const { email, password, username } = req.body;

    if(isEmpty(email) || isEmpty(password) || isEmpty(username) || !isEmail(email))
        return next(new Exception('Invalid email or missing credentials', null, {email, password, username}, 400));
    
    bcrypt.genSalt(10, function(err, salt) {
        if(err)
            return next(new Exception('Bcrypt genSalt Error', err.message, null, 500));

        //TODO: Sanitize inputs.
        bcrypt.hash(password, salt, async function(err, hash) {
            if(err)
                return next(new Exception('Bcrypt Hash Error', err.message, null, 500));


            try {
                let endOfService = new Date();

                endOfService = endOfService.setDate(endOfService.getDate() + 3);

                await db.query('INSERT INTO users (email, password, username, end_of_service) VALUES (?, ?, ?, ?)', [email, hash, username, endOfService]);
                
                const results = await db.query('SELECT uid, end_of_service from users WHERE email = ?', [email]);
                const { uid, end_of_service } = results[0];

                jwt.sign({uid: uid}, JWT_SECRET, { expiresIn: '3h'}, (err, token) => {
                    if(err)
                        return next(new Exception('JWT Sign Error', err.message, null, 500));

                    res.status(201).json({msg: 'user created', token, endOfService: end_of_service});
                });

            } catch (error) {
                return next(new Exception('Unxpected Error', error.message, null, 500));
            }

        });
    });
    
})


//TODO: Refactor `env.isDev() && console && return` part

module.exports = router;