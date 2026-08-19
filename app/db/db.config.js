// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'bladeaxe.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Database opening error: ", err);
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT,
        email TEXT UNIQUE,
        password TEXT,
        isAdmin INTEGER DEFAULT 0
    )`);

    // Added contact and image columns
    db.run(`CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        title TEXT,
        description TEXT,
        price REAL,
        contact TEXT,
        image TEXT,
        FOREIGN KEY(userId) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        excerpt TEXT,
        body TEXT NOT NULL,
        coverImage TEXT,
        authorId INTEGER,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(authorId) REFERENCES users(id)
    )`);

    // Holds the single "live" copy of the editable site content as JSON.
    // Falls back to config/site.config.js defaults when empty (see app.js loadContent()).
    db.run(`CREATE TABLE IF NOT EXISTS site_content (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT
    )`);

    // Safe upgrade path for DBs created before isAdmin existed.
    // SQLite throws if the column already exists, so we check first.
    db.all(`PRAGMA table_info(users)`, [], (err, columns) => {
        if (err) return;
        const hasIsAdmin = columns.some(c => c.name === 'isAdmin');
        if (!hasIsAdmin) {
            db.run(`ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0`);
        }
    });
});

module.exports = db;