var Constants = require('../Constants');
var Utils = require('../Utils');
var SocialIdentities = require('../dbAccess/SocialIdentities');
var UserInfoPersist = require('../dbAccess/UserInfoPersist');
var FriendExclusions = require('../dbAccess/FriendExclusions');

var MongoDb = require('../dbAccess/MongoDb');

// Will contain objects, with a google user id value pointing at an object
// The object will have keys: 'socketId', 'googleUserId', myRoom', 'videoData'
var connectedUsers = {};

var console = null;
var io = null;

var socketComm = {};

var clientActionSelector = {
    'takeMySocialIdentity' : sociallyIdentifyYourself,
    'userChangedOnlineStatus' : userChangedOnlineStatus,
    'changedVideo' : changedVideo
};

socketComm.initialize = function(scribeConsole, socketIo) {
    console = scribeConsole;
    io = socketIo;
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
        broadcastOnlineStatus(clientSocket, false, googleUserId, roomToBroadcastTo);
        //console.time().info("\n\nDisconnected User: googleUserId: " + googleUserId + "\n");
    }
};

socketComm.sendRequestForIdentity = function (socket) {
    var initialDataToSend = {};
    initialDataToSend.action = Constants.PossibleActions.pleaseIdentifyYourself;
    socket.emit('message', initialDataToSend);
};

//--
function sociallyIdentifyYourself(clientSocket, messageData) {
    console.time().info("\nGot social identity!\n");
    var authData = messageData.authData;

    UserInfoPersist.persist(authData, messageData.provider, function() {
        var googleUserId = authData.uid;
        clientSocket[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;

        var connectedUserObj = {};
        connectedUserObj[Constants.CONN_DATA_KEYS.SOCKET_ID] = clientSocket.id;
        connectedUserObj[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
        connectedUserObj[Constants.CONN_DATA_KEYS.MY_ROOM] = "room_" + googleUserId;
        connectedUserObj[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {};
        connectedUsers[googleUserId] = connectedUserObj;

        getExclusionsAndSendReply(clientSocket, authData.uid, authData.fullName, authData.imageUrl, messageData.friends);
    });
}

function userChangedOnlineStatus (socketToAClient, messageData) {
    var googleUserId = messageData.googleUserId;
    var newUserOnlineState = messageData.onlineState;

    var currentUser = connectedUsers[googleUserId];
    if(currentUser) {
        if(newUserOnlineState) {
            sociallyIdentifyYourself(socketToAClient, messageData);
        } else {
            delete connectedUsers[googleUserId];

            var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
            broadcastOnlineStatus(socketToAClient, false, googleUserId, roomToBroadcastTo);
        }
    } else if(newUserOnlineState) {
        sociallyIdentifyYourself(socketToAClient, messageData);
    }
}

function changedVideo (socketToAClient, messageData) {
    //console.time().info("Got video change! messageData: \n" + JSON.stringify(messageData));
    var googleUserId = messageData.googleUserId;
    var videoUrl = messageData.videoUrl;
    var pathParam = '/oembed?format=json&url=' + videoUrl;

    var currentUser = connectedUsers[googleUserId];
    if(currentUser) {
        Utils.doGet('http://www.youtube.com', pathParam, function(youtubeResponse) {
            // console.time().info("Got video details for video change.");
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
            dataToBroadcast.friendChangedVideo = {
                googleUserId : currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID],
                videoData : currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO]
            };
            var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
            socketToAClient.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);
        });
    }
}
//- End of core client actions

function getExclusionsAndSendReply(currentUserSocket, googleUserId, fullName, imageUrl, friendsList) {
    FriendExclusions.getExclusionsForUser(googleUserId, function(exclusionsForUser) {
        if (exclusionsForUser && exclusionsForUser.length > 0) {
            for (var i = 0; i < exclusionsForUser.length; ++i) {
                var anExclusion = exclusionsForUser[i];
                friendsList[anExclusion.friend_uid].isExcluded = true;
            }
        }

        MongoDb.FriendsList.addBulk(googleUserId, friendsList, function (friendsArrayFromDb) {
            if(friendsArrayFromDb) {
                sendVideosBeingWatched(currentUserSocket, googleUserId, fullName, imageUrl,
                    turnFriendsArrayToObject(friendsArrayFromDb));
            }
        });
    });
}

function turnFriendsArrayToObject(friendsArray) {
    var obj = {};
    for (var i = 0; i < friendsArray.length; ++i) {
        var friendObj = friendsArray[i];
        var friendGoogleUserId = friendObj.googleUserId;
        delete friendObj.googleUserId;

        obj[friendGoogleUserId] = friendObj;
    }
    return obj;
}

function sendVideosBeingWatched(currentUserSocket, googleUserId, fullName, imageUrl, friendsListWithExclusions) {
    getActiveFriendVids_AddSocketToRooms(currentUserSocket, googleUserId, function (friendVideosOnYoutubeNow) {
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

            var dataToReplyWith = {};
            dataToReplyWith.action = Constants.PossibleActions.takeVideosBeingWatched;
            dataToReplyWith.friendsOnYoutube = friendVideosOnYoutubeNow;
            dataToReplyWith.friendsOnTubePeek = friendsWhoInstalledTubePeek;

            currentUserSocket.emit('message', dataToReplyWith);
            addNewUserToFriendsListOfFriends(googleUserId, fullName, imageUrl, friendsWhoInstalledTubePeek);
            //broadcastOnlineStatus(currentUserSocket, true, userEmail, googleUserId, "room_" + googleUserId);
        });
    });
}

function addNewUserToFriendsListOfFriends (googleUserId, fullName, imageUrl, friendsWhoInstalledTubePeek) {
    Object.keys(friendsWhoInstalledTubePeek).forEach(function (aFriendGoogleUserId) {
        MongoDb.FriendsList.doesFriendExist(aFriendGoogleUserId, googleUserId, function (yes) {
            if (!yes) {
                addTheFriend(aFriendGoogleUserId);
            }
        });
    });
    var addTheFriend = function (aFriendGoogleUserId) {
        MongoDb.FriendsList.addOneFriend(aFriendGoogleUserId, googleUserId, fullName, imageUrl, function (wasInsertOk) {
            if(wasInsertOk) {
                var friendConnData = connectedUsers[aFriendGoogleUserId];
                if (friendConnData) {
                    var friendSocket = io.sockets.connected[friendConnData[Constants.CONN_DATA_KEYS.SOCKET_ID]];

                    if(friendSocket) {
                        var dataToSend = {};
                        dataToSend.action = Constants.PossibleActions.newFriendInstalledTubePeek;
                        dataToSend.friend = {
                            googleUserId : aFriendGoogleUserId,
                            fullName : fullName,
                            imageUrl : imageUrl,
                        };
                        friendSocket.emit('message', dataToSend);
                    }
                }
            }
        });
    }
}

function broadcastOnlineStatus(clientSocket, onlineState, googleUserId, roomId) {
    var dataToBroadcast = {};
    dataToBroadcast.action = Constants.PossibleActions.takeFriendOnlineStatus;
    dataToBroadcast[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
    dataToBroadcast.onlineState = onlineState;

    clientSocket.broadcast.to(roomId).emit("message", dataToBroadcast);
}

function getActiveFriendVids_AddSocketToRooms (currentUserSocket, googleUserId, continueWithActiveFriendVids) {
    var activeFriendVids = {};
    var currentUserConnData = connectedUsers[googleUserId];
    var currentUserRoom = currentUserConnData[Constants.CONN_DATA_KEYS.MY_ROOM];

    MongoDb.FriendsList.get(googleUserId, function (myFriendsList) {
        activeFriendVids = getActiveFriendVids (myFriendsList, function (friendSocketId, isExcluded, friendRoom) {
            var friendSocket = io.sockets.connected[friendSocketId];
            if(friendSocket) {
                friendSocket.join(currentUserRoom);
                if(!isExcluded) {// current User will NOT see activity of friend if friend is excluded
                    currentUserSocket.join(friendRoom);
                }
            }
        });
        continueWithActiveFriendVids(activeFriendVids);
    });
}

function getActiveFriendVids (myFriendsList, onEachConnectedFriend) {
    var activeFriendVids = {};
    var numFriends = myFriendsList.length;
    for(var i = 0; i < numFriends; ++i) {
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
                //Is this necessary?
                activeFriendVids[aFriendGoogleUserId][Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = aFriendGoogleUserId;
            }
            onEachConnectedFriend(aFriendConnData[Constants.CONN_DATA_KEYS.SOCKET_ID],
                myFriendsList[i].isExcluded, aFriendConnData[Constants.CONN_DATA_KEYS.MY_ROOM]);
        }
    }
    return activeFriendVids;
}

module.exports = socketComm;
