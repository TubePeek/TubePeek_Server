var express = require("express");
var Hashids = require('hashids');
var Users = require('./models/Users');
var SocialIdentities = require('./models/SocialIdentities');

//--
//Will contain objects with key: userId and value: socketObject
var connectedUsers = {};

//Contains Session objects ... each session object has a sessionId and a list of users
//var activeSessions = {};

var PossibleActions = {
  identifyUser : 'identifyUser',                         // The server sends this to the client
  sociallyIdentifyYourself : 'sociallyIdentifyYourself', // The client sends this to the server.
  videoStateChange : 'videoStateChange',
  giveMeYourVideoState : 'giveMeYourVideoState',
  takeVideoState : 'takeVideoState',
  //videoChangedByUser : 'videoChangedByUser',
  //roomChange : 'roomChange',

  acknowledge : "acknowledge"
};
var YT_PlayerState = {
  PLAYING : 'PLAYING',
  PAUSED : 'PAUSED',
  ENDED : 'ENDED',
  CUED : 'CUED',
  SEEKING : 'SEEKING'
}

var app = express();
var port = 3700;
configureWebServer(app);

var server = app.listen(port);
console.log("Listening on port: " + port);

var io = require('socket.io').listen(server);
setupCommunications();

function configureWebServer(appObj) {
  appObj.set('views', __dirname + '/tpl');
  appObj.set('view engine', "jade");
  appObj.engine('jade', require('jade').__express);

  appObj.get("/", function(req, res){
      res.render("page");
  });
  appObj.use(express.static(__dirname + '/public'));
}

function setupCommunications() {
  io.sockets.on('connection', function (socket) {
      console.log("Got a connection");

      socket.on('send', function (data) {
          actOnClientMessage(socket, data);
      });
      socket.on('disconnect', function() {
        var userIdOfDisconnectedUser = socket.userId;
        delete connectedUsers[userIdOfDisconnectedUser];
        console.log("Disconnected userId: " + userIdOfDisconnectedUser);
      });
  });
}

// This sends a newly generated unique userId to the newly connected client
// function identifyConnectedClient(theSocket) {
//   var hashidsObj = new Hashids("Some kind of salt");
//   var timeInSeconds = new Date().getTime();
//   var newUserId = hashidsObj.encode(timeInSeconds);
//
//   theSocket.userId = newUserId;
//   connectedUsers[newUserId] = theSocket;
//
//   var dataToReplyWith = {};
//   dataToReplyWith.userId = newUserId;
//   dataToReplyWith.action = PossibleActions.identifyUser;
//
//   theSocket.emit('message', dataToReplyWith);
// }

//Here, I try to get video state from any other connected user
function newUserVideoStateInit(userIdOfWhoWantsVideoState) {
  for (var aUserId in connectedUsers) {
    if(connectedUsers.hasOwnProperty(aUserId)) {
      if(aUserId !== userIdOfWhoWantsVideoState) {
        var dataToReplyWith = {};
        dataToReplyWith.action = PossibleActions.giveMeYourVideoState;
        dataToReplyWith.userIdOfWhoWantsIt = userIdOfWhoWantsVideoState;

        var socketToAskForVideoState = connectedUsers[aUserId];
        if(socketToAskForVideoState && socketToAskForVideoState.connected) {
          socketToAskForVideoState.emit('message', dataToReplyWith);
          break;
        }
      }
    }
  }
}

function actOnClientMessage(socketToAClient, messageData) {
  var action = messageData.action || "";

  if (action != '') {
    if(action === PossibleActions.sociallyIdentifyYourself) {
      console.log("Got sociallyIdentifyYourself acknowledge from client: " + JSON.stringify(messageData));
      var authData = messageData.authData;
      var socialProvider = messageData.provider;

      persistSocialIdentity(socialProvider, authData);
    } else if(action === PossibleActions.giveMeYourVideoState) {
      var userIdCausingAction = messageData.userId;

      var userIdOfWhoWantsVideoState = messageData.userIdOfWhoWantsIt;
      var socketToSendStateTo = connectedUsers[userIdOfWhoWantsVideoState];

      if(socketToSendStateTo && socketToSendStateTo.connected) {
        var dataToReplyWith = {};
        dataToReplyWith.action = PossibleActions.takeVideoState;
        dataToReplyWith.currentPlayTime = messageData.currentPlayTime;
        dataToReplyWith.videoState = messageData.videoState;

        socketToSendStateTo.emit('message', dataToReplyWith);
      }
    } else if(action === PossibleActions.videoStateChange) {
      var userIdCausingAction = messageData.userId;
      var theState = messageData.videoState;

      var dataToReplyWith = {};
      dataToReplyWith.action = PossibleActions.takeVideoState;
      dataToReplyWith.currentPlayTime = messageData.currentPlayTime;
      dataToReplyWith.videoState = theState;

      socketToAClient.broadcast.emit('message', dataToReplyWith);
    }
  }

  function persistSocialIdentity(socialProvider, authData) {
      SocialIdentities.findByUserIdAndProvider(authData.userId, socialProvider, function(identitiesFound) {
          if(identitiesFound && identitiesFound.length > 0) {
              console.log("Found social identities with userId: " + authData.userId);
              console.log("identitiesFound: " + JSON.stringify(identitiesFound));

              for (var anIdentity in identitiesFound) {
                  if(anIdentity.provider === socialProvider) {
                      User.findBy('id', anIdentity['user_id'], function(usersFound){
                          if(usersFound) {
                              console.log("Found user!" + JSON.stringify(usersFound));

                          }
                      });
                      break;
                  }
              }
          } else {
              console.log("Got no social identities with userId: " + authData.userId);
              //SocialIdentities.insert([{'email_address': "garfunkel@gmail.com"}], function() {
          }
      });

      // var isAnAcknowledge = messageData.acknowledge;
      // if(isAnAcknowledge) {
      //     newUserVideoStateInit(messageData.userId);
      // }
  }
}
