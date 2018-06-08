var tough = require('tough-cookie');
var Client = require('instagram-private-api').V1;
var MemoryCookieStore = require('tough-cookie/lib/memstore.js').MemoryCookieStore;

function jsonToCookie(dataJson) {
    for(var domainName in dataJson) {
        for(var pathName in dataJson[domainName]) {
            for(var cookieName in dataJson[domainName][pathName]) {
                dataJson[domainName][pathName][cookieName] = tough.fromJSON(JSON.stringify(dataJson[domainName][pathName][cookieName]));
            }
        }
    }

    return dataJson;
}

function getSession(jsonCookie, username, password) {
    return new Promise((resolve, reject) => {
        var cookie = jsonToCookie(jsonCookie);
        var device = new Client.Device(username);
        var store = new MemoryCookieStore();
    
        store.idx = cookie;
    
        var storage = new Client.CookieStorage(store);
        var session = new Client.Session(device, storage);
        // TODO: Use Session.create() to handle invalid sessions.
    
        Client.Session.create(device, storage, username, password)
            .then(resolve)
            .catch(reject)
    })
}

module.exports = {
    getSession
}