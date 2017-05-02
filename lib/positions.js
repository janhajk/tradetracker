var config  = require(__dirname + '/../config.js');
var utils   = require(__dirname + '/../utils.js');
var assets  = require(__dirname + '/assets.js');



/*
 * get one or all posoitions
 */
var get = function(id, connection, callback) {
   var q = 'SELECT * FROM positions LEFT JOIN assets ON (positions.aid = assets.aid) LEFT JOIN connectors ON (positions.cid = connectors.cid)';
   if(id !== 'all') {
      id = parseInt(pid, 10);
      q += ' WHERE pid = ' + id;
   }
   q = ' ORDER BY aid ASC,mid ASC'
   if (config.dev) console.log(q);
   connection.query(q, function(err, rows) {
      if(err) {
         if (config.dev) console.log(err);
         callback(err);
      }
      else {
         if(config.dev) console.log(rows);
         var positions = rows;
         // Get last rates for each asset
         var async = require('async');
         async.eachOfLimit(rows, 1, function(item, key, cb){
            assets.rates(item.aid, connection, function(e, rows){
               if (e) {
                  // TODO: Error handling
               }
               else {
                  positions[key].rates = rows;
               }
               cb();
            });
         }, function(err){
            getBTC(3, connection, function(e, BTCRate){
               callback(null, {'BTC': {bitstamp:BTCRate}, positions: positions});
            });
         });
      }
   });
};
exports.get = get;


var getBTC = function(market, connection, callback) {
   if (market===undefined) market = 3; // 3 for poloniex
   var q = 'SELECT * FROM rates WHERE pair LIKE "BTC_USD" AND mid = '+market+' ORDER BY timestamp DESC LIMIT 0,1';
   connection.query(q, function(err, row) {
      if(err) {
         if (config.dev) console.log(err);
         callback(err);
      }
      else {
         if(config.dev) console.log(row);
         callback(null, row[0]);
      }
   });
};
exports.getBTC = getBTC;


