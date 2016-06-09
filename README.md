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

Follow this to understand the database migration things:
[Knex Database setup tutorial](http://www.dancorman.com/knex-your-sql-best-friend/)

## TODOS
---------------------
- video current state for newly connected clients
- Change youtube video in order to watch something else
- add video seek action sync functionality
