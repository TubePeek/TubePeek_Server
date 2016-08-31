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
value: development | AmazonEc2 | DigitalOceanProduction
```

Ubuntu
```Ubuntu
Go into ~/.bashrc and add the below line:

export WatchWith_DbEnv="development" # development | AmazonEc2 | DigitalOceanProduction

Now, open a terminal window and run:
source ~/.bashrc
```

##### Databases setup
Postgres and Mongo is required

Create a Postgres database with name 'tubepeekdb' with owner 'postgres'.

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
```
knex migrate:make watchwithdb
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

##### Further study
Follow this to understand the database migration things with knex:

- [Knex Database setup tutorial](http://www.dancorman.com/knex-your-sql-best-friend/)
- [Knex database migration tutorial](http://alexzywiak.github.io/running-migrations-with-knex/)
