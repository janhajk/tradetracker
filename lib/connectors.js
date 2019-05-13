var utils  = require(__dirname + '/../utils.js');
const dev = process.env.LOG;

/*
 * get one or all assets
 */
var get = function(id, connection, callback) {
   let q = 'SELECT * FROM connectors';
   if(id !== 'all') {
      id = parseInt(pid, 10);
      q += ' WHERE cid = ' + id;
   }
   if (dev) console.log(q);
   connection.query(q, function(err, rows) {
      if(err) {
         if (dev) console.log(err);
         callback(err);
      }
      else {
         if(dev) console.log(rows);
         callback(null, rows);
      }
   });
};
exports.get = get;