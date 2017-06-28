var config  = require(__dirname + '/../../config.js');
var utils   = require(__dirname + '/../../utils.js');
var market  = require(__dirname + '/markets.js');

var apiURL = "https://www.okcoin.com/api/";
var apiURLFutures = "future_ticker.do?";

var pairs = {
   3: 'symbol=btc_usd&contractType=quarter',
   
};

/*
 * Return Values
 *
 * https://www.okcoin.com/api/future_ticker.do?symbol=btc_usd&contractType=quarter
 * > {"ticker":[{"buy":1434.4,"contractId":20170630013,"high":1458.0,"last":1434.49,"low":1370.76,"sell":1434.47,"unitAmount":100.0,"volume":1830440.0}]}
 */



var ratesGet = function(connection, callback) {
   var request = require("request");
   request(apiURL + apiURLFutures + 'symbol=btc_usd&contractType=quarter', function(e, response, body){
      if (error) {
         utils.log(e);
         callback(e);
      }
      else {
         let d = JSON.parse(body);
         d = d.ticker[0];
         let pair = market.pair();
         pair.pair         = 'BTC_USD';
         pair.mid          = 2;
         pair.cid          = 3;
         pair.internId     = d.contractId;
         pair.timestamp    = Math.floor(new Date() / 1000);
         pair.last         = parseFloat(d.last);
         pair.lowestAsk    = d.sell;
         pair.highestBid   = d.buy;
         pair.baseVolume   = d.volume;
         pair.high24h      = d.high;
         pair.low24h       = d.low;
         market.getAssetId(market.splitPair(pair.pair), connection, function(e, row){
            if (e) {
               utils.log(e);
               callback(e);
            }
            else {
               pair.aid = row[0].aid;
               callback(null, {3: pair});
            }
         });
      }
   });
};
exports.ratesGet = ratesGet;


var updateRates = function(mysqlconnection, callback) {
   var async = require('async');
   var tPair = market.pair;
   ratesGet(function(e, rates){
      if (e) {
         utils.log(e);
         callback(e);
      }
      else {
         if (config.dev) utils.log(rates);

         // Setup Columns for query
         var cols = [];
         for (let colName in new tPair()) {
            cols.push(colName);
         }

         var insert = [];
         let val = [];
         for (let s in pair) {
            val.push("'" + pair[s] + "'");
         }
         insert.push('('+val.join(',')+')');
         var query = 'INSERT INTO rates ('+cols.join(',')+') VALUES ' + insert.join(',');
         if (config.dev) utils.log(query);
         mysqlconnection.query(query, function(e) {
            if(e) callback(e)
            else callback(null);
         });

      }
   });

};
exports.updateRates = updateRates;