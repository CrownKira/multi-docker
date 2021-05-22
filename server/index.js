const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// this app is going to receive and respond to any http request
const app = express();
// cors: cross origin resource sharing
// allows to make request from one domain to a completely different domain
app.use(cors());
// parse incoming request from a react app
// and turn the body of the post request to json
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});
// // on error console log
// pgClient.on('error', () => console.log('Lost PG connection'));

// // create a table if it doesn't exist
// // name of the table: values
// // store a single column of information ie. number
// pgClient
//   .query('CREATE TABLE IF NOT EXISTS values (number INT)')
//   .catch((err) => console.log(err));

// need to ensure we delay the table query until after a connection is made
pgClient.on('connect', (client) => {
  client
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.error(err));
});

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
// client that is listening or publishing info on redis
// have to make a duplicate connection
// when used to listen, publish, etc => then cannot be used for other purposes
const redisPublisher = redisClient.duplicate();

// Express route handlers
app.get('/', (req, res) => {
  // makes a request to root route, send back hi
  res.send('Hi');
});

// app.get('/values/all', async (req, res) => {
//   // query running postgres instance
//   // all the values that have ever been submitted to postgres
//   // sequel query
//   const values = await pgClient.query('SELECT * from values');

//   // only send back rows and no other info
//   res.send(values.rows);
// });

app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * from values');

  res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
  // reach into redis
  // get all the indices and calculated values
  // hgetall() is not a promise, so cant use await
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
  });
});

app.post('/values', async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    // send back response of status 422
    return res.status(422).send('Index too high');
  }

  // add to redis index with no value
  redisClient.hset('values', index, 'Nothing yet!');
  // this is the message that gets sent over to that worker process
  redisPublisher.publish('insert', index);
  // store index into the postgres
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

  res.send({ working: true });
});

app.listen(5000, (err) => {
  console.log('Listening');
});
