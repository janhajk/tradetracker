var utils = require(__dirname + '/../utils.js');

/*
 * get one or all assets
 */
var get = function(id, connection, callback) {
   let q = 'SELECT * FROM connectors';
   if(id !== 'all') {
      id = parseInt(id, 10);
      q += ' WHERE cid = ' + id;
   }
   console.log(q);
   connection.query(q, function(err, rows) {
      if(err) {
         utils.log(err, 'mysql');
         callback(err);
      }
      else {
         utils.log(rows);
         callback(null, rows);
      }
   });
};
exports.get = get;