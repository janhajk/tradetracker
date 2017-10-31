// User Config File
var config = require(__dirname + '/config.js');
// Utils
var utils  = require(__dirname + '/utils.js');

// DEV-Mode
var dev = process.argv[2];
if (dev !== undefined && dev) {
    config.dev = true;
    utils.log('running in dev mode');
}

// Routing
var routing = require(__dirname + '/routing.js');

// Auth
var auth = require(__dirname + '/auth.js');

// System
var path = require('path');
var fs   = require('fs');

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

// Public directory
app.use(express.static((path.join(__dirname, 'public'))));


// Auth-Routes
auth.routing(app);

// Routing
routing.basic(app, connection);


app.listen(config.port, function () {
    utils.log('App runnung on port ' + config.port);
});