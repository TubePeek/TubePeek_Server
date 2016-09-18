var Utils = require('../Utils');

var SocialIdentities = require('./SocialIdentities');
var UserVideos = require('./UserVideos');
var Videos = require('./Videos');

var userVideosPersist = {};

userVideosPersist.persist = function(googleUserId, videoUrl, videoTitle) {
    var findSocialIdentities = SocialIdentities.findByUIdAndProvider(googleUserId, 'google');
    var currentDateTime = Utils.dateFormat(new Date(), "%Y-%m-%d %H:%M:%S", true);

    findSocialIdentities.then(function(identitiesFound) {
        if(identitiesFound.length > 0) {
            var userId = identitiesFound[0]['user_id'];
            var youtubeVideoId = Utils.getIdOfYoutubeVideo(videoUrl);

            Videos.findByYoutubeVideoId(youtubeVideoId, function(videosFound) {
                if(videosFound && videosFound.length > 0) {
                    var videoId = videosFound[0]['id'];
                    var findUserVideos = UserVideos.findByUserAndVideoId(userId, videoId);

                    findUserVideos.then(function (userVideosFound) {
                        if(userVideosFound && userVideosFound.length > 0) {
                            UserVideos.update(userId, videoId, currentDateTime, function () {});
                        } else {
                            UserVideos.insert(userId, videoId, currentDateTime, function () {});
                        }
                    });
                } else {
                    Videos.insert(videoUrl, youtubeVideoId, videoTitle, function(videoId) {
                        var findUserVideos = UserVideos.findByUserAndVideoId(userId, videoId);

                        findUserVideos.then(function (userVideosFound) {
                            if(userVideosFound && userVideosFound.length > 0) {
                                UserVideos.update(userId, videoId, currentDateTime, function () {});
                            } else {
                                UserVideos.insert(userId, videoId, currentDateTime, function () {});
                            }
                        });
                    });
                }
            });
        }
    });
}

module.exports = userVideosPersist;
