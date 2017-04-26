var rates = require(__dirname + "/apis.js").rates;



var ratesPoloniexGet = function(callback) {
   var rates = rates.poloniex;
   var request = require("request");
   request(rates.ticker.url, function(error, response, body){
      if (error) {
         console.log(error);
         callback(error);
      }
      else {
         var data = JSON.parse(body);
         for (let i in data) {
            let
         }
         callback(null, data);
      }
   });
};