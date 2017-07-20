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
         var data = JSON.parse(body);
         callback(null, data);
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
   /*var markets = {
      'poloniex': {
         file: 'poloniex.js'
      },
      'bitstamp': {
         file: 'bitstamp.js'
      },
      'bitgrail': {
         file: 'bitgrail.js'
      },
      '1broker': {
         file: '1broker.js'
      },
      'okex': {
         file: 'okex.js'
      }
   };
   var getter = [];
   for (let i in markets) {
      let app = require(__dirname + '/markets/' + markets[i].file);
      let f = function(callback) {
         app.ratesGet(mode, mysqlconnection, function(e, rates) {
            callback(null, rates);
         });
      }
      getter.push(f);
   }*/
   var polo = require(__dirname + '/markets/poloniex.js');
   var bitstamp = require(__dirname + '/markets/bitstamp.js');
   var bitgrail = require(__dirname + '/markets/bitgrail.js');
   var onebroker = require(__dirname + '/markets/1broker.js');
   var okex = require(__dirname + '/markets/okex.js');
   async.parallel({
      /*poloniex: function(callback) {
         polo.ratesGet(mode, mysqlconnection, function(e, rates) {
            callback(null, rates);
         });
      },
      bitstamp: function(callback) {
         bitstamp.ratesGet(mode, mysqlconnection, function(e, rates) {
            callback(null, rates);
         });
      },
      bitgrail: function(callback) {
         bitgrail.ratesGet(mode, mysqlconnection, function(e, rates) {
            callback(null, rates);
         });
      },
      onebroker: function(callback) {
         onebroker.ratesGet(mode, mysqlconnection, function(e, rates) {
            callback(null, rates);
         });
      },*/
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