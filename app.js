var express = require('express');
var update = require(__dirname + '/update.js');
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


app.get('/data', function(req, res){
   var data = require(__dirname + '/data.js');
   data.get(connection, function(err, output){
      if (err) {
         res.send(err.message);
      }
      else {
         res.send(output);
      }
   });
});

app.get('/cron', function(req, res){
   update.update(connection, function(message){
      res.send(message);
   });
});

app.get('/new', function(req, res) {
   res.send('New Race created');
});


