var config = require(__dirname + '/../../config.js');
var utils  = require(__dirname + '/../../utils.js');
var market  = require(__dirname + '/markets.js');
var md5 = require('md5');


var baseUrl = 'https://www.okex.com/api/v1/future_userinfo_4fix.do'; // api_key, sign
var api_key = config.api.okex.key;
var api_secret = config.api.okex.secret;

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


var ratesRawGet = function(mysqlconnection, callback) {
   var sign = 'api_key='+ api_key + '&secret_key=' + api_secret;
   utils.log('String to be signed: ' + sign);
   var sign = md5(sign).toUpperCase();
   utils.log('Sign: ' + sign);
   var rates = require(__dirname + '/../rates.js');
   var options = {
      url: baseUrl,
      method: 'POST',
      json: true,
      body: {
         api_key: api_key,
         sign: sign}
   };
   utils.log(options);
   rates.request(options, function(e, data){
      if (config.dev) console.log(data);
      if (e) {
         console.log(e);
         callback(e);
      }
      else {
         utils.log('okex request returned:');
         utils.log(data);
         callback(null, {'BTC_OKEX':data}, mysqlconnection);
      }
   });
};
exports.raw = ratesRawGet;

var ratesRaw2Object = function(ratesRaw, mysqlconnection, callback) {
   var tPair = market.pair;
   var cRates = [];
   for (let i in ratesRaw) {
      let r = ratesRaw[i];
      let pair = new tPair();
      let iPair = market.splitPair(i);
      pair.pair         = iPair.base + '_' + iPair.counter; // TODO: escape string
      pair.mid          = 5; // poloniex has index "1"
      pair.cid          = 5;
      pair.timestamp    = Math.floor(new Date() / 1000);
      pair.last         = r.net_worth;
      pair.lowestAsk    = 0;
      pair.highestBid   = 0;
      pair.baseVolume   = 0;
      pair.quoteVolume  = 0;
      pair.high24h      = 0;
      pair.low24h       = 0;
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