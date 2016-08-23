var Constants = require('../Constants');
var Utils = require('../Utils');
var SocialIdentities = require('../dbAccess/SocialIdentities');
var UserInfoPersist = require('../dbAccess/UserInfoPersist');

// Will contain objects, with a userEmail value pointing at an object
// The object will have keys: 'socketId', 'googleUserId', myRoom', 'videoData'
var connectedUsers = {};

//{{googleUserId}} -> {{actualFriends}}
var _friendsMegaList = {};

var console = null;
var io = null;
var dummyUser = null;

var socketComm = {};

var clientActionSelector = {
    'takeMySocialIdentity' : sociallyIdentifyYourself,
    'userChangedOnlineStatus' : userChangedOnlineStatus,
    'changedVideo' : changedVideo
};

socketComm.initialize = function(scribeConsole, socketIo, dummy) {
    console = scribeConsole;
    io = socketIo;
    dummyUser = dummy;
};

socketComm.handleClientMessage = function(socket, data) {
    var clientAction = data.action;
    var serverReaction = clientActionSelector[clientAction];

    if (typeof serverReaction == 'function') {
        serverReaction(socket, data); // Every action demands an equal and opposite reaction!
    } else {
        console.time().info("Can't find reaction for: " + clientAction + ". Now panic!");
    }
};

socketComm.handleClientDisconnect = function(clientSocket, userEmail, googleUserId) {
    var currentUser = connectedUsers[userEmail];
    if(currentUser) {
        var dataToBroadcast = {};
        dataToBroadcast.action = Constants.PossibleActions.takeFriendOnlineStatus;
        dataToBroadcast.userEmail = userEmail;
        dataToBroadcast[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
        dataToBroadcast.onlineState = false;

        var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
        clientSocket.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);

        delete connectedUsers[userEmail];
        delete _friendsMegaList[googleUserId];

        console.time().info("\n\nDisconnected User:\n");
        console.time().info("Email: " + userEmail + ", googleUserId: " + googleUserId + "\n\n");
    }
};

socketComm.sendRequestForIdentity = function (socket) {
    console.time().info("Inside sendRequestForIdentity");

    var initialDataToSend = {};
    initialDataToSend.action = Constants.PossibleActions.pleaseIdentifyYourself;
    socket.emit('message', initialDataToSend);
};

socketComm.sendDummyVidChangeToUser = function (googleUserId, ytVideoUrl, userEmail) {
    var userConnData = connectedUsers[userEmail];
    if (userConnData) {
        var userSocket = io.sockets.connected[userConnData[Constants.CONN_DATA_KEYS.SOCKET_ID]];
        if (userSocket) {
            dummyUser.sendDummyVidChangeToUser(googleUserId, ytVideoUrl, userSocket);
        }
    }
};

//--
function sociallyIdentifyYourself(socketToAClient, messageData) {
    //console.time().info("\nIn sociallyIdentifyYourself! Got social identity!\n" + JSON.stringify(messageData));
    var authData = messageData.authData;
    var socialProvider = messageData.provider;
    var friends = messageData.friends;

    UserInfoPersist.persist(authData, socialProvider, function() {
        updateConnectedUsersData(socketToAClient, authData.emailAddress, authData.uid, friends);
    });
}

function userChangedOnlineStatus (socketToAClient, messageData) {
    var userEmailCausingAction = messageData.userEmail;
    var newUserOnlineState = messageData.onlineState;
    var currentUserGoogleUserId = '';
    var roomToBroadcastTo = '';

    var currentUser = connectedUsers[userEmailCausingAction];
    if(currentUser) {
        currentUserGoogleUserId = currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
        roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];

        if(newUserOnlineState) {
            sociallyIdentifyYourself(socketToAClient, messageData);
        } else {
            delete connectedUsers[userEmailCausingAction];
            delete _friendsMegaList[currentUserGoogleUserId];
            broadcastOnlineStatus(socketToAClient, false, userEmailCausingAction, currentUserGoogleUserId, roomToBroadcastTo);
        }
    } else if(newUserOnlineState) {
        sociallyIdentifyYourself(socketToAClient, messageData);
    }
}

function changedVideo (socketToAClient, messageData) {
    var userEmail = messageData.userEmail;
    var videoUrl = messageData.videoUrl;
    var pathParam = '/oembed?format=json&url=' + videoUrl;

    Utils.doGet('http://www.youtube.com', pathParam, function(youtubeResponse) {
        var videoDetails = JSON.parse(youtubeResponse);

        var currentUser = connectedUsers[userEmail];
        if(currentUser) {
            currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {
                videoUrl : videoUrl,
                title : videoDetails.title,
                thumbnail_url : videoDetails.thumbnail_url
            };
            connectedUsers[userEmail] = currentUser;
            //--
            var dataToBroadcast = {};
            dataToBroadcast.action = Constants.PossibleActions.takeFriendVideoChange;
            dataToBroadcast.friendChangedVideo = {};
            dataToBroadcast.friendChangedVideo[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
            dataToBroadcast.friendChangedVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO];

            var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
            console.time().info("Room to broadcast to: " + roomToBroadcastTo);
            socketToAClient.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);
        } else {
            console.time().info("currentUser for : " + userEmail + " is NULL.");
        }
    });
}
//- End of core client actions

function updateConnectedUsersData(currentUserSocket, userEmail, googleUserId, friendsList) {
    currentUserSocket.userEmail = userEmail;
    currentUserSocket[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;

    var connectedUserObj = {};
    connectedUserObj[Constants.CONN_DATA_KEYS.SOCKET_ID] = currentUserSocket.id;
    connectedUserObj[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
    connectedUserObj[Constants.CONN_DATA_KEYS.MY_ROOM] = "room_" + googleUserId;
    connectedUserObj[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {};
    connectedUsers[userEmail] = connectedUserObj;

    if (dummyUser.shouldAddDummyFriend()) {
        friendsList['asdffdsa'] = dummyUser.getDummyUserFriendData('asdffdsa');
        friendsList['asdffdsa2'] = dummyUser.getDummyUserFriendData('asdffdsa2');
    }
    _friendsMegaList[googleUserId] = friendsList;
    takeVideosBeingWatched(currentUserSocket, userEmail, googleUserId, friendsList);
}

function takeVideosBeingWatched(currentUserSocket, userEmail, googleUserId, friendsList) {
    var friendVideosOnYoutubeNow = addSocketToRooms_AlsoGetActiveFriendVids(currentUserSocket, userEmail, googleUserId);
    var friendsWhoInstalledTubePeek = {};

    SocialIdentities.findAll(function(allSocialIdentities) {
        if(allSocialIdentities && allSocialIdentities.length > 0) {
            for(var i = 0; i < allSocialIdentities.length; i++) {
                var aSocialIdentity = allSocialIdentities[i];

                var foundFriend = friendsList[aSocialIdentity.uid];
                if(foundFriend) {
                    friendsWhoInstalledTubePeek[aSocialIdentity.uid] = foundFriend;
                }
            }
        }
        if (dummyUser.shouldAddDummyFriend()) {
            friendVideosOnYoutubeNow['asdffdsa'] = dummyUser.getConnData('asdffdsa');
            friendVideosOnYoutubeNow['asdffdsa2'] = dummyUser.getConnData('asdffdsa2');
        }
        sendToUserAndFriends(friendVideosOnYoutubeNow, friendsWhoInstalledTubePeek);
    });

    // variable hoisting
    var sendToUserAndFriends = function (friendVideosOnYoutubeNow, friendsWhoInstalledTubePeek) {
        var dataToReplyWith = {};
        dataToReplyWith.action = Constants.PossibleActions.takeVideosBeingWatched;
        dataToReplyWith.friendsOnYoutube = friendVideosOnYoutubeNow;
        dataToReplyWith.friendsOnTubePeek = friendsWhoInstalledTubePeek;

        currentUserSocket.emit('message', dataToReplyWith);
        //broadcastOnlineStatus(currentUserSocket, true, userEmail, googleUserId, "room_" + googleUserId);
    }
}

function broadcastOnlineStatus(clientSocket, onlineState, userEmail, googleUserId, roomId) {
    var dataToBroadcast = {};
    dataToBroadcast.action = Constants.PossibleActions.takeFriendOnlineStatus;
    dataToBroadcast.userEmail = userEmail;
    dataToBroadcast[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
    dataToBroadcast.onlineState = onlineState;

    clientSocket.broadcast.to(roomId).emit("message", dataToBroadcast);
}

function addSocketToRooms_AlsoGetActiveFriendVids (currentUserSocket, userEmail, googleUserId) {
    var friendVideosOnYoutube = {};
    var currentUserConnData = connectedUsers[userEmail];
    var myFriendsList = _friendsMegaList[googleUserId];

    for (var aPossibleFriendUserEmail in connectedUsers) {
        if(connectedUsers.hasOwnProperty(aPossibleFriendUserEmail)) {
            if (aPossibleFriendUserEmail !== userEmail) { //To skip myself
                var possibleFriendConnData = connectedUsers[aPossibleFriendUserEmail];
                var possibleFriendGoogleId = possibleFriendConnData[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];

                if(Utils.isMyGoogleFriend(myFriendsList, possibleFriendGoogleId)) {
                    var friendVideo = {};
                    friendVideo[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = possibleFriendConnData[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
                    friendVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {};

                    var aFriendVidData = possibleFriendConnData[Constants.CONN_DATA_KEYS.CURRENT_VIDEO];
                    var aFriendVideoUrl = aFriendVidData.videoUrl;
                    if (aFriendVideoUrl && aFriendVideoUrl.length > 0) {// If the friend has viewed an actual youtube video
                        friendVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].videoUrl = aFriendVideoUrl;
                        friendVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].title = aFriendVidData.title;
                        friendVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].thumbnail_url = aFriendVidData.thumbnail_url;
                        friendVideosOnYoutube[possibleFriendGoogleId] = friendVideo;
                    }

                    var friendSocket = io.sockets.connected[possibleFriendConnData[Constants.CONN_DATA_KEYS.SOCKET_ID]];
                    if(friendSocket) {
                        var myRoom = currentUserConnData[Constants.CONN_DATA_KEYS.MY_ROOM];
                        friendSocket.join(myRoom);

                        var myFriendsRoom = possibleFriendConnData[Constants.CONN_DATA_KEYS.MY_ROOM];
                        currentUserSocket.join(myFriendsRoom);
                    }
                }
            }
        }
    }
    return friendVideosOnYoutube;
}

module.exports = socketComm;
