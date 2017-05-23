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