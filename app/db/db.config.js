// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'obcave_data.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Database opening error: ", err);
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE,
        fullName TEXT,
        email TEXT UNIQUE,
        password TEXT,
        isAdmin INTEGER DEFAULT 0,
        discordId TEXT UNIQUE,
        discordUsername TEXT,
        discordAvatar TEXT,
        emailSet INTEGER DEFAULT 0,
        joinOrder INTEGER,
        messageTotal INTEGER DEFAULT 0,
        altAccountCount INTEGER DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS discord_alt_ids (
        altDiscordId TEXT PRIMARY KEY,
        userId INTEGER NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id)
    )`);

});


module.exports = db;