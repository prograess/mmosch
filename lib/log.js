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
	str += "[" + (new Date()).toFormat("YYYY-MM-DDTHH24:MI:SS") + ']';
	str += " " + levelNames[lvl] + " " + this.name + ": " + m;
    console.log(str);
};

for (var i in levelNames){
	function f(){
		var lvl = i;
		Logger.prototype[lvl] = function(m){
			this.log(lvl,m);
		};
	}
	f();
}

module.exports = Logger;
