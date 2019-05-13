const dev = process.env.LOG;

/*
 * get one or all posoitions
 */
var getPositions = function(pid, connection, callback) {
   var q = 'SELECT * FROM positions';
   if(pid !== 'all') {
      pid = parseInt(pid, 10);
      q += ' WHERE pid = ' + pid;
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
exports.getPositions = getPositions;



