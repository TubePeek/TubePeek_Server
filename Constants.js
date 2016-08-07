
var constants = {};

// This is necessary so that I don't use magic strings everywhere
constants.CONN_DATA_KEYS = {
    SOCKET_ID : 'socketId',
    GOOGLE_USER_ID : 'googleUserId',
    MY_ROOM: 'myRoom',
    CURRENT_VIDEO: 'videoData'
};


constants.PossibleActions = {
    sociallyIdentifyYourself : 'sociallyIdentifyYourself',   // The client first sends this to the server
    takeVideosBeingWatched : 'takeVideosBeingWatched',       // The server then sends this to the client

    userChangedOnlineStatus : 'userChangedOnlineStatus',
    takeFriendOnlineStatus : 'takeFriendOnlineStatus',

    changedVideo : 'changedVideo',
    takeFriendVideoChange : 'takeFriendVideoChange',

    acknowledge : "acknowledge"
};

constants.SERVER_PORT = 3700;

module.exports = constants;
