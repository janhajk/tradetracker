const version = '3.0.0';
// Utils
var utils = require(__dirname + '/utils.js');

// ARGV
const PORT = process.env.APP_PORT;


// Routing
var routing = require(__dirname + '/routing.js');

// Auth
var auth = require(__dirname + '/auth.js');

// System
var path = require('path');


// Database
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: process.env.SQLHOST,
    port: process.env.SQLPORT,
    user: process.env.SQLUSER,
    password: process.env.SQLPSW,
    database: process.env.SQLDB
});

// Express
var express = require('express');
var compression = require('compression');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var session = require('express-session');

var app = express();
app.use(express.static((path.join(__dirname, 'public')))); // Public directory
app.use(compression());
app.use(methodOverride()); // simulate DELETE and PUT
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(cookieParser());
app.use(session({
    secret: process.env.COOKIESECRET,
    proxy: true,
    resave: true,
    saveUninitialized: true
}));

const http = require('http').Server(app);
var io = require('socket.io')(http);


// Auth-Routes
auth.routing(app);

// Routing
routing.basic(app, connection);
routing.io(io, connection);


http.listen(PORT, function() {
    console.log('App runnung on port ' + PORT);
    console.log('App Version: ' + version);
});