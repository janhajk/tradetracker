var config = require(__dirname + '/../../config.js');
var utils  = require(__dirname + '/../../utils.js');
var market  = require(__dirname + '/markets.js');

var ratesRawGet = function(mysqlconnection, callback) {
   var url = 'https://bitgrail.com/api/v1/BTC-XRB/ticker';
   var rates = require(__dirname + '/../rates.js');
   rates.request(url, function(e, data){
      if (config.dev) console.log(data);
      if (e) {
         utils.log(e);
         callback(e);
      }
      else {
         callback(null, {'BTC_XRB':data.response}, mysqlconnection);
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
      // {"success":1,"response":{"last":"0.00006098","high":"0.00007164","low":"0.00004965",
      // "volume":"188.72162927","coinVolume":"3025380.63175435","bid":"0.00005903","ask":"0.00006099"}}
      pair.pair         = iPair.base + '_' + iPair.counter; // TODO: escape string
      pair.internId     = 'BTC-XRB';
      pair.mid          = 6; // poloniex has index "1"
      pair.cid          = 14;
      pair.timestamp    = Math.floor(new Date() / 1000);
      pair.last         = r.last;
      pair.lowestAsk    = r.ask;
      pair.highestBid   = r.bid;
      pair.baseVolume   = r.volume;
      pair.quoteVolume  = r.coinVolume;
      pair.high24h      = r.high;
      pair.low24h       = r.low;
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