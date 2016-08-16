var Constants = require('../Constants');
var Utils = require('../Utils');
var SocialIdentities = require('../dbAccess/SocialIdentities');
var UserInfoPersist = require('../dbAccess/UserInfoPersist');

// Will contain objects, with a userEmail value pointing at an object
// The object will have keys: 'socketId', 'googleUserId', myRoom', 'videoData'
var connectedUsers = {};

//{{userEmail}} -> [{{actualFriendsList}}]
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
    //console.time().info("server received msg: " + JSON.stringify(data));
    var serverReaction = clientActionSelector[clientAction];

    if (typeof serverReaction == 'function') {
        serverReaction(socket, data); // Every action demands an equal and opposite reaction!
    } else {
        console.time().info("Can't find reaction for: " + clientAction + ". Now panic!");
    }
};

socketComm.handleClientDisconnect = function(clientSocket, userEmail) {
    var currentUser = connectedUsers[userEmail];
    if(currentUser) {
        var dataToBroadcast = {};
        dataToBroadcast.action = Constants.PossibleActions.takeFriendOnlineStatus;
        dataToBroadcast.userEmail = userEmail;
        dataToBroadcast[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
        dataToBroadcast.onlineState = false;

        var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
        clientSocket.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);
        delete connectedUsers[userEmail];
        delete _friendsMegaList[userEmail];
        console.time().info("\nDisconnected UserEmail: " + userEmail);
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
    console.time().info("\nIn sociallyIdentifyYourself! Got social identity!");
    var authData = messageData.authData;
    var socialProvider = messageData.provider;
    var friendsList = messageData.friendsList;

    UserInfoPersist.persist(authData, socialProvider, function() {
        updateConnectedUsersData(socketToAClient, authData.emailAddress, authData.uid, friendsList);
    });
}

function userChangedOnlineStatus (socketToAClient, messageData) {
    var userEmailCausingAction = messageData.userEmail;
    var newUserOnlineState = messageData.onlineState;
    var googleUserIdOfCurrentUser = '';
    var roomToBroadcastTo = '';

    var currentUser = connectedUsers[userEmailCausingAction];
    if(currentUser) {
        googleUserIdOfCurrentUser = currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
        roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];

        if(newUserOnlineState) {
            sociallyIdentifyYourself(socketToAClient, messageData);
        } else {
            delete connectedUsers[userEmailCausingAction];
            delete _friendsMegaList[userEmailCausingAction];
            broadcastOnlineStatus(socketToAClient, false, userEmailCausingAction, googleUserIdOfCurrentUser, roomToBroadcastTo);
        }
    } else if(newUserOnlineState) {
        sociallyIdentifyYourself(socketToAClient, messageData);
    }
}

function changedVideo (socketToAClient, messageData) {
    console.time().info("\nIn changedVideo! Got video change: \n" + JSON.stringify(messageData));
    var userEmail = messageData.userEmail;
    var videoUrl = messageData.videoUrl;

    var pathParam = '/oembed?format=json&url=' + messageData.videoUrl;
    Utils.doGet('www.youtube.com', pathParam, function(response) {
        console.time().info("\n\nCool! Got youtube video details:\n" + response + "\n\n");
        var videoDetails = JSON.parse(response);

        var currentUser = connectedUsers[userEmail];
        if(currentUser) {
            currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].videoUrl = videoUrl;
            currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].title = videoDetails.title;
            currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].thumbnail_url = videoDetails.thumbnail_url;

            connectedUsers[userEmail] = currentUser;
            //--
            var dataToBroadcast = {};
            dataToBroadcast.action = Constants.PossibleActions.takeFriendVideoChange;
            var friendVidChange = {};
            friendVidChange[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
            friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {};
            friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].videoUrl = videoUrl;
            friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].title = videoDetails.title;
            friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].thumbnail_url = videoDetails.thumbnail_url;
            dataToBroadcast.friendChangedVideo = friendVidChange;

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

    var connectedUserObj = {};
    connectedUserObj[Constants.CONN_DATA_KEYS.SOCKET_ID] = currentUserSocket.id;
    connectedUserObj[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
    connectedUserObj[Constants.CONN_DATA_KEYS.MY_ROOM] = "room_" + googleUserId;
    connectedUserObj[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {
        videoUrl : '',
        title    : '',
        thumbnail_url : ''
    };
    connectedUsers[userEmail] = connectedUserObj;

    if (dummyUser.shouldAddDummyFriend()) {
        friendsList.push(dummyUser.getDummyUserFriendData('asdffdsa'));
        friendsList.push(dummyUser.getDummyUserFriendData('asdffdsa2'));
    }
    _friendsMegaList[userEmail] = friendsList;
    takeVideosBeingWatched(currentUserSocket, userEmail, googleUserId, friendsList);
}

function takeVideosBeingWatched(currentUserSocket, userEmail, googleUserId, friendsList) {
    var friendVideosOnYoutubeNow = addSocketToRooms_AlsoGetActiveFriendVids(currentUserSocket, userEmail);

    var friendsWhoInstalledTubePeek = [];
    SocialIdentities.findAll(function(allSocialIdentities) {
        if(allSocialIdentities && allSocialIdentities.length > 0) {
            for(var i = 0; i < allSocialIdentities.length; i++) {
                var aSocialIdentity = allSocialIdentities[i];
                for(var j = 0; j < friendsList.length; j++) {
                    var aFriend = friendsList[j];
                    if(aFriend.id === aSocialIdentity.uid) {
                        console.log("Found a friend who has installed TubePeek.");
                        friendsWhoInstalledTubePeek.push(aFriend);
                    }
                }
            }
        }
        console.log("Number of friends on TubePeek: " + friendsWhoInstalledTubePeek.length);
        if (dummyUser.shouldAddDummyFriend()) {
            friendVideosOnYoutubeNow.push(dummyUser.getConnData('asdffdsa'));
            friendVideosOnYoutubeNow.push(dummyUser.getConnData('asdffdsa2'));
        }
        sendToUserAndFriends(friendVideosOnYoutubeNow, friendsWhoInstalledTubePeek);
    });
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

function addSocketToRooms_AlsoGetActiveFriendVids (currentUserSocket, userEmail) {
    var friendVideosOnYoutube = [];
    var currentUserConnData = connectedUsers[userEmail];
    var myFriendsList = _friendsMegaList[userEmail];

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
                        friendVideosOnYoutube.push(friendVideo);
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
