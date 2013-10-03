var oServer = require('obvyazka').Server;

function obvyazkaServer(){
    this.config = undefined;
    this.server = new oServer();
}

obvyazkaServer.prototype.init = function(cb){
	var error = null;
	try{
    	this.server.listen(this.config.listen);
	}
	catch(e){
		error = e;
	}

    //FIXME implement 'listening' event in obvyzka
    cb(error);
};

module.exports = obvyazkaServer;