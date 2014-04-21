function AuthMethod(){
}

AuthMethod.prototype.auth = function(data, callback){
    callback(new Error("Unimplemented AuthMethod.auth call"));
};

module.exports = AuthMethod;