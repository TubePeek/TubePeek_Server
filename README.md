### WatchWith_Server


First run to grab all necessary dependencies:
```terminal
npm install
```

To start the server:
```terminal
npm start
```
It'll run migrations if necessary. It'll also will restart our node server during development when files change so that we see the effects of the change immediately.


With the command prompt being at the root of the project, run the below command when you need to do a database schema change.
```
knex migrate:make watchwithdb
```

Running tests:
```terminal
npm test
```

To view pretty logs during development, access the following address on a browser:
```terminal
http://localhost:3700/logs
```

Follow this to understand the database migration things with knex:
- [Knex Database setup tutorial](http://www.dancorman.com/knex-your-sql-best-friend/)
- [Knex database migration tutorial] (http://alexzywiak.github.io/running-migrations-with-knex/)

