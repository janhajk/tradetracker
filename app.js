// User Config File
var config = require(__dirname + '/config.js');
var utils  = require(__dirname + '/utils.js');

var dev = process.argv[2];
if (dev !== undefined && dev) {
    config.dev = true;
    utils.log('running in dev mode');
}



// System
var path = require('path');
var fs   = require('fs');

// Auth
var passport       = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// Database
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: config.sql.user,
    password: config.sql.password,
    database: config.sql.database
});

var rates = require(__dirname + '/lib/rates.js');

// Express
var express        = require('express');
var compression    = require('compression');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var cookieParser   = require('cookie-parser');
var session        = require('express-session');

var app            = express();
app.use(compression());
app.use(methodOverride());  // simulate DELETE and PUT
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(cookieParser());
app.use(session({
    secret: config.cookiesecret,
    proxy: true,
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static((path.join(__dirname, 'public'))));
app.listen(config.port, function () {
    utils.log('App runnung on port ' + config.port);
});

// Authentication
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});
passport.use(new GoogleStrategy({
    clientID: config.google.GOOGLE_CLIENT_ID,
    clientSecret: config.google.GOOGLE_CLIENT_SECRET,
    callbackURL: config.baseurl + '/auth/google/callback'
}, function(accessToken, refreshToken, profile, done) {
    utils.log(profile);
    process.nextTick(function() {
        if (profile.id === config.google.user) {
            utils.log('Login in user "' + profile.displayName + '"');
            return done(null, profile);
        }
        else {
            utils.log('User not authorised!');
            return done('user not authorised!');
        }
    });
}));

app.get('/auth/google', passport.authenticate('google', {scope: ['https://www.googleapis.com/auth/plus.login']}), function() {});
app.get('/auth/google/callback', passport.authenticate('google', {failureRedirect: '/'}), function(req, res) {
    res.redirect('/');
});
app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/');
}

// Router

app.get('/', function(req, res){
    fs.readFile(__dirname + '/public/index.html', 'utf-8', function (err, data){
        res.send(data);
    });
});


app.get('/position', ensureAuthenticated, function(req, res){
    var positions = require(__dirname + '/lib/positions.js');
    positions.get('all', connection, function(e, data){
        res.send(e?e:data);
    });
});

app.get('/history', ensureAuthenticated, function(req, res){
    var history = require(__dirname + '/lib/history.js');
    history.get(function(e, data){
        res.send(e?e:data);
    });
});

app.get('/rates', ensureAuthenticated, function(req, res){
    // Get all rates live (mode=null); don't udpate db
    rates.all(null, connection, function(error, data){
        res.send(e?e:data);
    });
});

app.get('/position/:pid/edit', ensureAuthenticated, function() {

});


app.get('/cron/:secret', function(req, res) {
    if (req.params.secret===config.cronSecret) {
        rates.all('write', connection, function(e){
            if (e) res.send(e);
            else res.send('All rates successfully updated!');
        });
    }
    else {
        res.send('not authorized!');
    }
});