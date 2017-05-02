var config = require(__dirname + '/../../config.js');
var utils  = require(__dirname + '/../../utils.js');

var pair = function() {
   return {
      'internId'  : 0,
      'aid'       : 0,
      'pair'      : '',
      'mid'       : 0,
      'timestamp' : 0,
      'last'      : 0,
      'lowestAsk' : 0,
      'highestBid': 0,
      'baseVolume': 0,
      'quoteVolume':0,
      'high24h'   : 0,
      'low24h'    : 0,
      'percentChange':0
   }
};
exports.pair = pair;


var splitPair = function(pair) {
   var p = pair.split('_');
   return {
      name: p[0].toUpperCase() + '_' + p[1].toUpperCase(),
      base: p[0].toUpperCase(),
      counter: p[1].toUpperCase()
   };
};
exports.splitPair = splitPair;

var mirrorPair = function(pair) {
   return {name:pair.name, base:pair.counter, counter:pair.base};
};
exports.mirrorPair = mirrorPair;

var getAssetId = function(pair, mysqlconnection, callback){
   var query = '';
   query += 'SELECT * FROM assets WHERE ' +
            'base LIKE \'' + pair.base + '\' AND ' +
            'counter LIKE \'' + pair.counter + '\' ' +
            'LIMIT 0,1';
   if (config.dev) utils.log(query);
   mysqlconnection.query(query, function(err, rowsStats) {
      if(err) {
         utils.log(err)
         callback(err);
      }
      else if (!rowsStats.length) {
         // Create new asset if non existent
         mysqlconnection.query('INSERT INTO assets SET ?', pair, function(e, results, fields){
            if (e) callback(e);
            if (config.dev) console.log(e);
            if (config.dev) console.log(results);
            callback(null, [{aid:results.insertId}]);
         });
      }
      else {
         utils.log(rowsStats);
         callback(null, rowsStats);
      }

   });
};
exports.getAssetId = getAssetId;