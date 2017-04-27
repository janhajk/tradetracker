var express = require('express');
var compression    = require('compression');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var path = require("path");
var config = require(__dirname + '/config.js');

var mysql = require('mysql');

var connection = mysql.createConnection({
  host: 'localhost',
  user: config.sql.user,
  password: config.sql.password,
  database: config.sql.database
});

var app = express();

app.use(compression());
app.use(methodOverride());  // simulate DELETE and PUT
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.static((path.join(__dirname, 'public'))));
app.listen(config.port, function () {
  console.log('App runnung on port ' + config.port);
});


app.get('/', function(req, res){
   fs.readFile(__dirname + '/public/index.html', 'utf-8', function (err, data){
      res.send(data);
   });
});


app.get('/rates/poloniex', function(req, res){
   var rates = require(__dirname + '/cron.rates.js');
   rates.ratesPoloniexGet(function(error, rates){
      if (error) res.send(error);
      else res.send(rates);
   });
});


app.get('/cron' function(req, res) {
   var databse = require(__dirname + '/database.js');
   database.updateRatesPoloniex(connection, function(e){
      if (e) res.send(e)
      else res.send('Rates updated!');
   });
});