
function getDbConfig () {
  var theDbConfig = {client: 'pg'};

  if (process.env.HEROKU_POSTGRESQL_BRONZE_URL) {
    var parseDbUrl = require("parse-database-url");
    var parsedDbConfig = parseDbUrl(process.env.HEROKU_POSTGRESQL_BRONZE_URL);
    theDbConfig.connection = {
      host      : parsedDbConfig.host,
      user      : parsedDbConfig.user,
      password  : parsedDbConfig.password,
      database  : parsedDbConfig.database
    };
  } else {
    theDbConfig.connection = {
      host     : '127.0.0.1',
      user     : 'postgres',
      password : 'asdffdsa',
      database : 'letswatchdb'
    };
  }
  theDbConfig.connection.charset = 'utf8';
  return theDbConfig;
}

var dbConfig = getDbConfig();
var knex = require('knex')(dbConfig);
var bookshelf = require('bookshelf')(knex);

//--Setup Database schema
var Users = bookshelf.Model.extend({
  tableName: 'usermaster',
  idAttribute: 'user_id',

  watchSessions: function() {
    //return this.belongsToMany(WatchSessions, 'watchsessions_usermaster');
    return this.belongsToMany(WatchSessions);
  }
}, {
    byEmail : function(theEmail) {
      return this.forge().query({where : {email_address: theEmail}}).fetch();
    }
  }
);
var Videos = bookshelf.Model.extend({
  tableName: 'video',
  idAttribute: 'video_id',
});

var WatchSessions = bookshelf.Model.extend({
  tableName: 'watchsessions',
  idAttribute: 'session_id',

  creatorUserId: function() {
    return this.hasOne(Users);
  },
  watchers: function() {
    return this.hasMany(Users, "user_id");
  }
});

var WatchSessions_Users = bookshelf.Model.extend({
  tableName: 'watchsessions_users'
});

// Exports
module.exports = bookshelf;
module.exports.Users = Users;
module.exports.Videos = Videos;
module.exports.WatchSessions = WatchSessions;
module.exports.WatchSessions_Users = WatchSessions_Users;
