// app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

const configMiddleware = require('./middleware/config.middleware');
const { requireAuth, requireAdmin } = require('./middleware/auth.middleware');
const app = express();
const bcrypt = require('bcrypt');

// Database
const db = require('./db/db.config.js');
const siteConfig = require('./config/site.config');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

//global variables for views
app.use(configMiddleware);

// --- ROUTES ---
app.use('/', require('./routes/auth.routes'));
app.use('/', require('./routes/members.routes'));
app.use('/', require('./routes/pages.routes'));
app.use('/', require('./routes/themes.routes'));

// --- 404 ERROR HANDLING ---
app.use((req, res, next) => {
    res.status(404).render('404', { title: siteConfig.nopage.title });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));