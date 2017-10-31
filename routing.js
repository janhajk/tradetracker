// User Config File
var config = require(__dirname + '/config.js');

var utils = require(__dirname + '/utils.js');
var auth = require(__dirname + '/auth.js');
var rates = require(__dirname + '/lib/rates.js');


// System
var path = require('path');
var fs = require('fs');


var basic = function(app, connection) {
    app.get('/', function(req, res) {
        fs.readFile(__dirname + '/public/index.html', 'utf-8', function(err, data) {
            res.send(data);
        });
    });

    app.get('/position', auth.ensureAuthenticated, function(req, res) {
        var positions = require(__dirname + '/lib/positions.js');
        positions.get('all', connection, function(e, data) {
            res.send(e ? e : data);
        });
    });

    app.get('/history', auth.ensureAuthenticated, function(req, res) {
        var history = require(__dirname + '/lib/history.js');
        history.get(function(e, data) {
            res.send(e ? e : data);
        });
    });

    app.get('/rates', auth.ensureAuthenticated, function(req, res) {
        // Get all rates live (mode=null); don't udpate db
        rates.all(null, connection, function(e, data) {
            res.send(e ? e : data);
        });
    });

    app.get('/position/:pid/edit', auth.ensureAuthenticated, function() {

    });

    app.get('/cron/:secret', function(req, res) {
        if(req.params.secret === config.cronSecret) {
            rates.all('write', connection, function(e) {
                if(e) res.send(e);
                else res.send('All rates successfully updated!');
            });
        } else {
            res.send('not authorized!');
        }
    });
};
exports.basic = basic;