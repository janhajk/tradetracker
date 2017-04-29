var config  = require(__dirname + '/../../config.js');
var utils   = require(__dirname + '/../../utils.js');
var assets  = require(__dirname + '/assets.js');



/*
 * get one or all posoitions
 */
var get = function(id, connection, callback) {
   var q = 'SELECT * FROM positions LEFT JOIN assets ON (positions.aid = assets.aid) LEFT JOIN connectors ON (positions.cid = connectors.cid)';
   if(id !== 'all') {
      id = parseInt(pid, 10);
      q += ' WHERE pid = ' + id;
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
exports.get = get;


