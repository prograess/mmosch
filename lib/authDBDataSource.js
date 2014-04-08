/**
 * Use table auth with fields uid:id, type:varchar(255), key:varchar(255), data:text/blob
 * (type,key) should be unique
 */
function authDBDataSource(){
    this.db = undefined;
    this.tableName = 'auth';
}

authDBDataSource.prototype.init = function(cb){
    var self = this;

    self.db.query('SELECT * FROM "'+self.tableName+'" LIMIT 1',function(err,res){
        cb(err);
    });
};

authDBDataSource.prototype.findAuthRecord = function(type,key,cb){
    var self = this;

    self.db.paramQuery('SELECT * FROM "'+self.tableName+'" WHERE type=$1 AND key=$2',[type,key],function(err,res){
        if (err){
            cb(err);
            return;
        }

        if (res.rowCount === 0) cb(null,null);
        else cb(null,res.rows[0]);
    });
};

authDBDataSource.prototype.createAuthRecord = function(uid,type,key,data,cb){
    var self = this;

    self.db.paramQuery('INSERT INTO "'+self.tableName+'"(uid,type,key,data) VALUES ($1,$2,$3,$4) RETURNING * ;',[uid,type,key,data],function(err,res){
        if (err){
            cb(err);
            return;
        }

        if (res.rowCount === 0) cb(null,null);
        else cb(null,res.rows[0]);
    });
};

authDBDataSource.prototype.deleteAuthRecord = function(type,key,cb){
	var self = this;

	self.db.paramQuery('DELETE FROM "'+self.tableName+'" WHERE type=$1 AND key=$2 ;',[type,key],cb);
};

authDBDataSource.prototype.deleteUserRecords = function(uid,cb){
	var self = this;

	self.db.paramQuery('DELETE FROM "'+self.tableName+'" WHERE uid=$1 ;',[uid],cb);
};


module.exports = authDBDataSource;