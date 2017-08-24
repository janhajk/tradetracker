
// User Config File
var config = require(__dirname + '/config.js');
var utils  = require(__dirname + '/utils.js');

var pos = require(__dirname + '/lib/positions.js');

var dev = process.argv[2];
if (dev !== undefined && dev) {
    config.dev = true;
    utils.log('running in dev mode');
}

// Database
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: config.sql.user,
    password: config.sql.password,
    database: config.sql.database
});

var positions = [];
var btc = 0;
var ltc = 0;

/**
 * Position Object
 *
 * @param {Object} data position-data from Database JSON
 *
 */
var Position = function(data) {
    this.amount = Number(data.amount);
    this.last   = Number(data.rates[0].last);
    this.name = {
        base: data.base,
        counter: data.counter
    };
    this.stats = {
        totals: {
            btc: 0,
            usd: 0
        }
    };
};

/**
 * updates Total BTC & USD for Position
 */
Position.prototype.updateTotal = function(){
    // BTC
    this.stats.totals.btc = (this.name.base === 'BTC' && (this.name.counter).substring(0,3) !== 'USD')?this.last * this.amount:this.amount;
    if (this.name.base === 'LTC' && this.name.counter === 'OKEX') this.stats.totals.btc = this.last * ltc;
    // USD
    this.stats.totals.usd = this.stats.totals.btc * btc;
};

/**
 * Get Total of all positions
 */
var getTot = function() {
    let tot = {btc:0, usd:0};
    for (let i=0;i<positions.length;i++) {
        tot.btc += positions[i].stats.totals.btc;
        tot.usd += positions[i].stats.totals.usd;
    }
    return tot;
};


require(__dirname + '/lib/positions.js').get('all', connection, function(e, data){
    btc = data.BTC.bitstamp.last;
    ltc = data.LTC.poloniex.last;
    for (let i in data.positions) {
        let position = new Position(data.positions[i]);
        position.updateTotal();
        positions.push(position);
    }
    var tot = getTot();
    var values = [];
    values.push(new Date.getTime()/1000);
    values.push(tot.btc);
    values.push(tot.usd);
    var query = 'INSERT INTO history (timestamp, btc, dollar) VALUES (' + values.join(',') + ')';
    utils.log(query);
    if (dev !== 2) {
        connection.query(query, function(e) {
            utils.log('Erorr:');
            utils.log(e);
            process.exit();
        });
    }
    else {
        process.exit();
    }
});