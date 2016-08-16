var Constants = require('../Constants');
var Utils = require('../Utils');

var shouldAddDummyFriend = false;

var dummyUserConnData = {};

dummyUserConnData['asdffdsa'] = {};
dummyUserConnData['asdffdsa2'] = {};

dummyUserConnData['asdffdsa'][Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = 'asdffdsa';
dummyUserConnData['asdffdsa'][Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {
    videoUrl : 'https://www.youtube.com/watch?v=hB-jBFDCd84',
    title    : 'My Darkest Days | The REAL Story Of Alpha M.',
    thumbnail_url : 'https://i.ytimg.com/vi/hB-jBFDCd84/hqdefault.jpg'
};
dummyUserConnData['asdffdsa2'][Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = 'asdffdsa2';
dummyUserConnData['asdffdsa2'][Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {
    videoUrl : 'https://www.youtube.com/watch?v=yemQEEPFJBM',
    title    : '17.- Heidegger on "Authenticity"',
    thumbnail_url : 'https://i.ytimg.com/vi/yemQEEPFJBM/hqdefault.jpg'
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

dummyUser.getDummyUserFriendData = function(googleUserId) {
    var dummyObjectFriendData = {
        "displayName": Constants.AppName + "_DummyUser",
        "etag":"\"xw0en60W6-NurXn4VBU-CMjSPEw/FK055O_WV2d36LkYqEc11YvRqUU\"",
        "id": googleUserId,
        "image":{"url":"https://lh4.googleusercontent.com/-ODjdRQ_Elgw/AAAAAAAAAAI/AAAAAAAAAIE/Lxsxh9IpCBY/photo.jpg?sz=50"},
        "kind":"plus#person",
        "objectType":"page",
        "url":"https://plus.google.com/" + googleUserId
    }
    return dummyObjectFriendData;
}

dummyUser.getConnData = function(googleUserId) {
    return dummyUserConnData[googleUserId];
}

dummyUser.setNewVideoData = function(googleUserId, newVideoUrl, newVideoTitle, newVideoThumbnail) {
    dummyUserConnData[googleUserId][Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {
        videoUrl : newVideoUrl,
        title : newVideoTitle,
        thumbnail_url : newVideoThumbnail
    }
};

dummyUser.sendDummyVidChangeToUser = function (googleUserId, ytVideoUrl, userSocket) {
    var pathParam = '/oembed?format=json&url=' + ytVideoUrl;
    var me = this;
    Utils.doGet('www.youtube.com', pathParam, function(response) {
        if (response) {
            var videoDetails = JSON.parse(response);
            var dataToSend = {};
            dataToSend.action = Constants.PossibleActions.takeFriendVideoChange;

            var friendVidChange = {};
            friendVidChange[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
            friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {
                videoUrl : ytVideoUrl,
                title : videoDetails.title,
                thumbnail_url : videoDetails.thumbnail_url
            };
            me.setNewVideoData(googleUserId, ytVideoUrl, videoDetails.title, videoDetails.thumbnail_url);

            dataToSend.friendChangedVideo = friendVidChange;
            
            userSocket.emit('message', dataToSend);
        }
    });
}

module.exports = dummyUser;
