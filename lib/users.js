var Buffer = require('buffer').Buffer;
var util = require('util');
var events = require('events');
var async = require('async');
var SharedPool = require('./sharedPool.js');
var Logger = require('./log');
var logger = Logger.getLogger("users");


function Users(){
    this.usersDataSource = undefined;
    this.auth = undefined;
    this.server = undefined;
    this.signalHandler = undefined;

    this.users = {};
    this.usersRelease = {};
    this.connections = {};
    this.usersPool = new SharedPool();

    this.enableRegister = true;
    this.enableAuth = true;
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

    if (this.enableAuth) conn.on('auth',self.onAuth.bind(self,conn));

    if (this.enableRegister) conn.on('register',self.onRegister.bind(self,conn));
};

Users.prototype.onRegister = function(conn,data){
    var self = this;
    self.registerUser(data,function(err,authRecord){
        if (err){
            var reply = {error:err.message};
            conn.sendJ('registerReply',reply);
            return;
        }

        self.usersPool.get(authRecord.uid,function(err,user,release){
            if (err){
                var reply = {error:err.message};
                conn.sendJ('registerReply',reply);
                return;
            }

            user.auth = authRecord;

            conn.sendJ('registerReply',{ok:true});
            self.addUser(user,conn,release);
        });
    });
};

Users.prototype.onAuth = function(conn,data){
    var self = this;

    self.authUser(data,function(err,authRecord){
        if (err){
            var reply = {error:err.message};
            if (err.message == "User auth record not found"){
                reply['tryRegister'] = true;
            }
            conn.sendJ('authReply',reply);
            return;
        }

		var uid = authRecord.uid;

        if (self.connections[uid]){
            conn.sendJ('authReply',{ok:true});

            //This user already authenticated
            self.connections[uid].sendJ('connectionReplace',{});
            self.connections[uid].changeTransport(conn.transport);

            self.emit('userRelogin',uid);

            return;
        }

        self.usersPool.get(uid,function(err,user,release){
            if (err){
                var reply = {error:err.message};
                if (err.message == "User auth record not found"){
                    reply['tryRegister'] = true;
                }
                conn.sendJ('authReply',reply);
                return;
            }

            user.auth = authRecord;

            conn.sendJ('authReply',{ok:true});
            self.addUser(user,conn,release);
        });
    });
};

Users.prototype.authUser = function(authData,cb){
    var self = this;

    self.auth.do(authData,function(err,authRecord){
        if (err){
			logger.error(err.toString());
            cb(err);
            return;
        }

        if (! authRecord){
			logger.error("User auth record not found");
            cb(new Error("User auth record not found"));
            return;
        }

        cb(null,authRecord);
    });
};

Users.prototype.registerUser = function(authData,cb){
    var self = this;

    logger.info("got register with " + authData);

    self.usersDataSource.createUserRecord(function(err,res){
        if (err){
			logger.error(err.toString());
            cb(err);
            return;
        }

        self.auth.register(res.id,authData,function(err,authRecord){
            if (err){
				logger.error(err.toString());
                self.usersDataSource.deleteUserRecord(res.id,function(err2){
                    if(err2){
						logger.error(err2.toString());
                        err.message += " -> " + err2.message;
                    }
                    cb(err);
                });
				return;
            }

            cb(null,authRecord);
        });
    });
};

function Lock(){
	this.running = false;
	this.reqested = false;
}

//return true if OK to start
//return false if already started
Lock.prototype.start = function(){
	if (! this.running){
		this.running = true;
		return true;
	}
	this.requested = true;
	return false;
};

//return true if requested another run
//return false if not
Lock.prototype.stop = function(){
	this.running = false;
	var a = this.requested;
	this.requested = false;
	return a;
};

function User(){
    this.id = null;
    this.data = null;
    this._usersDataSource = null;

	this.lock = new Lock();
	this.cbs = [];
}

User.prototype.save = function(cb){
	var self = this;
	if (! self.lock.start()){
		this.cbs.push(cb);
		return;
	}

	function mycb(err){
		if (err) console.log(err);

		var run_cbs = self.cbs;
		self.cbs = [];

		function newcb(err){
			for (var i in run_cbs){
				if (run_cbs[i] !== undefined) run_cbs[i](err);
			}
		}

		if (self.lock.stop()){
			process.nextTick(function(){
				self.save(newcb);
			})
		}

		if(cb) cb(err);
	}

    this._usersDataSource.saveUserRecord(this.id,this.data,mycb);
};

module.exports = Users;
