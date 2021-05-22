// connect to redis, watch for values, calculate fib values
// keys: house the host and port required for connecting to redis
const keys = require('./keys');
const redis = require('redis');

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  // if lose connection, try to reconnect to the server
  // once every 1 second
  retry_strategy: () => 1000,
});

// duplicate the redis client
const sub = redisClient.duplicate();

function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

// every time we get a new message, run this callback function
// message: a new value that shows up in redis
// calculate the fib and insert that into the hashset (named values)
// key: message
// value: fib value of the message
sub.on('message', (channel, message) => {
  redisClient.hset('values', message, fib(parseInt(message)));
});
// everytime someone inserts a new value into redis
// get the value and calculate the fib value for it
// toss that value back into the redis instance
sub.subscribe('insert');
