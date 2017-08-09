var fs       = require('fs');
var path     = require('path');
var config   = require(__dirname + '/config.js');


var getContentFromMultipleUrls = function(urls, callback) {
    var request = require('request');
    var contents = [];
    var i;
    var fileCount = urls.length;
    var curFile = 0;
    for(i = 0; i < fileCount; i++) {
        request(urls[i].link, function(error, response, body) {
            contents.push(body);
            curFile++;
            if(curFile++ === fileCount) {
                var links = hosters.getAllLinksFromString(contents.join(' '));
                callback(links);
            }
        });
    }
};
exports.getContentFromMultipleUrls = getContentFromMultipleUrls;



var getFilesizeInBytes = function(filename) {
    return (fs.statSync(filename)).size;
};
exports.getFilesizeInBytes = getFilesizeInBytes;

/**
 * Log
 *
 * @param {String} log String to log; can also be object for dump
 * @param {String} type 'fatal'=always output, default=only in dev mode
 */
var log;
log = function(log, type) {
   if (log === '-') log = '------------------------------------------';
   else if (typeof log === 'string') {
      log = new Date().toLocaleString() + log;
   }
   if (type === 'header') {
      log('-');
   }
   if (type === 'fatal') {
      console.log(log);
   }
   else if(config.dev) {
      console.log(log);
   }
   if (type === 'header') {
      log('-');
   }
};
exports.log = log;



var flatten = function(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}