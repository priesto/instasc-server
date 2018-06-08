const Client = require('instagram-private-api').V1;

module.exports = (username, password, proxy) => {
    return new Promise(async (resolve, reject) => {
        const Device = new Client.Device(`${username}`);
        const Storage = new Client.CookieMemoryStorage();

        try {
            const session = await Client.Session.create(
                Device, Storage, username, password, proxy
            );
    
            const account = await session.getAccount();
                
            const storageJSON = Storage.store;
            const { id, picture } = account._params;
    
            resolve({id, picture, cookie: storageJSON});
        } catch(e) {
            console.error(e);
            reject(e);
        }
    })

}