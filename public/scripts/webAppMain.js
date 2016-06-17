"use strict";

requirejs.config({
    baseUrl: 'scripts',
    app: {
        auth: '../auth'
    }
});

requirejs(['auth/socialsAuthMain'], function(social) {
    var player;
    var socket;
    //var testYoutubeVideoId = "M7lc1UVf-VE";
    var testYoutubeVideoId = "l-gQLqv9f4o";

    var currentUserIdKey = 'currentUserId';
    var shouldPlayerStateChangeBeSilent = false;
    var timeOfLastPlayerStateChange = new Date();

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
    };

    //--Keep track of authorization states for both providers.
    window.AuthStates = {
        google: null,
        facebook: null
    };

    //This will be called if the user authenticates with facebook or google successfully
    window.setAuthProvider = function(socialProvider, authData) {
        if (socialProvider === 'google') {// Signed in with Google, you can now use Google+ APIs.
            AuthStates.google = authData;
        } else if (socialProvider === 'facebook') {// Not signed in with Google, but signed in with Facebook
            AuthStates.facebook = authData;
        }
        var dataToReplyWith = {
            action : PossibleActions.sociallyIdentifyYourself,
            provider : socialProvider,
            authData : authData
        };
        if(socket && socket.connected) {
            socket.emit('send', dataToReplyWith);
        }
    }
    //--

    window.onload = function() {
        initializeYoutubePlayer();
    };

    function initializeYoutubePlayer() {
        var tag = document.createElement('script');

        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = function() {
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

    window.onPlayerReady = function(event) {
        socket = io.connect(document.location.href);

        socket.on('message', function (data) {
            if(data) {
                console.log("Got message from server: " + JSON.stringify(data))
                actOnServerMessage(data);
            } else {
                console.log("There is a problem in getting message from server!");
            }
        });
        timeTrackForUserSkippingInAVideo();
    }

    function timeTrackForUserSkippingInAVideo() {
        var lastTime = -1;
        var interval = 1000;

        var checkPlayerTime = function () {
            if (lastTime != -1) {
                if(player.getPlayerState() == YT.PlayerState.PLAYING ) {
                    var t = player.getCurrentTime();

                    if (Math.abs(t - lastTime - 1) > 0.5) {// there was a seek occuring
                        var event = {};
                        event.data = YT_PlayerState.SEEKING;
                        if(!shouldPlayerStateChangeBeSilent) {
                            onPlayerStateChange(event);
                            shouldPlayerStateChangeBeSilent = false;
                        }
                    }
                }
            }
            lastTime = player.getCurrentTime();
            setTimeout(checkPlayerTime, interval); /// repeat function call in 1 second
        }
        // initial call delayed so that when the video starts playing a skip is not recorded.
        // So that when the video starts playing a skip is not recorded
        setTimeout(checkPlayerTime, interval);
    }

    window.onPlayerStateChange = function(event) {
        console.log("In onPlayerStateChange method ... ");
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
            } else if(event.data == YT.PlayerState.CUED) {//5
                dataToReplyWith.videoState = 'CUED';
            } else if(event.data === YT_PlayerState.SEEKING) {
                dataToReplyWith.videoState = YT_PlayerState.SEEKING;
                console.log("Video has been seeked!");
            }
            // An attempt to prevent sending data to the server when the state
            // of the player is robotically influenced
            if(shouldPlayerStateChangeBeSilent) {
                setTimeout(function() {
                    shouldPlayerStateChangeBeSilent = false;
                }, 3000);
            } else if(socket && socket.connected) {
                var secondsSinceLastPlayerStateChange = getSecondsDiff(timeOfLastPlayerStateChange, new Date());
                if(secondsSinceLastPlayerStateChange > 3) {
                    socket.emit('send', dataToReplyWith);
                    secondsSinceLastPlayerStateChange = new Date();
                } else {
                    console.log("3 seconds need to pass before sending state change");
                }
            }
        } else {
            console.log("currentUserId is null or empty");
        }

        function getSecondsDiff(beforeDate, afterDate) {
            var result = (afterDate - beforeDate) / 1000;
            return result;
        }
    }

    window.youtubePlayerOnError = function(event) {
        if(event.data == 2 || event.data == 100 || event.data == 101) {
            console.log("Gaddammit!!! A shiznit error occurred!");
        } else if(event.data == 5) {//Video not supported on HTML5
            console.log("Internet connection may be lost.");
        } else {
            console.log("An error still occurred. Don't know what happened.");
        }
    }

    function actOnServerMessage(messageData) {
        var action = messageData.action || "";
        var serverRequestArgs = messageData.requestArgs || ""

        if(action == PossibleActions.identifyUser) {
            localStorage.setItem(currentUserIdKey, messageData.userId);
            console.log("userId for user set to: " + messageData.userId);
        } else if(action === PossibleActions.giveMeYourVideoState) {
            giveTheServerYourState(messageData, action, socket);
        } else if(action === PossibleActions.takeVideoState) {
            reflectGottenVideoState(messageData);
        }
    }

    function giveTheServerYourState(messageData, action, socket) {
        var dataToReplyWith = {};

        var currentUserId = localStorage.getItem(currentUserIdKey);
        dataToReplyWith.userId = currentUserId;

        dataToReplyWith.action = action;
        dataToReplyWith.userIdOfWhoWantsIt = messageData.userIdOfWhoWantsIt;
        dataToReplyWith.videoState = getVideoStateAsString(player.getPlayerState());
        dataToReplyWith.currentPlayTime = player.getCurrentTime();

        if(socket && socket.connected) {
            socket.emit('send', dataToReplyWith);
            console.log("Video state sent to server: " + JSON.stringify(dataToReplyWith));
        }
    }

    function reflectGottenVideoState(messageData) {
        console.log("Inside reflectGottenVideoStateHere");

        var videoState = messageData.videoState;
        shouldPlayerStateChangeBeSilent = true;
        timeOfLastPlayerStateChange = new Date();

        player.removeEventListener("onStateChange", "window.onPlayerStateChange");

        if(videoState === YT_PlayerState.PLAYING) {
            //player.seekTo(messageData.currentPlayTime, true);
            player.playVideo();
        } else if(videoState === YT_PlayerState.PAUSED) {
            //player.seekTo(messageData.currentPlayTime, true);
            player.pauseVideo();
        } else if(videoState === YT_PlayerState.ENDED) {
            player.stopVideo();
        } else if(videoState === YT_PlayerState.SEEKING) {
            if(getVideoStateAsString(player.getPlayerState()) === YT_PlayerState.PAUSED) {
                //player.playVideo();
            }
            player.seekTo(messageData.currentPlayTime, true);
        }
        player.addEventListener("onStateChange", "window.onPlayerStateChange");
    }

    function getVideoStateAsString(videoStateAsInt) {
        var whatToReturn = "";
        switch (videoStateAsInt) {
            case -1:
                whatToReturn = "UNSTARTED";
            break;
            case 0 :
                whatToReturn = YT_PlayerState.ENDED;
            break;
            case 1 :
                whatToReturn = YT_PlayerState.PLAYING;
            break;
            case 2 :
                whatToReturn = YT_PlayerState.PAUSED;
            break;
            case 3 :
                whatToReturn = "BUFFERING";
            break;
            case 5 :
                whatToReturn = YT_PlayerState.CUED;
                break;
        }
        return whatToReturn;
    }
});
