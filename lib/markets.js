var config = require(__dirname + '/../config.js');
var utils  = require(__dirname + '/../utils.js');
var md5 = require('md5');

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

var markets = {
   // ----------------
   // Poloniex.com (all rates)
   // ----------------
   'poloniex': {
      url:  function() { return {url:'https://poloniex.com/public?command=returnTicker'}; },
      fData: function(data){return data},
      keys: {
         internId: 'id'
      },
      values: {
         mid: 1,
         cid: 1
      }
   },
   // ----------------
   // Bitstamp.net (BTC_USD)
   // ----------------
   // {"high": "1425.00", "last": "1419.99", "timestamp": "1493660529", "bid": "1418.01",
   // "vwap": "1370.34", "volume": "7604.50280261", "low": "1325.35", "ask": "1419.99", "open": "1348.88"}
   'bitstamp': {
      url: function() { return {url:'https://www.bitstamp.net/api/v2/ticker_hour/btcusd/'}; },
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
   // ----------------
   // 1Broker (user net worth)
   // ----------------
   '1broker': {
      url: function() {
         var baseUrl = 'https://1broker.com/api/v2/';
         var api_token = config.api['1broker'].key;
         return  {url: baseUrl + 'user/overview.php?token=' + api_token + '&pretty=1'};
      },
      fData: function(data) {return {'BTC_1B':data.response}},
      keys: {
         last: 'net_worth'
      },
      values: {
         mid: 5,
         cid: 5
      }


   },
   // ----------------
   // okex.com (user net worth BTC and LTC)
   // ----------------
   /* Return Value of API Call
      {
          "info": {
              "btc": {
                  "balance": 99.95468925,
                  "contracts": [
                      {
                          "available": 99.95468925,
                          "balance": 0.03779061,
                          "bond": 0,
                          "contract_id": 20140815012,
                          "contract_type": "this_week",
                          "freeze": 0,
                          "profit": -0.03779061,
                          "unprofit": 0
                      }
                  ],
                  "rights": 99.95468925
              },
              "ltc": {
                  "balance": 77,
                  "contracts": [
                      {
                          "available": 99.95468925,
                          "balance": 0.03779061,
                          "bond": 0,
                          "contract_id": 20140815012,
                          "contract_type": "this_week",
                          "freeze": 0,
                          "profit": -0.03779061,
                          "unprofit": 0
                      }
                  ],
                  "rights": 100
              }
          },
          "result": true
      }

   */
   'okex': {
      url: function() {
         var baseUrl = 'https://www.okex.com/api/v1/future_userinfo_4fix.do';
         var api_key = config.api.okex.key;
         var api_secret = config.api.okex.secret;
         var sign = 'api_key='+ api_key + '&secret_key=' + api_secret;
         utils.log('String to be signed: ' + sign);
         var sign = md5(sign).toUpperCase();
         utils.log('Sign: ' + sign);
         var options = {
            url: baseUrl,
            method: 'POST',
            form: {
               api_key: api_key,
               sign: sign}
         };
         utils.log('okex.js > ratesRawGet() > options: ');
         utils.log(options);
         return options;
      },
      fData: function(data) {return {'BTC_OKEX':[data.info.btc.rights], 'LTC_OKEX':[data.info.ltc.rights]}},
      keys: {last: 0},
      values: {
         mid: 8,
         cid: 3
      }
   },
   // ----------------
   // bitgrail (BTC_XRB)
   // ----------------
   // {"success":1,"response":{"last":"0.00006098","high":"0.00007164","low":"0.00004965",
   // "volume":"188.72162927","coinVolume":"3025380.63175435","bid":"0.00005903","ask":"0.00006099"}}
   'bitgrail': {
      url: function() {return {url:'https://bitgrail.com/api/v1/BTC-XRB/ticker'}},
      fData: function(data) {return {'BTC_XRB':data.response}},
      keys: {
         lowestAsk  : 'ask',
         highestBid : 'bid',
         baseVolume : 'volume',
         quoteVolume: 'coinVolume',
         high24h    : 'high',
         low24h     : 'low'
      },
      values: {
         internId: 'BTC-XRB',
         mid: 6,
         cid: 14
      }
   }
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