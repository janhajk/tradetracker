var config = require(__dirname + '/../config.js');
var utils  = require(__dirname + '/../utils.js');
var market  = require(__dirname + '/markets/markets.js');

var request = function(url, callback) {
   var request = require("request");
   request(url, function(error, response, body){
      if (error) {
         console.log(error);
         callback(error);
      }
      else {
            try {
               var data = JSON.parse(body);
               callback(null, data);
            } catch(e) {
               console.log(e);
               callback(e);
            }
      }
   });
};
exports.request = request;

// POST-Request
var prequest = function(options, callback) {
   var request = require("request");
   request(options, function(error, response, body){
      if (error) {
         console.log(error);
         callback(error);
      }
      else {
         var data = body;
         callback(null, data);
      }
   });
};
exports.prequest = prequest;


var addAid = function(rates, mysqlconnection, callback){
   var async = require('async');
   async.eachOfLimit(rates, 1, function(item, key, cb){
      var pair = market.splitPair(item.pair);
      market.getAssetId(pair, mysqlconnection, function(e, row){
         if (e) {
            callback(e);
         }
         else {
            rates[key].aid = row[0].aid;
         }
         cb();
      });
      // after all asset ids are added
   }, function(err){
      callback(null, rates, mysqlconnection);
   });
};
exports.addAid = addAid;

var toDb = function(rates, mysqlconnection, callback){
   var cols = [];
   let pair = new market.pair();
   for (let colName in pair) {
      cols.push(colName);
   }

   var insert = [];
   for (let i in rates) {
      let val = [];
      for (let s in rates[i]) {
         val.push("'" + rates[i][s] + "'");
      }
      insert.push('('+val.join(',')+')');
   }
   var query = 'INSERT INTO rates ('+cols.join(',')+') VALUES ' + insert.join(',');
   if (config.dev) console.log(query);
   mysqlconnection.query(query, function(e) {
      if(e) callback(e)
      else callback(null, rates);
   });
};
exports.toDb = toDb;

var all = function(mode, mysqlconnection, callback) {
   var async = require('async');
   var polo = require(__dirname + '/markets/poloniex.js');
   var bitstamp = require(__dirname + '/markets/bitstamp.js');
   var bitgrail = require(__dirname + '/markets/bitgrail.js');
   var onebroker = require(__dirname + '/markets/1broker.js');
   var okex = require(__dirname + '/markets/okex.js');
   async.parallel({
      poloniex: function(callback) {
         polo.ratesGet(mode, mysqlconnection, function(e, rates) {
            callback(null, rates);
         });
      },
      bitstamp: function(callback) {
         bitstamp.ratesGet(mode, mysqlconnection, function(e, rates) {
            callback(null, rates);
         });
      },/*
      bitgrail: function(callback) {
         bitgrail.ratesGet(mode, mysqlconnection, function(e, rates) {
            callback(null, rates);
         });
      },*/
      onebroker: function(callback) {
         onebroker.ratesGet(mode, mysqlconnection, function(e, rates) {
            callback(null, rates);
         });
      },
      okex: function(callback) {
         okex.ratesGet(mode, mysqlconnection, function(e, rates) {
            callback(null, rates);
         });
      }
   }, function(e, rates) {
      // TODO: Error handler
      if (e) {
         console.log('error in rates.all():');
         console.log(e);
         callback(e);
      }
      let mergedRates = [];
      for (let i in rates) {
         for (let r in rates[i]) {
            mergedRates.push(rates[i][r]);
         }
      }
      callback(null, mergedRates);
   });
};
exports.all = all;

var Pair = function(p) {
   return {
      'internId'  : (p.internId!==undefined)?p.internId:0,
      'aid'       : 0,
      'pair'      : '',
      'mid'       : 0,
      'cid'       : 0,
      'timestamp' : Math.floor(new Date() / 1000),
      'last'      : (p.last!==undefined)?p.last:0,
      'lowestAsk' : (p.lowestAsk!==undefined)?p.lowestAsk:0,
      'highestBid': (p.highestBid!==undefined)?p.highestBid:0,
      'baseVolume': (p.baseVolume!==undefined)?p.baseVolume:0,
      'quoteVolume':(p.quoteVolume!==undefined)?p.quoteVolume:0,
      'high24h'   : (p.high24h!==undefined)?p.high24h:0,
      'low24h'    : (p.low24h!==undefined)?p.low24h:0,
      'percentChange':(p.percentChange!==undefined)?p.percentChange:0
   }
};

var nall = function(mode, mysqlconnection, callback) {
   var async = require('async');
   var rates = require(__dirname + '/../rates.js');
   var markets = market.markets;

   var ratesRawGet = function(title, m, callback) {
      return (function(title, url, fData, tPair, callback) {
         var uri = url();
         rates.request(uri, function(e, data){
            if (config.dev) console.log(data);
            if (e) {
               console.log(e);
               callback(null, null);
            }
            else {
               data = fData(data);
               var cRates = [];
               for (let i in data) {
                  let r = data[i];
                  let iPair = market.splitPair(i);
                  if (iPair.base==='USDT') iPair = market.mirrorPair(iPair); // Because poloniex has it wrong around for USDT markets
                  let pair = new Pair();
                  pair.pair = iPair.base + '_' + iPair.counter; // TODO: escape string
                  for (let s in tPair) {
                     pair[s] = r[tPair[s]];
                  }
                  cRates.push(pair);
               }
               if (config.dev) console.log(cRates);
               callback(null, cRates);
            }
         });
      })(title, m.url, m.fData, m.pair, callback);
   };

   var tasks = {};
   for (let i in markets) {
      tasks[i] = ratesRawGet(i, markets[i], callback);
   }
   async.parallel(tasks, function(e, rates){
      // TODO: Error handler
      if (e) {
         console.log('error in rates.all():');
         console.log(e);
         callback(e);
      }
      let mergedRates = [];
      for (let i in rates) {
         for (let r in rates[i]) {
            mergedRates.push(rates[i][r]);
         }
      }
      // TODO: Add aid
      callback(null, mergedRates);
   });
};
exports.nall = nall;