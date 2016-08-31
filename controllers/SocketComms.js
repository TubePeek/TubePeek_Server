var Constants = require('../Constants');
var Utils = require('../Utils');
var SocialIdentities = require('../dbAccess/SocialIdentities');
var UserInfoPersist = require('../dbAccess/UserInfoPersist');
var FriendExclusions = require('../dbAccess/FriendExclusions');

var MongoDb = require('../dbAccess/MongoDb');

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
    MongoDb.initialize();
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

socketComm.handleClientDisconnect = function(clientSocket, googleUserId) {
    var currentUser = connectedUsers[googleUserId];
    if(currentUser) {
        var dataToBroadcast = {};
        dataToBroadcast.action = Constants.PossibleActions.takeFriendOnlineStatus;
        dataToBroadcast[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
        dataToBroadcast.onlineState = false;

        var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
        clientSocket.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);

        delete connectedUsers[googleUserId];
        //delete _friendsMegaList[googleUserId];
        MongoDb.FriendsList.remove(googleUserId, function (isSuccessful) {
            console.time().info("MongoDb Friends delete: " + isSuccessful);
            broadcastOnlineStatus(clientSocket, false, googleUserId, roomToBroadcastTo);
        });
        //console.log("Is Connected to mongo db: " + MongoDb.isConnected());

        console.time().info("\n\nDisconnected User: googleUserId: " + googleUserId + "\n\n");
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
    console.time().info("\n\nGot social identity!\n");
    var authData = messageData.authData;

    UserInfoPersist.persist(authData, messageData.provider, function() {
        updateConnectedUsersData(socketToAClient, authData.uid, messageData.friends);
    });
}

function userChangedOnlineStatus (socketToAClient, messageData) {
    var googleUserId = messageData.googleUserId;
    var newUserOnlineState = messageData.onlineState;

    var currentUser = connectedUsers[googleUserId];
    if(currentUser) {
        var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];

        if(newUserOnlineState) {
            sociallyIdentifyYourself(socketToAClient, messageData);
        } else {
            delete connectedUsers[googleUserId];
            //delete _friendsMegaList[currentUserGoogleUserId];
            MongoDb.FriendsList.remove(googleUserId, function (isSuccessful) {
                console.time().info("MongoDb Friends delete: " + isSuccessful);
                broadcastOnlineStatus(socketToAClient, false, googleUserId, roomToBroadcastTo);
            });
        }
    } else if(newUserOnlineState) {
        sociallyIdentifyYourself(socketToAClient, messageData);
    }
}

function changedVideo (socketToAClient, messageData) {
    var googleUserId = messageData.googleUserId;
    var videoUrl = messageData.videoUrl;
    var pathParam = '/oembed?format=json&url=' + videoUrl;

    var currentUser = connectedUsers[googleUserId];
    if(currentUser) {
        Utils.doGet('http://www.youtube.com', pathParam, function(youtubeResponse) {
            var videoDetails = JSON.parse(youtubeResponse);
            currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {
                videoUrl : videoUrl,
                title : videoDetails.title,
                thumbnail_url : videoDetails.thumbnail_url
            };
            connectedUsers[googleUserId] = currentUser;
            //--
            var dataToBroadcast = {};
            dataToBroadcast.action = Constants.PossibleActions.takeFriendVideoChange;
            dataToBroadcast.friendChangedVideo = {};
            dataToBroadcast.friendChangedVideo[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
            dataToBroadcast.friendChangedVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO];

            var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
            console.time().info("Room to broadcast to: " + roomToBroadcastTo);
            socketToAClient.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);
        });
    } else {
        console.time().info("currentUser for : " + googleUserId + " is NULL.");
    }
}
//- End of core client actions

function updateConnectedUsersData(currentUserSocket, googleUserId, friendsList) {
    currentUserSocket[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;

    var connectedUserObj = {};
    connectedUserObj[Constants.CONN_DATA_KEYS.SOCKET_ID] = currentUserSocket.id;
    connectedUserObj[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
    connectedUserObj[Constants.CONN_DATA_KEYS.MY_ROOM] = "room_" + googleUserId;
    connectedUserObj[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {};
    connectedUsers[googleUserId] = connectedUserObj;

    FriendExclusions.getExclusionsForUser(googleUserId, function(exclusionsForUser) {
        if (exclusionsForUser && exclusionsForUser.length > 0) {
            for (var i = 0; i < exclusionsForUser.length; i++) {
                var anExclusion = exclusionsForUser[i];
                friendsList[anExclusion.friend_uid].isExcluded = true;
            }
        }
        //_friendsMegaList[googleUserId] = friendsList;

        MongoDb.FriendsList.add(googleUserId, friendsList, function (isSuccessful) {
            console.time().info("MongoDb Friends insert: " + isSuccessful);
            takeVideosBeingWatched(currentUserSocket, googleUserId, friendsList);
        });
    });
}

function takeVideosBeingWatched(currentUserSocket, googleUserId, friendsListWithExclusions) {
    var friendVideosOnYoutubeNow = addSocketToRooms_AlsoGetActiveFriendVids(currentUserSocket, googleUserId);
    var friendsWhoInstalledTubePeek = {};

    SocialIdentities.findAll(function(allSocialIdentities) {
        if(allSocialIdentities && allSocialIdentities.length > 0) {
            for(var i = 0; i < allSocialIdentities.length; i++) {
                var aSocialIdentity = allSocialIdentities[i];

                var foundFriend = friendsListWithExclusions[aSocialIdentity.uid];
                if(foundFriend) {
                    friendsWhoInstalledTubePeek[aSocialIdentity.uid] = foundFriend;
                }
            }
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

function broadcastOnlineStatus(clientSocket, onlineState, googleUserId, roomId) {
    var dataToBroadcast = {};
    dataToBroadcast.action = Constants.PossibleActions.takeFriendOnlineStatus;
    dataToBroadcast[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
    dataToBroadcast.onlineState = onlineState;

    clientSocket.broadcast.to(roomId).emit("message", dataToBroadcast);
}

function addSocketToRooms_AlsoGetActiveFriendVids (currentUserSocket, googleUserId) {
    var activeFriendVids = {};
    var currentUserConnData = connectedUsers[googleUserId];
    //var myFriendsList = _friendsMegaList[googleUserId];

    MongoDb.FriendsList.get(googleUserId, function (myFriendsList) {
        activeFriendVids = getActiveFriendVids (myFriendsList, function (friendGoogleUserId, isExcluded, friendRoom, friendSocketId) {
            var friendSocket = io.sockets.connected[friendSocketId];
            if(friendSocket) {
                friendSocket.join(currentUserConnData[Constants.CONN_DATA_KEYS.MY_ROOM]);
                if(!isExcluded) {
                    currentUserSocket.join(friendRoom);
                }
            }
        });
    });
    return activeFriendVids;
}

function getActiveFriendVids (myFriendsList, onEachConnectedFriend) {
    var activeFriendVids = {};
    var numFriends = myFriendsList.length;
    for(var i = 0; i < numFriends; i++) {
        var aFriendGoogleUserId = myFriendsList[i].googleUserId;

        var aFriendConnData = connectedUsers[aFriendGoogleUserId];
        if(aFriendConnData) {// If friend is connected now
            var aFriendVidData = aFriendConnData[Constants.CONN_DATA_KEYS.CURRENT_VIDEO];
            var aFriendVideoUrl = aFriendVidData.videoUrl;

            if (aFriendVideoUrl && aFriendVideoUrl.length > 0) {// If the friend has viewed an actual youtube video
                activeFriendVids[aFriendGoogleUserId] = {};
                activeFriendVids[aFriendGoogleUserId][Constants.CONN_DATA_KEYS.CURRENT_VIDEO] =  {
                    videoUrl : aFriendVideoUrl,
                    title : aFriendVidData.title,
                    thumbnail_url : aFriendVidData.thumbnail_url
                };
                activeFriendVids[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = aFriendGoogleUserId;
                onEachConnectedFriend(aFriendGoogleUserId, myFriendsList[i].isExcluded,
                    aFriendConnData[Constants.CONN_DATA_KEYS.MY_ROOM],
                    aFriendConnData[Constants.CONN_DATA_KEYS.SOCKET_ID]);
            }
        }
    }
    return activeFriendVids;
}

module.exports = socketComm;
