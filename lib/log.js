require('date-utils');

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
	'trace': "TRACE",
	'debug': "DEBUG",
    'info' : "INFO",
	"warn" : "WARNING",
	'error': "ERROR"
};

Logger.prototype.log = function(lvl,m){
	var str = "";
	str += "[" + (new Date()).toFormat("YYYY-MM-DDTHH:MI:SS") + ']';
	str += " " + levelNames[lvl] + " " + this.name + ": " + m;
    console.log(str);
};

for (var i in levelNames){
	Logger.prototype[i] = function(m){
		console.log(i,this.name + ": " + m);
	};
}

module.exports = Logger;