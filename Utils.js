var request = require('request');

var utils = {};

utils.doGet = function (hostParam, pathParam, callback) {
    request(hostParam + pathParam, function (error, response, body) {
        //console.log("Error: " + error + ", response: " + JSON.stringify(response));

        if (!error && response.statusCode == 200) {
            callback(body);
        } else {
            console.log('[Utils.js] ERROR or statusCode NOT 200. \n'
                + 'Error: ' + JSON.stringify(error) + ", response: " + JSON.stringify(response));
        }
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

// https://gist.github.com/takien/4077195
utils.getIdOfYoutubeVideo = function (videoUrl) {
    var id = '';
    videoUrl = videoUrl.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);

    if(videoUrl[2] !== undefined) {
        id = videoUrl[2].split(/[^0-9a-z_\-]/i);
        id = id[0];
    } else {
        id = videoUrl;
    }
    return id
}

module.exports = utils;
