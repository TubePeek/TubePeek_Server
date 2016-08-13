var Constants = require('../Constants');
var Utils = require('../Utils');
var shouldAddDummyFriend = false;

// dummyUserEmail = 'dummyUser'
// Legitimate users will have legitimate emailAddress
// So this is safe to do
var dummyUserConnData = {};
//dummyUserConnData[Constants.CONN_DATA_KEYS.SOCKET_ID] = '';
dummyUserConnData[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = 'asdffdsa';
//dummyUserConnData[Constants.CONN_DATA_KEYS.MY_ROOM] = "room_asdffdsa";
dummyUserConnData[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {
    videoUrl : 'https://www.youtube.com/watch?v=hB-jBFDCd84',
    title    : 'My Darkest Days | The REAL Story Of Alpha M.',
    thumbnail_url : 'https://i.ytimg.com/vi/hB-jBFDCd84/hqdefault.jpg'
};

var dummyUser = {};

dummyUser.shouldAddDummyFriend = function() {
    return shouldAddDummyFriend;
}

dummyUser.enableDummyUser = function() {
    shouldAddDummyFriend = true;
};

dummyUser.disableDummyUser = function() {
    shouldAddDummyFriend = false;
};

dummyUser.getDummyUserFriendData = function() {
    var dummyObjectFriendData = {
        "displayName": Constants.AppName + "_DummyUser",
        "etag":"\"xw0en60W6-NurXn4VBU-CMjSPEw/FK055O_WV2d36LkYqEc11YvRqUU\"",
        "id":"asdffdsa",
        "image":{"url":"https://lh4.googleusercontent.com/-ODjdRQ_Elgw/AAAAAAAAAAI/AAAAAAAAAIE/Lxsxh9IpCBY/photo.jpg?sz=50"},
        "kind":"plus#person",
        "objectType":"page",
        "url":"https://plus.google.com/asdffdsa"
    }
    return dummyObjectFriendData;
}

dummyUser.getConnData = function() {
    //return dummyUserConnData[Constants.CONN_DATA_KEYS.CURRENT_VIDEO];
    return dummyUserConnData;
}

dummyUser.setNewVideoData = function(newVideoUrl, newVideoTitle, newVideoThumbnail) {
    dummyUserConnData[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {
        videoUrl : newVideoUrl,
        title : newVideoTitle,
        thumbnail_url : newVideoThumbnail
    }
};

dummyUser.sendDummyVidChangeToUser = function (ytVideoUrl, userSocket) {
    var pathParam = '/oembed?url=' + ytVideoUrl + '&format=json';
    var me = this;
    Utils.doGet('www.youtube.com', pathParam, function(response) {
        if (response) {
            var videoDetails = JSON.parse(response);
            var dataToSend = {};
            dataToSend.action = Constants.PossibleActions.takeFriendVideoChange;

            var friendVidChange = {};
            friendVidChange[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = 'asdffdsa';
            friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {
                videoUrl : ytVideoUrl,
                title : videoDetails.title,
                thumbnail_url : videoDetails.thumbnail_url
            };
            me.setNewVideoData(ytVideoUrl, videoDetails.title, videoDetails.thumbnail_url);

            dataToSend.friendChangedVideo = friendVidChange;
            userSocket.emit('message', dataToSend);
        }
    });
}

module.exports = dummyUser;
