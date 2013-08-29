function usersDBDataSource(){
    this.db = undefined;
    this.tableName = 'users';
}

usersDBDataSource.prototype.init = function(cb){
    var self = this;

    self.db.query('SELECT * FROM "'+self.tableName+'" LIMIT 1',function(err,res){
        cb(err);
    });
};

usersDBDataSource.prototype.findUserRecord = function(uid,cb){
    var self = this;

    self.db.paramQuery('SELECT * FROM "'+self.tableName+'" WHERE id=$1',[uid],function(err,res){
        if (err){
            cb(err);
            return;
        }

        if (res.rowCount === 0) cb(null,null);
        else cb(null,{id:res.rows[0].id, data:JSON.parse(res.rows[0].data)});
    });
};

usersDBDataSource.prototype.saveUserRecord = function(uid,data,cb){
    var self = this;

    self.db.paramQuery('UPDATE "'+self.tableName+'" SET data=$2 WHERE id=$1',[uid,JSON.stringify(data)],function(err,res){
        cb(err);
//        if (err){
//            cb(err);
//            return;
//        }
//
//        if (res.rowCount === 0) cb(null,null);
//        else cb(null,res.rows[0]);
    });
};

usersDBDataSource.prototype.createUserRecord = function(cb){
    var self = this;

    self.db.query('INSERT INTO "'+self.tableName+'" DEFAULT VALUES RETURNING *',function(err,res){
        if (err){
            cb(err);
            return;
        }
        cb(null,{id:res.rows[0].id, data:JSON.parse(res.rows[0].data)});
    });
};

usersDBDataSource.prototype.deleteUserRecord = function(uid,cb){
    var self = this;

    self.db.paramQuery('DELETE FROM "'+self.tableName+'" WHERE id = $1 ;',[uid],cb);
};

module.exports = usersDBDataSource;