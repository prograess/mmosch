function usersDBDataSource(){
	this.tableName = 'Users';
	this.fields = [];
	//deps
	this.db = undefined;
}

usersDBDataSource.prototype.init = function(cb){
	this.db.query('SELECT * FROM "'+this.tableName+'" LIMIT 1',cb);
};

usersDBDataSource.prototype.findUserRecord = function(uid,cb){
	var self = this;
	this.db.paramQuery('SELECT * FROM "'+this.tableName+'" WHERE id=$1',[uid],function(err,res){
		if (err){
			cb(err);
			return;
		}

		if (res.rowCount === 0){
			cb(null,null);
			return;
		}

		var u = {id:uid};
		u.data = JSON.parse(res.rows[0].data);
		for (var i in self.fields){
			var f = self.fields[i];
			u.data[f] = res.rows[0][f];
		}

		cb(null,u);
	});
};

usersDBDataSource.prototype.saveUserRecord = function(uid,data,cb){
	var data_l = JSON.parse(JSON.stringify(data));

	var sql = "";
	sql += 'UPDATE "'+this.tableName+'" SET';
	var fvals = [];
	var pnum = 1;
	for (var i in this.fields){
		if (i>0) sql += ',';
		var f = this.fields[i];
		sql += ' "' + f + '"=$' + pnum;
		fvals[pnum-1] = data_l[f];
		delete data_l[f];
		pnum++;
	}
	sql += ', data=$' + pnum;
	fvals[pnum-1] = JSON.stringify(data_l);
	pnum++;
	sql += ' WHERE id=$' + pnum;
	fvals[pnum-1] = uid;
	pnum++;

	this.db.paramQuery(sql,fvals,cb);
};

usersDBDataSource.prototype.createUserRecord = function(cb){
	var self = this;

	var sql = "";
	sql += 'INSERT INTO "'+self.tableName+'" DEFAULT VALUES RETURNING *';

	self.db.query(sql,function(err,res){
		if (err || res.rowCount == 0){
			cb(err);
			return;
		}

		var u = {id:res.rows[0].id};
		u.data = JSON.parse(res.rows[0].data);
		for (var i in self.fields){
			var f = self.fields[i];
			u.data[f] = res.rows[0][f];
		}

		cb(null,u);
	});
};

usersDBDataSource.prototype.deleteUserRecord = function(uid,cb){
	var self = this;

	self.db.paramQuery('DELETE FROM "'+self.tableName+'" WHERE id = $1 ;',[uid],cb);
};

module.exports = usersDBDataSource;