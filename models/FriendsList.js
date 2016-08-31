var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var Friend = new Schema({
    googleUserId : String,
    fullName : String,
    imageUrl : String,
    isExcluded : Boolean
});

var friendsListSchema = new Schema({
    googleUserId : {type: String, required: true, unique: true},
    friends : [Friend]
});

var FriendsList = mongoose.model('FriendsList', friendsListSchema);

module.exports = FriendsList;
