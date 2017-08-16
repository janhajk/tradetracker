var config = require(__dirname + '/../config.js');
var utils  = require(__dirname + '/../utils.js');
var market  = require(__dirname + '/markets.js');

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
        'last'      : ('last' in p)?p.last:0,
        'lowestAsk' : ('lowestAsk' in p)?p.lowestAsk:0,
        'highestBid': ('highestBid' in p)?p.highestBid:0,
        'baseVolume': ('baseVolume' in p)?p.baseVolume:0,
        'quoteVolume':('quoteVolume' in p)?p.quoteVolume:0,
        'high24h'   : ('high24h' in p)?p.high24h:0,
        'low24h'    : ('low24h' in p)?p.low24h:0,
        'percentChange':('percentChange' in p)?p.percentChange:0
    };
};


var request = function(url, callback) {
    var request = require('request');
    request(url, function(error, response, body){
        if (error) {
            utils.log(error);
            callback(error);
        }
        else {
            try {
                var data = JSON.parse(body);
                callback(null, data);
            } catch(e) {
                utils.log(e);
                callback(e);
            }
        }
    });
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
    var async = require('async');
    async.eachOfLimit(rates, 1, function(item, key, cb){
        var pair = market.splitPair(item.pair);
        market.getAssetId(pair, mysqlconnection, function(e, row){
            if (e) {
                utils.log(e);
                callback(e);
            }
            else {
                rates[key].aid = row[0].aid;
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
 */
var historical = function (rate, aid, cid, s, mysqlconnection, callback) {
    var cacheId = aid + cid + s;
    var cachedValue = historicalCache.get(cacheId);
    if ( cachedValue !== undefined ){
        utils.log('using cached value');
        callback(null, cachedValue);
        return;
    }
    rate = parseFloat(rate);
    aid = parseInt(aid);
    cid = parseInt(cid);
    s = parseInt(s);
    var timestamp = Math.floor(Date.now() / 1000) - s;
    var query = 'SELECT last FROM rates WHERE timestamp < ' + timestamp + ' and aid = '+aid+' and cid = '+cid+' ORDER BY timestamp DESC LIMIT 0,1';
    utils.log(query);
    mysqlconnection.query(query, function(e, rows) {
        if(e) {
            utils.log(e);
            callback(e);
        }
        else if (rows.length === 0) {
            var msg = 'no values found older than ' + Math.round(s/60/60) + ' h for aid=' + aid;
            utils.log(msg);
            historicalCache.set(cacheId, last);
            callback(msg);
        }
        else {
            utils.log(rows);
            var last = rows[0].last;
            historicalCache.set(cacheId, last);
            callback(null, last);
        }
    });
};

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
                callback(null, null);
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
                        pair[s] = r[keys[s]];
                    }
                    for (let s in values) {
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
    var async = require('async');
    var markets = market.markets;
    var tasks = {};
    // TODO: replace with async.each()
    for (let i in markets) {
        tasks[i] = function(callback) {ratesRawGet(i, markets[i], callback);};
    }
    async.parallel(tasks, function(e, rates){
        if (e) {
            utils.log('error in rates.all():');
            utils.log(e);
            callback(e);
        }
        else {
            let mergedRates = [];
            for (let i in rates) {
                for (let r in rates[i]) {
                    mergedRates.push(rates[i][r]);
                }
            }
            addAid(mergedRates, mysqlconnection, function(e, rates){
                if (e) callback(e);
                else {
                    if(mode==='write') toDb(rates, mysqlconnection, function(e, rates){
                        flushCache();
                        callback(null, rates);
                    });
                    else {
                        // add historical data over time
                        utils.log('adding historical data [1h]...', 'header');
                        async.each(rates, function(item, cb){
                            async.parallel([
                                function(cb2) {
                                    historical(item.last, item.aid, item.cid, 3600, mysqlconnection, function(e, hist){
                                        utils.log('adding historical value for aid=' + item.aid + '; value = ' + hist);
                                        item.last_1h = hist;
                                        cb2();
                                    });},
                                function(cb2) {
                                    historical(item.last, item.aid, item.cid, 3600*24, mysqlconnection, function(e, hist){
                                        utils.log('adding historical value for aid=' + item.aid + '; value = ' + hist);
                                        item.last_24h = hist;
                                        cb2();
                                    });}
                            ], function(e){
                                cb();
                            });
                        }, function(e){
                            callback(null, rates);
                        });
                    }
                }
            });
        }
    });
};
exports.all = all;