'use strict';


var dbObject = require('./DbObject');

function Invites(tableName) {
    this.tableName = tableName;

    this.COLUMNS = {};
    this.COLUMNS.REQUESTER_USER_ID = 'requester_user_id';
    this.COLUMNS.REQUESTER_GOOGLE_UID = 'requester_google_uid';

    this.COLUMNS.RECIPIENT_USER_ID = 'recipient_user_id';
    this.COLUMNS.RECIPIENT_GOOGLE_UID = 'recipient_google_uid';

    this.COLUMNS.IS_ACCEPTED = 'is_accepted';           // will be 'true' or 'false'
    this.COLUMNS.IS_REJECTED = 'is_rejected';           // will be 'true' or 'false'

    this.COLUMNS.DATE_ACCEPTED = 'date_accepted';
    this.COLUMNS.DATE_REJECTED = 'date_rejected';

    this.COLUMNS.CREATED_AT = 'created_at';
}


Invites.prototype = dbObject;

module.exports = Invites;
