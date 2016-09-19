var dbObject = require('./DbObject');

function UserVideos(tableName) {
    this.tableName = tableName;
}

UserVideos.prototype = dbObject;

var userVideosTable = new UserVideos('uservideos');

// This will return a promise
userVideosTable.findByUserAndVideoId = function(userId, videoId) {
    return this.knex(this.tableName).where({
        'user_id' : userId,
        'video_id' : videoId
    }).select('*');
}

userVideosTable.update = function(userId, videoId, currentDateTime) {
    this.knex(this.tableName).where({
        'user_id' : userId,
        'video_id' : videoId
    })
    .update({
        'updated_at' : currentDateTime
    })
    .then(function (count) {
        // do nothing
    });
}

userVideosTable.insert = function(userId, videoId, currentDateTime) {
    this.knex(this.tableName).insert({
        'user_id': userId,
        'video_id': videoId,
        'created_at': currentDateTime
    })
    .returning('id').into(this.tableName)
    .then(function (id) {
        // do nothing
    });;
}

module.exports = userVideosTable;
