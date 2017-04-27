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


var log = function(log) {
    if(config.dev) {
        if (log === '-') log = '------------------------------------------';
        console.log(log);
    }
};
exports.log = log;