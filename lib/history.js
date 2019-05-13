var utils  = require(__dirname + '/../utils.js');
//var market  = require(__dirname + '/markets.js');
//var async = require('async');

// Database
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: process.env.SQLHOST,
    port: process.env.SQLPORT,
    user: process.env.SQLUSER,
    password: process.env.SQLPSW,
    database: process.env.SQLDB
});

/**
 * get all historical data
 */
var get = function(callback) {
    var query = 'SELECT DISTINCT timestamp, btc, dollar FROM history ORDER BY timestamp ASC';
    connection.query(query, function(e, data){
        if (e) {
            utils.log(e);
            callback(e);
        }
        else {
            callback(null, data);
        }
    });
};
exports.get = get;


