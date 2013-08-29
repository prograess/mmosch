var pg = require('pg');

function makeConnectionString(host,port,login,pass,dbname){
    return "tcp://"+login+":"+pass+"@"+host+":"+port+"/"+dbname;
}

function DB(host,port,login,pass,dbname){
    this.host = host;
    this.port = port;
    this.login = login;
    this.pass = pass;
    this.dbname = dbname;
}

/**
 * Wait for free db connection, or create it, if pool is not full.
 * If every connection in pool is acquired - will call cb as soon as error happens or some connection released
 * @param cb - function(err,client,done)
 * err is instance of Error or null
 * client is instance of pg.Client of no error happened, and in your full control, until you release it
 * done is function, call it to release Client back to pool
 */
DB.prototype.getConnection = function(cb){
    pg.connect(makeConnectionString(this.host,this.port,this.login,this.pass,this.dbname),cb);
};

/**
 * Wait for free db connection, and run query in it.
 * @param cb - function(err,res,done)
 * err is instance of Error or null
 * res is query result
 */
DB.prototype.query = function(query,cb){
    this.getConnection(function(err,cl,done){
        if (err){
            done();
            cb(err);
            return;
        }
        cl.query(query,function(err,res){
            done();
            cb(err,res);
        });
    });
};

DB.prototype.paramQuery = function(query,params,cb){
    this.getConnection(function(err,cl,done){
        if (err){
            done();
            cb(err);
            return;
        }
        cl.query(query,params,function(err,res){
            done();
            cb(err,res);
        });
    });
};

DB.prototype.init = function(cb){
    var self = this;
    self.getConnection(function(err,client,done){
        done();
        cb(err);
    });
};

module.exports = DB;