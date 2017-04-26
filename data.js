var config = require(__dirname + '/config.js');
var database = require(__dirname + '/database.js');

exports.get = function(mysqlconnection, callback){
   mysqlconnection.query('SELECT * FROM stats ORDER BY timestamp DESC', function(err, rowsStats) {
      if(err) throw err;
      console.log(rowsStats);
      database.getVideos(1, mysqlconnection, function(err, rows){
         if(err) {
            console.log(err);
            callback(err);
         }
         else {
            if (config.dev) console.log(rows);
            let videos = {};
            for (let i in rows) {
               videos[rows[i].yid] = rows[i];
            }
            callback(null, {stats:rowsStats, videos:videos});
         }
      });
   });
};