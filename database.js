var config = require(__dirname + '/config.js');
var utils  = require(__dirname + '/utils.js');


/*
 * get one or all posoitions
 */
var getPositions = function(pid, connection, callback) {
   var q = 'SELECT * FROM positions';
   if(pid !== 'all') {
      pid = parseInt(pid, 10);
      q += ' WHERE pid = ' + pid;
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
exports.getPositions = getPositions;

var splitPair = function(pair) {
   var p = pair.split('_');
   return {
      name: p[0].toUpperCase() + '_' + p[1].toUpperCase(),
      base: p[0].toUpperCase(),
      counter: p[1].toUpperCase()
   };
};

var getAssetId = function(pair, mysqlconnection, callback){
   var query = '';
   query += 'SELECT * FROM assets WHERE ' +
            'base LIKE \'' + pair.base + '\' AND ' +
            'counter LIKE \'' + pair.counter + '\'' +
            'LIMIT 0,1';
   if (config.dev) utils.log(query);
   mysqlconnection.query(query, function(err, rowsStats) {
      if(err) {
         utils.log(err)
         callback(err);
      }
      else if (!rowsStats.length) {
         // Create new asset if non existent
         mysqlconnection.query('INSERT INTO assets SET ?', pair, function(e, results, fields){
            if (e) callback(e);
            if (config.dev) console.log(e);
            if (config.dev) console.log(results);
            callback(null, [{aid:results.insertId}]);
         });
      }
      else {
         utils.log(rowsStats);
         callback(null, rowsStats);
      }

   });
};

var updateRatesPoloniex = function(mysqlconnection, callback) {
   var async = require('async');
   var rates = require(__dirname + '/rates.js');
   rates.ratesPoloniexGet(function(e, rates){
      if (e) {
         utils.log(e);
         callback(e);
      }
      else {
         var cols = [];
         var insert = [];
         var cRates = [];
         for (let i in rates) {
            let r = rates[i];
            let pair = {
               'internId'  : r.id,
               'aid'       : 0,
               'pair'      : i,
               'market'    : 1,
               'timestamp' : Math.floor(new Date() / 1000),
               'last'      : r.last,
               'lowestAsk' : r.lowestAsk,
               'highestBid': r.highestBid,
               'baseVolume': r.baseVolume,
               'quoteVolume':r.quoteVolume,
               'high24h'   : r.high24hr,
               'low24h'    : r.low24hr,
               'percentChange':r.percentChange
            };
            cRates.push(pair);
         }
         for (let colName in cRates[0]) {
            cols.push(colName);
         }
         async.eachOfLimit(cRates, 1, function(item, key, cb){
            var pair = splitPair(item.pair);
            getAssetId(pair, mysqlconnection, function(e, row){
               if (e) {
                  // TODO: Error handling
               }
               else {
                  cRates[key].aid = row[0].aid;
               }
               cb();
            });
         // after all asset ids are added
         }, function(err){
            for (let i in cRates) {
               let val = [];
               for (let s in cRates[i]) {
                  val.push("'" + cRates[i][s] + "'");
               }
               insert.push('('+val.join(',')+')');
            }
            var query = 'INSERT INTO rates ('+cols.join(',')+') VALUES ' + insert.join(',');
            if (config.dev) console.log(query);
            mysqlconnection.query(query, function(e) {
               if(e) callback(e)
               else callback(null);
            });
         });

      }
   });

};
exports.updateRatesPoloniex = updateRatesPoloniex;