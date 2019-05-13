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

    app.get('/asset/:aid', auth.ensureAuthenticated, function(req, res) {
        var aid = req.params.aid;
        var assets = require(__dirname + '/lib/assets.js');
        assets.get(aid, connection, function(e, data) {
            res.send(e ? e : data);
        });
    });


    /**
     * 
     * Load all historical rates of an asset
     * between range from/to
     * 
     * 
     */
    app.get('/asset/:aid/historical/:cid/:from/:to', auth.ensureAuthenticated, function(req, res) {
        var aid = req.params.aid;
        var cid = req.params.cid;
        var from = req.params.from;
        var to = req.params.to;
        rates.historicalRange(aid, cid, from, to, connection, function(e, hist) {
            utils.log('retrieved historical value for range' + from + ' to ' + to);
            res.send(e ? e : hist);
        });
    });

    /**
     * 
     * Load historical rate from timeago
     * 
     * 
     */
    app.get('/asset/:aid/historical/:cid/:timeago', auth.ensureAuthenticated, function(req, res) {
        var aid = req.params.aid;
        var cid = req.params.cid;
        var timeago = req.params.timeago;
        var rates = require(__dirname + '/lib/rates.js');
        rates.historical(aid, cid, timeago, connection, function(e, hist) {
            utils.log('retrieved ' + parseInt(timeago / 3600, 10) + 'h historical value for aid=' + aid + '; value = ' + hist);
            res.send(e ? e : { v: Number(hist) });
        });
    });


    app.get('/position/:pid/edit', auth.ensureAuthenticated, function() {

    });

    app.get('/cron/:secret', function(req, res) {
        if (req.params.secret === config.cronSecret) {
            rates.all('write', connection, function(e) {
                if (e) res.send(e);
                else res.send('All rates successfully updated!');
            });
        }
        else {
            res.send('not authorized!');
        }
    });

    app.get('/ping', auth.ensureAuthenticated, function(req, res) {
        res.send('ok');

    });
};
exports.basic = basic;


var io = function(io, connection) {
    io.on('connection', function(socket) {
        socket.on('rates', function(msg) {
            io.emit('chat message', msg);
        });
    });
};
exports.io = io;
