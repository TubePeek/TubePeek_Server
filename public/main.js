"use strict";

var player;
var socket;
//var gotFirstMsgFromServer = false;
var testYoutubeVideoId = "M7lc1UVf-VE";
var currentUserIdKey = 'currentUserId';

var PossibleActions = {
  identifyUser : 'identifyUser',
  videoStateChange : 'videoStateChange',
  giveMeYourVideoState : 'giveMeYourVideoState',
  takeVideoState : 'takeVideoState',
  //videoChangedByUser : 'videoChangedByUser',

  acknowledge : "acknowledge"
};
var YT_PlayerState = {
  PLAYING : 'PLAYING',
  PAUSED : 'PAUSED',
  ENDED : 'ENDED',
  CUED : 'CUED'
}


window.onload = function() {
    //socket = io.connect('http://192.168.8.10:3700');
    //socket = io.connect('http://' + document.domain + ':3700');
    socket = io.connect(document.location.href);

    socket.on('message', function (data) {
        if(data) {
          console.log("Got message from server: " + JSON.stringify(data))
          actOnServerMessage(data);
        } else {
            console.log("There is a problem!");
        }
    });

    initializeYoutubePlayer();
}

function initializeYoutubePlayer() {
    var tag = document.createElement('script');

    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '390',
    width: '640',
    videoId: testYoutubeVideoId,
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onError': youtubePlayerOnError
    }
  });
}

function onPlayerReady(event) {
  //Preventing playing the video immediately
  //event.target.playVideo();
}

function onPlayerStateChange(event) {
  console.log("Player state change!");

  var currentUserId = localStorage.getItem(currentUserIdKey);
  if(currentUserId) {
    var dataToReplyWith = {};
    dataToReplyWith.userId = currentUserId;
    //dataToReplyWith.sessionId = '';
    dataToReplyWith.action = PossibleActions.videoStateChange;
    dataToReplyWith.currentPlayTime = player.getCurrentTime();

    if(event.data == YT.PlayerState.PLAYING) {// 1
        dataToReplyWith.videoState = 'PLAYING';
    } else if(event.data == YT.PlayerState.PAUSED) {// 2
      dataToReplyWith.videoState = 'PAUSED';
    } else if(event.data == YT.PlayerState.ENDED) {
      dataToReplyWith.videoState = 'ENDED';
    } else if(event.data == YT.PlayerState.BUFFERING) {
      dataToReplyWith.videoState = 'BUFFERING';
    } else if(event.data == YT.PlayerState.CUED) {
      dataToReplyWith.videoState = 'CUED';
    }

    if(socket && socket.connected) {
      socket.emit('send', dataToReplyWith);
    }
  } else {
    console.log("currentUserId is null or empty")
  }
}

function youtubePlayerOnError(event) {
  if(event.data == 2 // Video id not ok
     || event.data == 100 //Not found
     || event.data == 101 || 150 // Not allowed for embeddeding
    ) {
    console.log("Gaddammit!!! A shiznit error occurred!");
  } else if(event.data == 5) {//Video not supported on HTML5
    console.log("Internet connection may be lost.");
  } else {
    console.log("An error still occurred. Don't know what happened.");
  }
  console.log(event.data);
}


function actOnServerMessage(messageData) {
  var action = messageData.action || "";
  var serverRequestArgs = messageData.requestArgs || ""

  if (action != "") {
    if(action == PossibleActions.identifyUser) {
      localStorage.setItem(currentUserIdKey, messageData.userId);

      console.log("userId for user set to: " + messageData.userId);
    } else if(action === PossibleActions.giveMeYourVideoState) {
      var dataToReplyWith = {};
      var currentUserId = localStorage.getItem(currentUserIdKey);
      dataToReplyWith.userId = currentUserId;

      var userIdOfWhoWantsIt = messageData.userIdOfWhoWantsIt;

      dataToReplyWith.videoPlayTime = '';
      dataToReplyWith.videoState = '';
      dataToReplyWith.action = action;

      if(socket && socket.connected)
        socket.emit('send', dataToReplyWith);
    } else if(action === PossibleActions.takeVideoState) {
        reflectGottenVideoStateHere(messageData);
    }
  }
}

function reflectGottenVideoStateHere(messageData) {
  console.log("Inside reflectGottenVideoStateHere");

  var videoState = messageData.videoState;
  if(videoState) {
    if(videoState === YT_PlayerState.PLAYING) {
      player.playVideo();
    } else if(videoState === YT_PlayerState.PAUSED) {
      player.pauseVideo();
    } else if(videoState === YT_PlayerState.ENDED) {
        player.stopVideo();
    }
    //player.seekTo(seconds:Number, allowSeekAhead:Boolean):Void
  }
}
