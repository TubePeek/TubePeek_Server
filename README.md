### TubePeek_Server

##### Node Dependencies
```terminal
npm install
```

##### Db Environment settings
Windows
```Windows
Go to your Environment variables and add a System variable:

name: WatchWith_DbEnv
value: development | AmazonEc2
```

Ubuntu
```Ubuntu
Go into ~/.bashrc and add the below line:

export WatchWith_DbEnv="development" # development | AmazonEc2

Now, open a terminal window and run:
source ~/.bashrc
```

##### Databases setup
Postgres and Mongo is required

Create a Postgres database with name 'tubepeekdb' with owner 'postgres' and password 'asdffdsa'.

Create a mongo database with name 'tubepeekmongodb'.

Start the Mongo server with:
```terminal
mongod
```

##### Starting the server
Local machine (Development mode)
```terminal
npm run startdev
```
It'll restart our node server during development when files change so that we see the effects of the change immediately.

On VPS (Production mode)
```terminal
pm2 start TubePeekServer.js
```

##### Database schema migration
If your knexfile.js does not exist then run:
```terminal
knex init
```

```terminal
knex migrate:make watchwithdb
```

```terminal
knex migrate:latest --env development
```

##### Running tests
```terminal
npm test
```

##### Viewing logs
To view pretty logs during development, access the following address on a browser:
```terminal
http://localhost:3700/logs
```

##### For the Chrome Extension
  There is no README.md file for the chrome extension cos I think it'll interfere with Chrome loading the extension.
  Hence the need for this section. Let's begin.
- ###### Google Oauth2 scopes
  - https://developers.google.com/identity/protocols/googlescopes
  - https://developers.google.com/identity/protocols/OAuth2
  - http://www.slideshare.net/aaronpk/the-current-state-of-oauth-2
  - https://developer.chrome.com/extensions/tut_oauth
  - https://github.com/borismus/oauth2-extensions
  - This may help: https://developers.google.com/api-client-library/javascript/features/authentication
  - https://developers.google.com/+/web/api/rest/latest/people/list
  - https://developers.facebook.com/docs/graph-api/reference/friend-list/
  - http://stackoverflow.com/questions/3546677/how-to-get-the-facebook-user-id-using-the-access-token
  - https://developers.facebook.com/docs/graph-api/reference/user

##### Further study
Follow this to understand the database migration things with knex:

- [Knex Database setup tutorial](http://www.dancorman.com/knex-your-sql-best-friend/)
- [Knex database migration tutorial](http://alexzywiak.github.io/running-migrations-with-knex/)

##### License
MIT License
