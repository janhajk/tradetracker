var config = require(__dirname + '/../../config.js');
var utils  = require(__dirname + '/../../utils.js');
var market  = require(__dirname + '/markets.js');

var ratesRawGet = function(mysqlconnection, callback) {
   var url = 'https://www.bitstamp.net/api/v2/ticker_hour/btcusd/';
   var rates = require(__dirname + '/../rates.js');
   rates.request(url, function(e, data){
      if (config.dev) console.log(data);
      if (e) {
         utils.log(e);
         callback(e);
      }
      else {
         callback(null, {'BTC_USD':data}, mysqlconnection);
      }
   });
};

var ratesRaw2Object = function(ratesRaw, mysqlconnection, callback) {
   var tPair = market.pair;
   var cRates = [];
   for (let i in ratesRaw) {
      let r = ratesRaw[i];
      let pair = new tPair();
      let iPair = market.splitPair(i);
      // {"high": "1425.00", "last": "1419.99", "timestamp": "1493660529", "bid": "1418.01",
      // "vwap": "1370.34", "volume": "7604.50280261", "low": "1325.35", "ask": "1419.99", "open": "1348.88"}
      pair.pair         = iPair.base + '_' + iPair.counter; // TODO: escape string
      pair.mid          = 3; // poloniex has index "1"
      pair.cid          = 12;
      pair.timestamp    = Math.floor(new Date() / 1000);
      pair.last         = parseFloat(r.last);
      pair.lowestAsk    = parseFloat(r.ask);
      pair.highestBid   = parseFloat(r.bid);
      pair.baseVolume   = parseFloat(r.volume);
      pair.quoteVolume  = parseFloat(r.ywap);
      pair.high24h      = parseFloat(r.high);
      pair.low24h       = parseFloat(r.low);
      cRates.push(pair);
   }
   if (config.dev) console.log(cRates);
   callback(null, cRates, mysqlconnection);
};

var ratesGet = function(mode, mysqlconnection, callback){
   var async = require('async');
   var rates = require(__dirname + '/../rates.js');
   var asyncTasks = [
      function(callback){callback(null, mysqlconnection)},
      ratesRawGet,
      ratesRaw2Object,
      rates.addAid,
   ];
   if(mode==='write') asyncTasks.push(rates.toDb);
   async.waterfall(asyncTasks, function (err, rates) {
      callback(null, rates);
   });
};
exports.ratesGet = ratesGet;