var config  = require(__dirname + '/../config.js');
var utils   = require(__dirname + '/../utils.js');
var assets  = require(__dirname + '/assets.js');
var rates   = require(__dirname + '/rates');
var async   = require('async');


var position = function() {
   return {
      'pid'       : 0,
      'aid'       : 0,
      'cid'       : 0,
      'tid'       : 0,
      'amount'    : 0,
      'open'      : 0,
      'opentime'  : 0,
      'close'     : 0,
      'closetime' : 0
   }
};

/*
SELECT * FROM positions LEFT JOIN (SELECT rates.* FROM (SELECT MAX(rid) as rid FROM rates  GROUP BY CONCAT(aid, "-", cid)) as last LEFT JOIN rates ON (last.rid = rates.rid)) as lastrates ON (positions.aid = lastrates.aid)
*/



/*
 * get one or all posoitions
 */
var get = function(id, connection, callback) {
   var q = 'SELECT *, assets.name as assetname FROM positions LEFT JOIN assets ON (positions.aid = assets.aid) LEFT JOIN connectors ON (positions.cid = connectors.cid)';
   if(id !== 'all') {
      q += ' WHERE positions.pid = ' + parseInt(id, 10);
   }
   q += ' ORDER BY positions.aid ASC, connectors.name ASC';
   if (config.dev) utils.log(q);
   connection.query(q, function(err, rows) {
      if(err) {
         if (config.dev) utils.log(err);
         callback(err);
      }
      else {
         if(config.dev) utils.log(rows);
         var positions = rows;
         // Get last rates for each asset
         async.eachOfLimit(rows, 2, function(item, key, cb){
            assets.last(item.aid, connection, function(e, rows){
               if (e) {
                  // TODO: Error handling
               }
               else {
                  positions[key].rates = rows;
               }
               cb();
            });
         }, function(err){
             async.series({
                 BTC: function(cb){rates.last(110, 12, connection, cb);},
                 LTC: function(cb){rates.last(25,  1, connection, cb);}
             }, function(err, results){
                 callback(null, {'BTC': {bitstamp:results.BTC},'LTC': {poloniex:results.LTC}, positions: positions});
             });
         });
      }
   });
};
exports.get = get;


var update = function(id, values, connection, callback) {
   var cols = [];
   var vals = [];
   var pos = new position();
   for (let i in values) {
      if (typeof pos[i] !== 'undefined') {
         vals.push(values[i]);
         cols.push(i + ' = ?');
      }
      else {
         utils.log('Table Col ' + i + 'does not exist. Dropping.');
      }
   }
   var q = 'UPDATE positions SET ' + cols.join(', ') + ' WHERE pid = ?';
   if (config.dev) utils.log(q);
   vals.push(id);
   connection.query(q, function(err, results, fields) {
      if(err) {
         if (config.dev) utils.log(err);
         callback(err);
      }
      else {
         if(config.dev) utils.log(results);
         if(config.dev) utils.log(fields);
         callback(null);
      }
   });
};
exports.update = update;