function Auth(){
    this.modules = undefined;
}

Auth.prototype.addMethod = function(name,authizer){
    this.modules[name] = authizer;
};

Auth.prototype.do = function(data,cb){
    if (! data.method){
        cb(new Error("data.method not found"));
        return;
    }
    if (! this.modules[data.method]){
        cb(new Error("Method " + data.method + " not found"));
        return;
    }
    this.modules[data.method].auth(data,cb);
};

Auth.prototype.register = function(uid,data,cb){
    if (! data.method){
        cb(new Error("data.method not found"));
        return;
    }
    if (! this.modules[data.method]){
        cb(new Error("Method " + data.method + " not found"));
        return;
    }
    this.modules[data.method].register(uid,data,cb);
};

module.exports = Auth;