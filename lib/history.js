var config = require(__dirname + '/../config.js');
var utils  = require(__dirname + '/../utils.js');
//var market  = require(__dirname + '/markets.js');
//var async = require('async');

// Database
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: config.sql.host,
    port: config.sql.port,
    user: config.sql.user, 
    password: config.sql.password,
    database: config.sql.database
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


