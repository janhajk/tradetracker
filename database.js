var utils = require(__dirname + '/utils.js');

/*
 * get one or all posoitions
 */
var getPositions = function(pid, connection, callback) {
   var q = 'SELECT * FROM positions';
   if(pid !== 'all') {
      pid = parseInt(pid, 10);
      q += ' WHERE pid = ' + pid;
   }
   console.log(q);
   connection.query(q, function(err, rows) {
      if(err) {
         utils.log(err, 'fatal');
         callback(err);
      }
      else {
         utils.log(rows);
         callback(null, rows);
      }
   });
};
exports.getPositions = getPositions;



