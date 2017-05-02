var config = require(__dirname + '/../../config.js');
var utils  = require(__dirname + '/../../utils.js');
var market  = require(__dirname + '/markets.js');


var ratesGet = function(callback) {
   var request = require("request");
   request('https://www.bitstamp.net/api/v2/ticker_hour/btcusd/', function(error, response, body){
      if (error) {
         console.log(error);
         callback(error);
      }
      else {
         var data = JSON.parse(body);
         for (let i in data) {
         }
         callback(null, data);
      }
   });
};
exports.ratesGet = ratesGet;


var updateRates = function(mysqlconnection, callback) {
   var async = require('async');
   var tPair = require(__dirname + '/markets.js').pair;
   ratesGet(function(e, rate){
      if (e) {
         utils.log(e);
         callback(e);
      }
      else {
         if (config.dev) console.log(rate);
         let pair = new tPair();
         // {"high": "1425.00", "last": "1419.99", "timestamp": "1493660529", "bid": "1418.01",
         // "vwap": "1370.34", "volume": "7604.50280261", "low": "1325.35", "ask": "1419.99", "open": "1348.88"}
         pair.pair         = 'USD_BTC'; // TODO: escape string
         pair.mid          = 3; // poloniex has index "1"
         pair.timestamp    = Math.floor(new Date() / 1000);
         pair.last         = rate.last;
         pair.lowestAsk    = rate.ask;
         pair.highestBid   = rate.bid;
         pair.baseVolume   = rate.volume;
         pair.quoteVolume  = rate.ywap;
         pair.high24h      = rate.high;
         pair.low24h       = rate.low;
         if (config.dev) console.log(pair);

         // Setup Columns for query
         var cols = [];
         for (let colName in new tPair()) {
            cols.push(colName);
         }
         market.getAssetId(market.splitPair(pair.pair), mysqlconnection, function(e, row){
            if (e) {
               // TODO: Error handling
            }
            else {
               var insert = [];
               pair.aid = row[0].aid;
               let val = [];
               for (let s in pair) {
                  val.push("'" + pair[s] + "'");
               }
               insert.push('('+val.join(',')+')');
               var query = 'INSERT INTO rates ('+cols.join(',')+') VALUES ' + insert.join(',');
               if (config.dev) console.log(query);
               mysqlconnection.query(query, function(e) {
                  if(e) callback(e)
                  else callback(null);
               });
            }
         });
      }
   });

};
exports.updateRates = updateRates;