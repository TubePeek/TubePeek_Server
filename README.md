### WatchWith


Run:
```terminal
npm install
```

Then run:
```terminal
nodemon
```
It'll run migrations if necessary. Also will restart our node server during development when files change
so that we see the effects of the change immediately.


With the command prompt being at the root of the project, run the below command when you need to do a database schema change.
```
knex migrate:make watchwithdb
```
OR
```
knex migrate:latest --env production
```

Running tests:
```terminal
npm test
```

To view pretty logs during development:
```terminal
http://localhost:3700/logs
```

Follow this to understand the database migration things with knex:
- [Knex Database setup tutorial](http://www.dancorman.com/knex-your-sql-best-friend/)
- [Knex database migration tutorial] (http://alexzywiak.github.io/running-migrations-with-knex/)
