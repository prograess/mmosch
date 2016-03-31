require('date-utils');

var colors = require('colors/safe');

function Logger(name){
    this.name = name;
}

var loggers = {};

Logger.prototype.writerCons = ConsoleWriter;

Logger.getLogger = function(name){
    if (! loggers[name]){
        loggers[name] = new Logger(name);
    }

    return loggers[name];
};

Object.defineProperty(Logger.prototype, 'colors', { value: colors });

var levelNames = {
	'trace': "TRACE",
	'debug': "DEBUG",
    'info' : "INFO",
	"warn" : "WARNING",
	'error': "ERROR"
};

colors.setTheme({
	  trace: ['gray']
	, debug: ['magenta']
	, info : ['green']
	, warn : ['yellow']
	, error: ['red']
});

Logger.prototype.log = function(lvl,m){
	if (this.writer == null){
		this.writer = new this.writerCons(this);
	}

	this.writer.log(lvl,m);
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
module.exports.ConsoleWriter = ConsoleWriter;

function ConsoleWriter(logger){
	this.loggerName = logger.name;
	this.dateStr = "";
	this.dateTimeout = null;
	this.cleanDate();
}

ConsoleWriter.prototype.cleanDate = function(){
	this.dateStr = "";
	this.dateTimeout = null;
};

ConsoleWriter.prototype.log = function(lvl,m){
	if (this.dateStr == ""){
		this.dateStr = (new Date()).toFormat("YYYY-MM-DDTHH24:MI:SS")
	}

	var str = "";
	str += "[" + this.dateStr + ']';
	str = colors[lvl](str + " " + levelNames[lvl] + " " + this.loggerName + ": ") + m;
	console.log(str);

	if(this.dateTimeout == null) {this.dateTimeout = setTimeout(this.cleanDate.bind(this),1);}
};
