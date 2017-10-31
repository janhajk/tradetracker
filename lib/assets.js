var config = require(__dirname + '/../config.js');
var utils  = require(__dirname + '/../utils.js');


/*
 * get one or all assets
 */
var get = function(aid, connection, callback) {
   let q = 'SELECT * FROM assets';
   if(aid !== 'all') {
      aid = parseInt(aid, 10);
      q += ' WHERE aid = ' + aid;
   }
   if (config.dev) console.log(q);
   connection.query(q, function(err, rows) {
      if(err) {
         if (config.dev) console.log(err);
         callback(err);
      }
      else {
         if(config.dev) console.log(rows);

         // Add all historical data
         rates(aid, connection, function(e, data){
             rows[0].history = data;
             callback(null, rows);
         });
      }
   });
};
exports.get = get;

/*
 * get all rates for asset order newest first
 */
var rates = function(aid, connection, callback) {
   let q = 'SELECT * FROM rates ';
   aid = parseInt(aid, 10);
   q += 'WHERE aid = ' + aid + ' ';
   //q += 'AND timestamp >= ' + goback + ' ';
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