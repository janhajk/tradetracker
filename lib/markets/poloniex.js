var config = require(__dirname + '/../../config.js');
var utils  = require(__dirname + '/../../utils.js');
var market  = require(__dirname + '/markets.js');

var ratesRawGet = function(mysqlconnection, callback) {
   var url = 'https://poloniex.com/public?command=returnTicker';
   var rates = require(__dirname + '/../rates.js');
   rates.request(url, function(e, data){
      if (config.dev) console.log(data);
      if (e) {
         utils.log(e);
         callback(e);
      }
      else {
         callback(null, data, mysqlconnection);
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
      if (iPair.base==='USDT') iPair = market.mirrorPair(iPair); // Because poloniex has it wrong around for USDT markets
      pair.internId     = r.id;
      pair.pair         = iPair.base + '_' + iPair.counter; // TODO: escape string
      pair.mid          = 1; // poloniex has index "1"
      pair.timestamp    = Math.floor(new Date() / 1000);
      pair.last         = r.last;
      pair.lowestAsk    = r.lowestAsk;
      pair.highestBid   = r.highestBid;
      pair.baseVolume   = r.baseVolume;
      pair.quoteVolume  = r.quoteVolume;
      pair.high24h      = r.high24hr;
      pair.low24h       = r.low24hr;
      pair.percentChange= r.percentChange;
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