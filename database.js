var config = require(__dirname + '/config.js');
var utils  = require(__dirname + '/utils.js');


/*
 * get one or all posoitions
 */
var getPositions = function(pid, connection, callback) {
   var q = 'SELECT * FROM positions';
   if(pid !== 'all') {
      pid = parseInt(pid, 10);
      q += ' WHERE pid = ' + pid;
   }
   if (config.dev) console.log(q);
   connection.query(q, function(err, rows) {
      if(err) {
         if (config.dev) console.log(err);
         callback(err);
      }
      else {
         if(config.dev) console.log(rows);
         callback(null, rows);
      }
   });
};
exports.getPositions = getPositions;

var splitPair = function(pair) {
   var p = pair.split('_');
   return {
      name: p[0].toUpperCase() + '_' + p[1].toUpperCase(),
      base: p[0].toUpperCase(),
      counter: p[1].toUpperCase()
   };
};

var getAssetId = function(pair, mysqlconnection, callback){
   var query = '';
   query += 'SELECT * FROM assets WHERE ' +
            'base LIKE \'' + pair.base + '\' AND ' +
            'counter LIKE \'' + pair.counter + '\'' +
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

