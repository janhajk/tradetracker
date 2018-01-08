var config = require(__dirname + '/../config.js');
var utils  = require(__dirname + '/../utils.js');
var market  = require(__dirname + '/markets.js');
var async = require('async');

// Bypass cloudflare
var cloudscraper = require('cloudscraper');

// Cache for Database caching
// This was necessery due to too much load on cpu
const NodeCache = require( 'node-cache' );
const historicalCache = new NodeCache();

var flushCache = function() {
    historicalCache.flushAll();
};



var Pair = function(p) {
    return {
        'internId'  : ('internId' in p)?p.internId:0,
        'aid'       : 0,
        'pair'      : '',
        'mid'       : 0,
        'cid'       : 0,
        'timestamp' : Math.floor(new Date() / 1000),
        'last'      : ('last' in p)?Number(p.last):0,
        'lowestAsk' : ('lowestAsk' in p)?Number(p.lowestAsk):0,
        'highestBid': ('highestBid' in p)?Number(p.highestBid):0,
        'baseVolume': ('baseVolume' in p)?Number(p.baseVolume):0,
        'quoteVolume':('quoteVolume' in p)?Number(p.quoteVolume):0,
        'high24h'   : ('high24h' in p)?Number(p.high24h):0,
        'low24h'    : ('low24h' in p)?Number(p.low24h):0,
        'percentChange':('percentChange' in p)?Number(p.percentChange):0
    };
};


var request = function(url, callback) {
    var request = require('request');
    var tUrl = url.url;
    utils.log('starting Request ' + tUrl, 'header');
    request(url, function(e, response, body){
        if (e) {
            utils.log('error in request ' + tUrl);
            utils.log(e);
            callback(e);
        }
        else {
            utils.log('processing request-data for ' + tUrl);
            process(body, callback, -1);
        }
    });
    var process = function(data, cb, retries) {
        if (retries > 2) {
            cb('Not able to fetch request');
            return 0;
        }
        try {
            var d = JSON.parse(data);
            utils.log('successfully parsed JSON data for ' + tUrl);
            cb(null, d);
        } catch(e) {
            // Cloudflare Workaround
            utils.log('Cloudflare detected! Trying to use cloudscraper...');
            if (url.method === undefined) url.method = 'GET';
            cloudscraper.request(url, function(e, response, body) {
                if (e) {
                    utils.log('cloudscrapper failed');
                    cb(e);
                } else {
                    utils.log('cloudscraper success!');
                    process(body, cb, retries++);
                    return 0;
                }
            });
        }
    };
};

var last = function(aid, cid, connection, callback) {
    utils.log('Trying to fetch "last" rate from asset with id=' + aid + ' and cid=' + cid, 'header');
    var q = 'SELECT * FROM rates WHERE aid = ' + parseInt(aid , 10) + ' AND cid = ' + parseInt(cid , 10) + ' ORDER BY timestamp DESC LIMIT 0,1';
    connection.query(q, function(err, row) {
        if(err) {
            utils.log(err, 'mysql');
            callback(err);
        }
        else {
            utils.log(row);
            callback(null, row[0]);
        }
    });
};
exports.last = last;


/**
 * adds all aid to rates
 * @param {Array} rates list of rates
 * @param {Object} mysqlconnection
 * @param {Function} callback
 */
var addAid = function(rates, mysqlconnection, callback){
    async.eachOfLimit(rates, 1, function(item, key, cb){
        var pair = market.splitPair(item.pair);
        market.getAssetId(pair, mysqlconnection, function(e, row){
            if (e) {
                utils.log(e);
                callback(e);
            }
            else {
                rates[key].aid = Number(row[0].aid);
            }
            cb();
        });
    }, function(err){
        callback(null, rates, mysqlconnection);
    });
};

/**
 * Retrieve historical asset values in past x seconds for market y
 *
 * @param {Number}   rate  rate to compare against
 * @param {Number}   aid   Asset-id
 * @param {Number}   cid   Connector-Id
 * @param {Number}   s     seconds back to compare against
 * @param {Object}   mysqlconnection
 * @param {Function} callback
 *
 * @return {Number}        change in decimal-%
 *
 * How to choose correct historical value:
 *
 *  t0        t1        t2
 *  |         |         |
 *        |         |         |
 *        -2h      -1h       now
 *                        date.now()
 *                  |----s----|
 */
var historical = function(aid, cid, s, mysqlconnection, callback) {
    var cacheId = aid + '_' + cid + '_' + s;
    var cachedValue = historicalCache.get(cacheId);
    if ( cachedValue !== undefined ){
        utils.log('using cached value');
        callback(null, cachedValue);
        return;
    }
    aid = parseInt(aid);
    cid = parseInt(cid);
    s = parseInt(s);
    var timestamp = Math.floor(Date.now() / 1000) - s;
    var query = 'SELECT last FROM rates WHERE timestamp < ' + timestamp + ' and aid = '+aid+' ORDER BY timestamp DESC LIMIT 0,1';
    utils.log(query);
    mysqlconnection.query(query, function(e, rows) {
        if(e) {
            utils.log(e);
            callback(e);
        }
        else if (rows.length === 0) {
            var msg = 'no values found older than ' + Math.round(s/60/60) + ' h for aid=' + aid;
            utils.log(msg);
            historicalCache.set(cacheId, 0);
            callback(msg);
        }
        else {
            utils.log(rows);
            var last = Number(rows[0].last);
            historicalCache.set(cacheId, last);
            callback(null, last);
        }
    });
};
exports.historical = historical;

/**
 * copies array of rates into Database
 */
var toDb = function(rates, mysqlconnection, callback){
    var cols = [];
    let pair = new Pair({});
    for (let colName in pair) {
        cols.push(colName);
    }

    var insert = [];
    for (let i in rates) {
        let val = [];
        for (let s in rates[i]) {
            val.push("'" + rates[i][s] + "'");
        }
        insert.push('('+val.join(',')+')');
    }
    var query = 'INSERT INTO rates ('+cols.join(',')+') VALUES ' + insert.join(',');
    utils.log(query);
    mysqlconnection.query(query, function(e) {
        if(e) callback(e);
        else callback(null, rates);
    });
};

/**
 * Retrieve rates from a market
 *
 * @param {Object} m market Object
 * @param {Function} callback
 */
var ratesRawGet = function(title, m, callback) {
    return (function(title, url, fData, keys, values, callback) {
        var uri = url();
        request(uri, function(e, data){
            if (e) {
                utils.log(e);
                callback(null, null); // Don't stop programm on error
            }
            else {
                data = fData(data);
                utils.log(title + ': Rates raw (after fData)...', 'header');
                utils.log(data);
                var cRates = [];
                for (let i in data) {
                    let r = data[i];
                    let iPair = market.splitPair(i);
                    if (iPair.base==='USDT') iPair = market.mirrorPair(iPair); // Because poloniex has it wrong around for USDT markets
                    // Create default pair and try
                    // to fill it with values
                    // after fill in fix values and
                    // differing keys values
                    let pair = new Pair(r);
                    pair.pair = iPair.base + '_' + iPair.counter; // TODO: escape string
                    for (let s in keys) {
                        if (r[keys[s]] === Number(r[keys[s]]).toString()) r[keys[s]]=Number(r[keys[s]]);
                        pair[s] = r[keys[s]];
                    }
                    for (let s in values) {
                        if (values[s] === Number(values[s]).toString()) values[s]=Number(values[s]);
                        pair[s] = values[s];
                    }
                    // Push rates to array
                    cRates.push(pair);
                }
                utils.log(title + ': Rates compiled...', 'header');
                utils.log(cRates);
                callback(null, cRates);
            }
        });
    })(title, m.url, m.fData, m.keys, m.values, callback);
};

/**
 * Retrieve all Rates
 *
 * @param {String}   mode  mode='write' > write values to db
 *
 * @return {Array}   all rates
 */
var all = function(mode, mysqlconnection, callback) {
    var markets = market.markets;
    var tasks = {};
    // TODO: replace with async.each()
    for (let i in markets) {
        tasks[i] = function(callback) {
            ratesRawGet(i, markets[i], callback);
        };
    }
    // get all rates from markets
    // TODO: implement async.waterfall()
    async.parallel(tasks, function(e, rates){
        if (e) {
            utils.log('error in rates.all():');
            utils.log(e);
            callback(e);
        }
        else {
            // merge all rates into one array
            let mergedRates = [];
            for (let i in rates) {
                for (let r in rates[i]) {
                    mergedRates.push(rates[i][r]);
                }
            }
            // connect rates with database aid
            addAid(mergedRates, mysqlconnection, function(e, rates){
                if (e) callback(e);
                else {
                    if(mode==='write') toDb(rates, mysqlconnection, function(e, rates){
                        // Cron runs hourly, so flash every hour
                        flushCache();
                        callback(null, rates);
                    });
                    else {
                        callback(null, rates);
                    }
                }
            });
        }
    });
};
exports.all = all;