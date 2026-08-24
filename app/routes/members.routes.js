const express = require('express');
const router = express.Router();
const db = require('../db/db.config.js');
const { rejects } = require('node:assert');
const { resolve } = require('node:dns');
const { title } = require('node:process');

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
}
function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
}

const SORT_OPTIONS = {
    joined: 'joinOrder ASC',
    messages_desc: 'messageTotal DESC',
    messages_asc: 'messageTotal ASC',
};

router.get('/members', async (req, res) => {
    const sort = SORT_OPTIONS[req.query.sort] ? req.query.sort : 'joined';

    const members = await dbAll(
        `SELECT id, uuid, discordUsername, discordAvatar, joinOrder, messageTotal, altAccountCount
        FROM users
        ORDER BY ${SORT_OPTIONS[sort]}` 
    );
    res.render('members', {title: 'obcave - members', members, sort});
});

router.get('/@:username', async (req, res, next) => {
    const member = await dbGet(
        `SELECT id, uuid, discordUsername, discordAvatar, joinOrder, messageTotal, altAccountCount
        FROM users
        WHERE LOWER(discordUsername) = LOWER(?)`,
        [req.params.username]
    );
    if (!member) return next();

    res.render('member-profile', {title: `obcave - @${member.discordUsername}`, member});
});

module.exports = router;