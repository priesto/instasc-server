'use strict';

const redis = require('redis');

const publisher = redis.createClient();
const subscriber = redis.createClient();

const json = {id: 293, name: "Joh\"n"};

subscriber.on('message', (channel, message) => {
    if(message === '401' | message === '403') {
        console.log('ok');
        publisher.quit();
        subscriber.quit();

        return;
    }

    message = message.replace(/\\/g, '').slice(0, -1).slice(1);


    console.log(message);

    const o = JSON.parse(message);
    console.log(o);
    console.log(o.id);
    console.log(o.pic);

})

subscriber.on('subscribe', (channel, count) => {
    publisher.publish('request', JSON.stringify(json));
})

subscriber.subscribe('response');

