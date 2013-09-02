var Buffer = require('buffer').Buffer;
var util = require('util');
var events = require('events');
var async = require('async');
var SharedPool = require('./sharedPool.js');

function Users(){
    this.usersDataSource = undefined;
    this.auth = undefined;
    this.server = undefined;
    this.signalHandler = undefined;

    this.users = {};
    this.usersRelease = {};
    this.connections = {};
    this.usersPool = new SharedPool();
}
util.inherits(Users,events.EventEmitter);

Users.prototype.init = function(cb){
    var self = this;
    var server = self.server.server;
    server.on('connection',self.onConnection.bind(self));

    self.usersPool.load = self._loadUser.bind(self);

    self.signalHandler.on('SIGTERM',self.shutdown.bind(self));
    self.signalHandler.on('SIGINT',self.shutdown.bind(self));

    cb(null);
};

Users.prototype._loadUser = function(uid,cb){
    var self = this;
    this.usersDataSource.findUserRecord(uid,function(err,res){
        if (err){
            cb(err);
            return;
        }

        if (! res){
            cb(new Error("User record not found"));
            return;
        }

        var u = new User();
        u.id = res.id;
        u.data = res.data;
        u._usersDataSource = self.usersDataSource;

        cb(null,u);
    });
};

Users.prototype.shutdown = function (cb){
    function saveUser(u,cb){
        u.save(cb);
    }

    async.eachSeries(this.users,saveUser,cb);
};

Users.prototype.addUser =function(user,conn,release){
    var self = this;

    self.users[user.id] = user;
    self.connections[user.id] = conn;
    self.usersRelease[user.id] = release;

    conn.on('close',function(){
        self.usersRelease[user.id]();

        delete self.users[user.id];
        delete self.connections[user.id];
        delete self.usersRelease[user.id];

        self.emit('userLogout',user.id);
    });

    self.emit('userLogin',user,conn);
};

Users.prototype.onConnection = function(conn){
    var self = this;

    conn.on('auth',self.onAuth.bind(self,conn));

    conn.on('register',self.onRegister.bind(self,conn));
};

Users.prototype.onRegister = function(conn,data){
    var self = this;
    self.registerUser(data,function(err,res){
        if (err){
            var reply = {error:err.message};
            conn.sendJ('registerReply',reply);
            return;
        }

        conn.sendJ('registerReply',{ok:true});

        var u = new User();
        u.id = res.id;
        u.data = res.data;
        u._usersDataSource = self.usersDataSource;

        self.addUser(u,conn);
    });
};

Users.prototype.onAuth = function(conn,data){
    var self = this;

    self.authUser(data,function(err,uid){
        if (err){
            var reply = {error:err.message};
            if (err.message = "User auth record not found"){
                reply['tryRegister'] = true;
            }
            conn.sendJ('authReply',reply);
            return;
        }

        if (self.connections[uid]){
            conn.sendJ('authReply',{ok:true});

            //FIXME now client have different sid
            //This user already authenticated
            self.connections[uid].changeTransport(conn.transport);
            self.connections[uid].changeTransport(conn.transport);

            self.emit('userRelogin',uid);

            return;
        }

        self.usersPool.get(uid,function(err,user,release){
            if (err){
                var reply = {error:err.message};
                if (err.message = "User auth record not found"){
                    reply['tryRegister'] = true;
                }
                conn.sendJ('authReply',reply);
                return;
            }

            user.auth = data;

            conn.sendJ('authReply',{ok:true});
            self.addUser(user,conn,release);
        });
    });
};

Users.prototype.authUser = function(authData,cb){
    var self = this;

    self.auth.do(authData,function(err,uid){
        if (err){
            cb(err);
            return;
        }

        if (! uid){
            cb(new Error("User auth record not found"));
            return;
        }

        cb(null,uid);
    });
};

Users.prototype.registerUser = function(authData,cb){
    var self = this;

    console.log("got register with ", authData);

    self.usersDataSource.createUserRecord(function(err,res){
        if (err){
            cb(err);
            return;
        }

        self.auth.register(res.id,authData,function(err){
            if (err){
                self.usersDataSource.deleteUserRecord(res.id,function(err2){
                    if(err2){
                        err.message += " -> " + err2.message;
                    }
                    cb(err);
                });
            }

            cb(res);
        });
    });
};

function User(){
    this.id = null;
    this.data = null;
    this._usersDataSource = null;
}

User.prototype.save = function(cb){
    if (!cb) cb = function(err){
        if (err) console.log(err);
    };

    this._usersDataSource.saveUserRecord(this.id,this.data,cb);
};

module.exports = Users;