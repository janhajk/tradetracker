var config = require(__dirname + '/../../config.js');
var utils  = require(__dirname + '/../../utils.js');
var market  = require(__dirname + '/markets.js');


var updateRates = function(mysqlconnection, callback) {
   var async = require('async');
   var rates = require(__dirname + '/../../rates.js');
   var tPair = require(__dirname + '/markets.js').pair;
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
            let pair = tPair;
               pair.internId     = r.id;
               pair.pair         = i; // TODO: escape string
               pair.market       = 1;
               pair.timestamp    = Math.floor(new Date() / 1000);
               pair.last         = r.last;
               pair.lowestAsk    = r.lowestAsk;
               pair.highestBid   = r.highestBid;
               pair.baseVolume   = r.baseVolume;
               pair.quoteVolume  =r.quoteVolume;
               pair.high24h      = r.high24hr;
               pair.low24h       = r.low24hr;
               pair.percentChange=r.percentChange;

            cRates.push(pair);
         }
         for (let colName in cRates[0]) {
            cols.push(colName);
         }
         async.eachOfLimit(cRates, 1, function(item, key, cb){
            var pair = market.splitPair(item.pair);
            market.getAssetId(pair, mysqlconnection, function(e, row){
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
exports.updateRates = updateRates;