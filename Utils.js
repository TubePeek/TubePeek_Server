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

// http://stackoverflow.com/questions/10645994/node-js-how-to-format-a-date-string-in-utc
utils.dateFormat = function (date, fstr, utc) {
    utc = utc ? 'getUTC' : 'get';

    return fstr.replace (/%[YmdHMS]/g, function (m) {
        switch (m) {
            case '%Y': return date[utc + 'FullYear'] (); // no leading zeros required
            case '%m': m = 1 + date[utc + 'Month'] (); break;
            case '%d': m = date[utc + 'Date'] (); break;
            case '%H': m = date[utc + 'Hours'] (); break;
            case '%M': m = date[utc + 'Minutes'] (); break;
            case '%S': m = date[utc + 'Seconds'] (); break;

            default: return m.slice (1); // unknown code, remove %
        }
        // add leading zero if required
        return ('0' + m).slice (-2);
    });
}

module.exports = utils;
