### TubePeek_Server

##### Dependencies
```terminal
npm install
```

##### Db Environment settings
Windows
```Windows
Go to your Environment variables and add a System variable with:

name: WatchWith_DbEnv
and
value: development | DigitalOceanProduction | HerokuProduction
```

Ubuntu
```Ubuntu
Go into ~/.bashrc and add the below line:

export WatchWith_DbEnv="development" # development | DigitalOceanProduction | HerokuProduction

Now, open a terminal window and run:
source ~/.bashrc
```

##### Starting the server
```terminal
npm start
```
It'll run migrations if necessary. It'll also restart our node server during development when files change so that we see the effects of the change immediately.

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
