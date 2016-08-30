var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var friendsListSchema = new Schema({
    googleUserId : {type: String, required: true, unique: true},
    friends : [{
        googleUserId : String,
        fullName : String,
        imageUrl : String,
        isExcluded : Boolean
    }]
});

var FriendsList = mongoose.model('FriendsList', friendsListSchema);

module.exports = FriendsList;
