var utils = require(__dirname + '/../utils.js');


/*
 * get one or all assets
 */
var get = function(aid, connection, callback) {
   let q = 'SELECT * FROM assets';
   if (aid !== 'all') {
      aid = parseInt(aid, 10);
      q += ' WHERE aid = ' + aid;
   }
   utils.log(q);
   connection.query(q, function(err, rows) {
      if (err) {
         utils.log(err, 'fatal');
         callback(err);
      }
      else {
         utils.log(rows);

         // Add all historical data
         rates(aid, connection, function(e, data) {
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
   utils.log(q);
   connection.query(q, function(err, rows) {
      if (err) {
         utils.log(err, 'mysql');
         callback(err);
      }
      else {
         utils.log(rows);
         callback(null, rows);
      }
   });
};
exports.rates = rates;

/*
 * get last rate for asset
 */
var last = function(id, connection, callback) {
   utils.log('Trying to fetch "last" rate from asset with id=' + id, 'header');
   let q = 'SELECT * FROM rates ';
   id = parseInt(id, 10);
   q += 'WHERE aid = ' + id + ' ';
   q += 'AND timestamp = (SELECT MAX(timestamp) FROM rates WHERE aid = ' + id + ' GROUP BY aid)';
   q += 'LIMIT 1';
   utils.log(q);
   connection.query(q, function(err, rows) {
      if (err) {
         utils.log(err, 'mysql');
         callback(err);
      }
      else {
         utils.log(rows);
         callback(null, rows);
      }
   });
};
exports.last = last;
