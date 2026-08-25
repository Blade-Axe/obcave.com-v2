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

    db.run(`CREATE TABLE IF NOT EXISTS themes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        creatorId INTEGER,
        colours TEXT NOT NULL,
        isPublished INTEGER DEFAULT 0,
        isBuiltIn INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(creatorId) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_theme_selection (
        userId INTEGER PRIMARY KEY,
        themeId INTEGER NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(themeId) REFERENCES themes(id)
    )`);

    // Seed the two built-in themes once. This check keeps it safe to
    // run every time the server starts.
    db.get('SELECT id FROM themes WHERE isBuiltIn = 1 LIMIT 1', (err, row) => {
        if (err || row) return;

        const crimson = JSON.stringify({}); // empty = use the stylesheet's current colours as-is

        db.run(
            `INSERT INTO themes (name, creatorId, colours, isPublished, isBuiltIn) VALUES
            ('Crimson (Default)', NULL, ?, 1, 1),`,
            [crimson]
        );
    });

});


module.exports = db;