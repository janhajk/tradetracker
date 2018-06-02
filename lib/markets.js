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
         quoteVolume: 'vwap',
         high24h : 'high',
         low24h: 'low'
      },
      values: {
         mid: 3,
         cid: 12
      }
   },
   'bitfinex': {
      url: function() { return {url:'https://api.bitfinex.com/v1/pubticker/iotbtc'}; },
      fData: function(data) {return {'BTC_IOTA':data}},
      keys:  {
         lowestAsk: 'ask',
         highestBid: 'bid',
         baseVolume: 'volume',
         quoteVolume: 'volume',
         high24h : 'high',
         low24h: 'low',
         last: 'last_price'
      },
      values: {
         mid: 10,
         cid: 16
      }
   },
   // ----------------
   // bittrex.com (all rates)
   // ----------------
   // {
   //  "MarketName": "BITCNY-BTC",
   //  "High": 23500,
   //  "Low": 2379.99999999,
   //  "Volume": 17.17950683,"Last": 23499.99999999,
   //  "BaseVolume": 292692.86647818,
   //  "TimeStamp": "2017-08-11T08:28:02.857",
   //  "Bid": 22701.00000002,
   //  "Ask": 23499.99999999,
   //  "OpenBuyOrders": 169,
   //  "OpenSellOrders": 66,
   //  "PrevDay": 23393.36999985,
   //  "Created": "2015-12-11T06:31:40.653"
   //}
   'bittrex': {
      url: function() { return {url:'https://bittrex.com/api/v1.1/public/getmarketsummaries'}; },
      fData: function(data) {
         var nData = {};
         for (let i = 0;i<data.result.length;i++) {
            nData[data.result[i].MarketName] = data.result[i];
         }
         return nData;
      },
      keys:  {
         last: 'Last',
         lowestAsk: 'Ask',
         highestBid: 'Bid',
         baseVolume: 'BaseVolume',
         quoteVolume: 'Volume',
         high24h : 'High',
         low24h: 'Low'
      },
      values: {
         mid: 9,
         cid: 15
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
   // {"success":1,"response":{"BTC":[{"market":"XRB\/BTC","last":"0.00003399","high":"0.00003400","low":"0.00001580",
   // "volume":"46.34292213","coinVolume":"2124440.80235292","bid":"0.00003399","ask":"0.00003389"},{"market":"DOGE\/BTC",
   // "last":"0.00000059","high":"0.00000061","low":"0.00000057","volume":"0.19885997","coinVolume":"342172.76466578",
   // "bid":"0.00000057","ask":"0.00000059"},{"market":"LTC\/BTC","last":"0.01300000","high":"0.01400000","low":"0.01300000",
   // "volume":"0.01537076","coinVolume":"1.13362561","bid":"0.00010001","ask":"0.01300000"},{"market":"CREA\/BTC",
   // "last":"0.00002690","high":"0.00002690","low":"0.00002690","volume":"0.00405381","coinVolume":"150.69940054",
   // "bid":"0.00002781","ask":"0.00006799"},{"market":"LSK\/BTC","last":"0.00071350","high":"0.00000000","low":"0.00000000",
   // "volume":"0.00000000","coinVolume":"0.00000000","bid":"0.00066000","ask":"0.00000000"},{"market":"CFT\/BTC",
   // "last":"0.00000334","high":"0.00000334","low":"0.00000334","volume":"0.00221612","coinVolume":"663.50809020",
   // "bid":"0.00000334","ask":"0.00000596"},{"market":"BCC\/BTC","last":"0.09989000","high":"0.09989000","low":"0.07300002",
   // "volume":"0.03019905","coinVolume":"0.36373641","bid":"0.08456020","ask":"0.09895602"}],"XRB":[{"market":"DOGE\/XRB",
   // "last":"0.01900000","high":"0.03800000","low":"0.01900000","volume":"2346.45365816","coinVolume":"76025.13014735",
   // "bid":"0.01500000","ask":"0.03020000"},{"market":"LTC\/XRB","last":"990.00000000","high":"990.00000000","low":"990.00000000",
   // "volume":"998.00399160","coinVolume":"1.00808484","bid":"1.00000000","ask":"825.00000000"},{"market":"CREA\/XRB",
   // "last":"0.00000000","high":"0.00000000","low":"0.00000000","volume":"0.00000000","coinVolume":"0.00000000","bid":"0.10000000",
   // "ask":"6.20000000"},{"market":"LSK\/XRB","last":"0.00000000","high":"0.00000000","low":"0.00000000","volume":"0.00000000",
   // "coinVolume":"0.00000000","bid":"0.00000100","ask":"0.00000000"},{"market":"CFT\/XRB","last":"0.99000000","high":"0.00000000",
   // "low":"0.00000000","volume":"0.00000000","coinVolume":"0.00000000","bid":"0.00000000","ask":"0.00000000"},{"market":"BCC\/XRB",
   // "last":"4301.00000000","high":"6050.00000000","low":"4301.00000000","volume":"2286.10589100","coinVolume":"0.47378191",
   // "bid":"3200.00000000","ask":"6000.00000000"}]}}
   'bitgrail': {
      url: function() {return {url:'https://bitgrail.com/api/v1/markets'}},
      fData: function(data) {return {'BTC_XRB':data.response.BTC[0]}},
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
   },
   'qryptos_sophiatx': {
      url: function() {return {url:'https://api.qryptos.com/products/48'}},
      fData: function(data) {return {'BTC_SPHTX':data}},
      keys: {
         last       : 'last_traded_price',
         baseVolume : 'volume_24h',
         quoteVolume: 'volume_24h',
         high24h    : 'high_market_ask',
         low24h     : 'low_market_bid'
      },
      values: {
         internId: 'SPHTXBTC',
         mid: 11,
         cid: 19
      }
   }
};
delete markets.bitgrail;
exports.markets = markets;


var splitPair = function(pair) {
   var p = pair.split(/[\-|_]/);
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