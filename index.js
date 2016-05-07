
var express = require("express");
var models = require('./models.js');
var tools = require('./userManager.js');
var Hashids = require('hashids');

// userId : socketObject
var connectedUsers = {};
//Contains Session objects ... each session object has a sessionId and a list of users
//var activeSessions = {};

var PossibleActions = {
  identifyUser : 'identifyUser',
  videoStateChange : 'videoStateChange',
  giveMeYourVideoState : 'giveMeYourVideoState',
  takeVideoState : 'takeVideoState',

  acknowledge : "acknowledge"
};
var YT_PlayerState = {
  PLAYING : 'PLAYING',
  PAUSED : 'PAUSED',
  ENDED : 'ENDED',
  CUED : 'CUED'
}

var app = express();
var port = 3700;
configureWebServer(app);

var server = app.listen(port);
console.log("Listening on port " + port);

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

      identifyConnectedClient(socket);

      socket.on('send', function (data) {
          console.log("Got a message: " + JSON.stringify(data));
          actOnClientMessage(socket, data);
      });
      socket.on('disconnect', function() {
        var userIdOfDisconnectedUser = socket.userId;
        console.log("Disconnected userId: " + userIdOfDisconnectedUser);
        delete connectedUsers[userIdOfDisconnectedUser];
      });
  });
}

function identifyConnectedClient(theSocket) {
  var hashidsObj = new Hashids("Some kind of salt");
  var timeInSeconds = new Date().getTime();
  var newUserId = hashidsObj.encode(timeInSeconds);

  theSocket.userId = newUserId;
  connectedUsers[newUserId] = theSocket;

  var dataToReplyWith = {};
  dataToReplyWith.userId = newUserId;
  dataToReplyWith.action = PossibleActions.identifyUser;

  theSocket.emit('message', dataToReplyWith);
}

function actOnClientMessage(socketToAClient, messageData) {
  var action = messageData.action || "";
  if (action != '') {
    var userIdCausingAction = messageData.userId;

    if(action === PossibleActions.identifyMyself) {
      connectedUsers[messageData.userId] = socketToAClient;
    } else if(action === PossibleActions.giveMeYourVideoState) {
      var theState = messageData.videoState;
      if(theState !== '') {
        var userIdOfWhoWantsVideoState = messageData.userIdOfWhoWantsIt;

        var socketToSendStateChangeTo = connectedUsers[userIdOfWhoWantsVideoState];
        if(socketToSendStateChangeTo && socketToSendStateChangeTo.connected) {

        }
      }
    } else if(action === PossibleActions.videoStateChange) {
      console.log("Got videoStateChange from client: " + messageData.userId);
      var theState = messageData.videoState;
      if(theState !== '') {
        actOnReceivingVideoStateChange(userIdCausingAction, theState, messageData.currentPlayTime);
      }
    }
  }
}

function actOnReceivingVideoStateChange(userIdCausingAction, theState, videoPlayTime) {
  for (var aUserId in connectedUsers) {
    if(connectedUsers.hasOwnProperty(aUserId)) {
      if(aUserId !== userIdCausingAction) {
        var socketToSendStateChangeTo = connectedUsers[aUserId];

        var dataToReplyWith = {};
        dataToReplyWith.action = PossibleActions.takeVideoState;
        dataToReplyWith.currentPlayTime = videoPlayTime;

        //player.seekTo(videoPlayTime, true):
        //YT_PlayerState.PLAYING, YT_PlayerState.PAUSED, YT_PlayerState.ENDED
        dataToReplyWith.videoState = theState;

        console.log("Will send videoStateChange to client: " + aUserId);
        socketToSendStateChangeTo.emit('message', dataToReplyWith);
      }
    }
  }
}
