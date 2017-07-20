var config = require(__dirname + '/../config.js');
var utils  = require(__dirname + '/../utils.js');


/*
 * get one or all assets
 */
var get = function(id, connection, callback) {
   let q = 'SELECT * FROM assets';
   if(id !== 'all') {
      id = parseInt(id, 10);
      q += ' WHERE aid = ' + id;
   }
   if (config.dev) console.log(q);
   connection.query(q, function(err, rows) {
      if(err) {
         if (config.dev) console.log(err);
         callback(err);
      }
      else {
         if(config.dev) console.log(rows);
         callback(null, rows);
      }
   });
};
exports.get = get;

/*
 * get all rates for asset order newet first
 */
var rates = function(id, connection, callback) {
   let q = 'SELECT * FROM rates ';
   id = parseInt(id, 10);
   q += 'WHERE aid = ' + id + ' ';
   q += 'ORDER BY timestamp DESC';
   if (config.dev) console.log(q);
   connection.query(q, function(err, rows) {
      if(err) {
         if (config.dev) console.log(err);
         callback(err);
      }
      else {
         if(config.dev) console.log(rows);
         callback(null, rows);
      }
   });
};
exports.rates = rates;

/*
 * get last rate for asset
 */
var last = function(id, connection, callback) {
   let q = 'SELECT * FROM rates ';
   id = parseInt(id, 10);
   q += 'WHERE aid = ' + id + ' ';
   q += 'ORDER BY timestamp DESC LIMIT 0,1';
   if (config.dev) console.log(q);
   connection.query(q, function(err, rows) {
      if(err) {
         if (config.dev) console.log(err);
         callback(err);
      }
      else {
         if(config.dev) console.log(rows);
         callback(null, rows);
      }
   });
};
exports.last = last;