const express = require('express');

const { JWT_SECRET } = require('../config');
const db = require('../utils/database');
const init = require('../utils/insta/init');
const aes = require('../utils/aes');
const post_delete = require('../utils/post_delete');

const router = express.Router();

router.get('/', (req, res) => {
    let { uid } = req.token;

    db.getConnection((err, connection) => {
        if(err) {
            console.error('could not get connection from pool.', err);
            return res.status(500).send();
        }

        connection.query('SELECT aid, ig_username, ig_img, proxy, uid FROM accounts WHERE uid = ?', [uid], (error, results, fields) => {
            connection.release();
            if(error) return res.status(500).json({msg: 'database error'});
            res.status(200).json(results);

        })

    })
});

router.post('/', (req, res) => {
    let { username, password, proxy } = req.body;

    if(!username || !password) return res.status(401).json({msg: 'some fields are missing'});
    if(!proxy) proxy = null;

    init(username, password, proxy)
        .then(data => {

            console.log('connected successfully');
            db.getConnection((err, connection) => {
                if(err) {
                    console.error('could not get connection from pool.', err);
                    return res.status(500).send();
                }

                const cipher = aes.encrypt(password);

                connection.query(`
                    INSERT INTO accounts (aid, ig_username, ig_password, ig_img, ig_cookie, proxy, uid)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [data.id, username, cipher, data.picture, JSON.stringify(data.cookie), proxy, req.token.uid],
                    (error, results, fields) => {
                        if(error) {
                            console.error('could not insert.', error);
                            return res.status(500).json({msg: 'database error'});
                        }

                        connection.query(`
                            SELECT aid, ig_username, ig_img, proxy, uid FROM accounts WHERE uid = ?`,
                            [req.token.uid],
                            (error, results, fields) => {
                                connection.release();
                                if(error) {
                                    console.error('could not select.', error);
                                    return res.status(500).json({msg: 'database error'});
                                }
                                res.status(200).json(results);
                        })

                    }
                );
            })

        }).catch(err => {
            console.log('could not connect');
            return res.status(500).json({msg: 'could not connect to your account with these credentials.'});
        })

    
})

router.put('/', (req, res) => {
    const { newPassword, newProxy, aid } = req.body;

    if(!newPassword && !newProxy) return res.status(400).json({msg: 'some fields are missing'});
    if(!aid) return res.status(400).json({msg: 'aid is missing'});
    // UPDATE `accounts` SET `ig_password` = 'dddd', `proxy` = 'ddd' WHERE `accounts`.`aid` = 5934622415

    let sql;

    if(newPassword) {
        const cipher = aes.encrypt(newPassword);
        if (newProxy) sql = `UPDATE accounts SET ig_password = '${cipher}', proxy = '${newProxy}' WHERE aid = ${aid}`;
        else sql = `UPDATE accounts SET ig_password = '${cipher}' WHERE aid = ${aid}`;
    } else {
        // uniquement proxy
        sql = `UPDATE accounts SET proxy = '${newProxy}' WHERE aid = ${aid}`;
    }

    db.getConnection((err, connection) => {
        if(err) {
            console.error('could not get connection from pool.', err);
            return res.status(500).send();
        }

        connection.query(sql, (error, results, fields) => {
            if(error) {
                console.error('could not update.', error);
                return res.status(500).json({msg: 'database error'});
            }

            connection.release();
            return res.status(200).send();
        })
    })


})


router.delete('/:aid', (req,res) => {
    // 1. Supprimer tous les posts appartenant à cette utilisateur.
    // 2. Supprimer ce compte.

    const { aid } = req.params;

    if(!aid) return res.status(400).json({msg: 'aid is missing'});

    // Créer boucle et supprimer tous les posts en utilisant
    // 'delete endpoint' de la route users.

    db.getConnection((err, connection) => {
        if(err) {
            console.error('could not get connection from pool.', err);
            return res.status(500).send();
        }

        connection.query('SELECT * FROM posts WHERE aid = ?', [aid], async (error, results, fields) => {
            if(error) {
                console.error('could not select.', error);
                return res.status(500).json({msg: 'database error'});
            }

            // TODO: Iterate over array and call `post_delete` to delete each post.

            for (let index = 0; index < results.length; index++) {
                try {
                    await post_delete(results[index].pid)
                    console.log('post successfully deleted');
                } catch (e) {
                    console.log('unable to delete this post');
                    console.log(e);
                }                
            }

            // DELETE ACCOUNT
            // DELETE FROM `accounts` WHERE `accounts`.`aid` = 5934622415

            connection.query('DELETE FROM accounts WHERE aid = ?', [aid], (error, results, fields) => {
                if(error) {
                    console.error('could not delete.', error);
                    return res.status(500).json({msg: 'database error'});
                }

                connection.release();
                return res.status(200).send();
            })


        })
    })

})

module.exports = router;