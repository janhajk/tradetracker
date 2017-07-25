var config = require(__dirname + '/../../config.js');
var utils  = require(__dirname + '/../../utils.js');

/* table: connectors
   cid   mid   type  name
   1 	   1 	   1 	   Poloniex
	2 	   1 	   2 	   Poloniex Margin
	3 	   2 	   3 	   OKCoin Contracts BTC Quarterly
	4 	   2 	   3 	   OKCoin Contracts LTC Quarterly
	5 	   5 	   1 	   1broker
	6 	   1 	   5 	   NXT Wallet
	7 	   1 	   6 	   Poloniex Loan
	8 	   1 	   5 	   wallet.counterwallet.io
	9 	   2 	   1 	   OKCoin
*/

var pair = function() {
   return {
      'internId'  : 0,
      'aid'       : 0,
      'pair'      : '',
      'mid'       : 0,
      'cid'       : 0,
      'timestamp' : Math.floor(new Date() / 1000),
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

 var markets = {
      'poloniex': {
         url:  function() { return 'https://poloniex.com/public?command=returnTicker'; },
         fData: function(data){return data},
         keys: {
            internId: 'id'
         },
         values: {
            mid: 1,
            cid: 1
         }
      },
      'bitstamp': {
         url: function() { return 'https://www.bitstamp.net/api/v2/ticker_hour/btcusd/'; },
         fData: function(data) {return {'BTC_USD':data}},
         keys:  {
            lowestAsk: 'ask',
            highestBid: 'bid',
            baseVolume: 'volume',
            quoteVolume: 'ywap',
            high24h : 'high',
            low24h: 'low'
         },
         values: {
            mid: 3,
            cid: 12
         }
      },
      '1broker': {
         url: function() {
            var baseUrl = 'https://1broker.com/api/v2/';
            var api_token = config.api['1broker'].key;
            return baseUrl + 'user/overview.php?token=' + api_token + '&pretty=1';
         },
         fData: function(data) {return {'BTC_1B':data.response}},
         keys: {
            last: 'net_worth'
         },
         values: {
            mid: 5,
            cid: 5
         }


      }/*,
      'okex': {
         file: 'okex.js'
      }*/
      /*
      'bitgrail': {
         file: 'bitgrail.js'
      },*/
   };
exports.markets = markets;


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