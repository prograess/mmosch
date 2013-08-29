var oServer = require('obvyazka').Server;

function obvyazkaServer(){
    this.config = undefined;
    this.server = new oServer();
}

obvyazkaServer.prototype.init = function(cb){
    this.server.listen(this.config.listen);

    //FIXME implement 'listening' event in obvyzka
    cb(null);
};

module.exports = obvyazkaServer;