const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const { isEmail, isEmpty } = require('validator');
const { JWT_SECRET } = require('../config');

const db = require('../utils/database');

const router = express.Router();

router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if(isEmpty(email) || isEmpty(password)) return res.status(400).json({msg: 'you must provide credentials'});
    if(!isEmail(email)) return res.status(401).json({msg: 'not an email'});

    db.getConnection((err, connection) => {
        if(err) {
            console.error('could not get connection from pool.', err);
            return res.status(500).send();
        }

        connection.query('SELECT uid, password FROM users WHERE email = ?', [email], (error, results, fields) => {
            connection.release();
            
            if(error) return res.status(500).json({msg: 'database error'});
    
            // results: [{uid, password}]
            if(results.length === 0) return res.status(401).json({msg: 'user does not exist'});
            if(results.length > 1) return res.status(500).json({msg: 'an error occured'});
    
            let uid = results[0].uid;
            let hash = results[0].password;
    
            bcrypt.compare(password, hash, function(err, result) {
                if(!result) return res.status(401).json({msg: 'wrong credentials'});
                jwt.sign({uid: uid}, JWT_SECRET, { expiresIn: '3h'}, (err, token) => {
                    if(err) return res.status(500).json({msg: 'could not generate a token'});
                    res.status(200).json({msg: 'you are now connected', token});
                })
            });
    
        })

    })


})

router.post('/signup', (req, res) => {
    const { email, password, username } = req.body;

    if(isEmpty(email) || isEmpty(password) || isEmpty(username)) return res.status(400).json({msg: 'you must provide credentials'});
    if(!isEmail(email)) return res.status(400).json({msg: 'not an email'});

    bcrypt.genSalt(10, function(err, salt) {
        if(err) return res.status(500).json({msg: 'bcrypt error', err});
        bcrypt.hash(password, salt, function(err, hash) {
            if(err) return res.status(500).json({msg: 'hash error', err});
            //TODO: Sanitize inputs.

            db.getConnection((err, connection) => {
                if(err) {
                    console.error('could not get connection from pool.' ,err);
                    return res.status(500).send();
                }
                
                connection.query('INSERT INTO users (email, password, username) VALUES (?, ?, ?)', [email, hash, username],
                (error, results, fields) => {
                    if(error) {
                        if(error.errno == 1062) return res.status(403).json({msg: 'email already used'});
                        else return res.status(500).json({msg: 'could not add user', err});
                    }
                    
                    connection.query('SELECT uid from users WHERE email = ?', [email], (error, results, fields) => {
                        connection.release();
                        if(error) return res.status(500).json({msg: 'could not retrieve user id', err});
                        const { uid } = results[0];
                        jwt.sign({uid: uid}, JWT_SECRET, { expiresIn: '3h'}, (err, token) => {
                            if(err) return res.status(500).json({msg: 'could not generate a token'});
                            res.status(201).json({msg: 'user created', token});
                        });
                    });
                });

            })
        });
    });
    
})

module.exports = router;