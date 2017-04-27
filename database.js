var config = require(__dirname + '/config.js');


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


var updateRatesPoloniex = function(connection, callback) {
   //if (config.dev) console.log(stats);
   var rates = require(__dirname + '/cron.rates.js');
   rates.ratesPoloniexGet(function(e, rates){
      if (e) callback(e);
      else {
         var cols = [];
         var insert = [];
         var cRates = [];
         for (let i in rates) {
            let r = rates[i];
            let pair = {
               "internId": r.id,
               "pair": i,
               "market": 1,
               "timestamp": Math.floor(new Date() / 1000),
               "last": r.last,
               "lowestAsk": r.lowestAsk,
               "highestBid": r.highestBid,
               "baseVolume": r.baseVolume,
               "quoteVolume": r.quoteVolume,
               "high24h": r.high24h,
               "low24h": r.low24h,
               "percentChange": r.percentChange
            };
            cRates.push(pair);
         }
         for (let colName in cRates[0]) {
            cols.push(colName);
         }
         for (let i in cRates) {
            let val = [];
            for (let s in cRates[i]) {
               val.push("'"+cRates[i][s]+"'");
            }
            insert.push('('+val.join(',')+')');
         }
         var query = 'INSERT INTO rates ('+cols.join(",")+') VALUES ' + insert.join(',');
         if (config.dev) console.log(query);
         connection.query(query, function(e) {
            if(e) callback(e)
            else callback(null);
         });
      }
   });

};
exports.updateRatesPoloniex = updateRatesPoloniex;