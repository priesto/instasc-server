'use strict';

const redis = require('redis');

const subscriber = redis.createClient();

subscriber.on('message', (channel, message) => {
    console.log('received: ' + message);
})

subscriber.subscribe('response');
