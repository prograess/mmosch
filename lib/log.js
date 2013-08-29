function Logger(name){
    this.name = name;
}

var loggers = {};

Logger.getLogger = function(name){
    if (! loggers[name]){
        loggers[name] = new Logger(name);
    }

    return loggers[name];
};

var levelNames = {
    'info' : "Info"
};

Logger.prototype.log = function(lvl,m){
    console.log(levelNames[lvl] + " " + this.name + " :" + m);
};

Logger.prototype.info = function(m){
    console.log(this.name + ": " + m);
};

module.exports = Logger;