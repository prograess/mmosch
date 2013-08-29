var IOC = require('./ioc');

module.exports.init = function(config,cb){
    var ioc = new IOC.IOCContainer();
    ioc.config = config;
    ioc.init(cb);
};

module.exports.modules = {
    auth: require('./auth.js'),
    users: require('./users.js'),
    signalHandler: require('./signalhandler.js')
};

module.exports.ref = function(beanName){
    return new IOC.Ref(beanName);
};

module.exports.map = function(cons){
    return new IOC.Map(cons);
};