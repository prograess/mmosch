var async = require('async');

var SIGNALS = ['SIGINT','SIGTERM'];

var DEFAULT_HANDLERS = {
    'SIGINT' : process.exit.bind(null,0),
    'SIGTERM': process.exit.bind(null,0)
};

function SignalHandler(){
    this.handlers = {};

    for (var signal in DEFAULT_HANDLERS){
        this.on(signal,DEFAULT_HANDLERS[signal]);
    }

    for (var i in SIGNALS){
        process.on(SIGNALS[i],this._onSignal.bind(this,SIGNALS[i]));
    }
}

SignalHandler.prototype._onSignal = function(signal){
    if (this.handlers[signal] !== undefined){
        async.series(this.handlers[signal]);
    }
};

SignalHandler.prototype.on = function(signal,handler){
    this.handlers[signal] = this.handlers[signal] || [];
    this.handlers[signal].unshift(handler);
};

module.exports = SignalHandler;