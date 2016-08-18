var Messenger = require("@nathanfaucett/messenger"),
    adapter = require("./adapter"),
    client = require("./client"),
    server = require("./server");


client.initClient(new Messenger(adapter.client));
server.initServer(new Messenger(adapter.server));


module.exports = server;
