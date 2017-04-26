var rates = {};

rates.poloniex = {};
rates.poloniex.ticker = {
   type: 'http_request',
   url: 'https://poloniex.com/public?command=returnTicker',
   parse: function(data){return(data);}
};

exports.rates = rates;

