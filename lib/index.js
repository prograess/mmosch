var IOC = require('./ioc');

module.exports.init = function(config,cb){
    var ioc = new IOC.IOCContainer();
    ioc.config = config;
    ioc.init(cb);
};

module.exports.modules = {
    auth: require('./auth.js'),
	AuthMethod: require('./authMethod'),
    users: require('./users.js'),
    signalHandler: require('./signalhandler.js'),
	usersDBDataSource: require('./userDBDataSource.js'),
	authDBDataSource: require('./authDBDataSource.js')
};

module.exports.ref = function(beanName){
    return new IOC.Ref(beanName);
};

module.exports.map = function(cons){
    return new IOC.Map(cons);
};

module.exports.extend = IOC.extend;

module.exports.Logger = require('./log.js');
module.exports.ConsoleWriter = require('./log.js').ConsoleWriter;