var dbObject = require('./DbObject');

function Videos(tableName) {
    this.tableName = tableName;
}

Videos.prototype = dbObject;

var videosTable = new Videos('videos');

videosTable.findByYoutubeVideoId = function(youtubeVideoId, callbackOnResult) {
    this.findBy('youtube_video_id', youtubeVideoId, callbackOnResult);
}

videosTable.insert = function(videoUrl, youtubeVideoId, videoTitle, callbackOnInsertDone) {
    this.knex.insert({
        'video_url': videoUrl,
        'youtube_video_id': youtubeVideoId,
        'video_title': videoTitle
    })
    .returning('id').into(this.tableName)
    .then(function (id) {
        callbackOnInsertDone(parseInt(id));
    });
}

module.exports = videosTable;
