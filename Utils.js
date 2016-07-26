var http = require('http');

var utils = {};

utils.doGet = function (hostParam, pathParam, callback) {
    var options = {
        host: hostParam,
        path: pathParam
    };
    var req = http.get(options, function(res) {
        var bodyChunks = [];
        res.on('data', function(chunk) {
            bodyChunks.push(chunk);
        }).on('end', function() {
            var body = Buffer.concat(bodyChunks);
            callback(body);
        })
    });

    req.on('error', function(e) {
        console.log('ERROR: ' + e.message);
    });
}

utils.isMyGoogleFriend = function (myFriendsList, otherGoogleUserId) {
    for(var i = 0; i < myFriendsList.length; i++) {
        if(myFriendsList[i].id == otherGoogleUserId) {
            return true;
        } else if(i == myFriendsList.length - 1) {
            return false;
        }
    }
}

module.exports = utils;
