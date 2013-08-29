/**
 * Created with IntelliJ IDEA.
 * User: cheshkov
 * Date: 26.08.13
 * Time: 15:10
 * To change this template use File | Settings | File Templates.
 */

module.exports = SharedPool;

function SharedPool(){
    this.loaded = {};
    this.loading = {};
    this.loadCallbacks = {};
    this.refCount = {};
}

SharedPool.prototype.get = function(id,cb){
    if (this.loaded[id]){
        this.refCount[id]++;
        cb(null,this.loaded[id],this._release.bind(this,id));
        return;
    }

    this.loadCallbacks[id] = this.loadCallbacks[id] || [];
    this.loadCallbacks[id].push(cb);

    if (! this.loading[id]) {
        this._load(id);
    }
};

SharedPool.prototype._release = function(id){
    this.refCount[id]--;
    if (this.refCount[id] === 0){
        this._remove(id);
    }
};

SharedPool.prototype._remove = function(id){
    delete this.loaded[id];
};

SharedPool.prototype._load = function(id){
    this.loading[id] = true;
    this.load(id,this._onLoad.bind(this,id));
};

SharedPool.prototype.load = function(id,cb){
    cb(new Error("Unimplemented SharedPool.load - you should provide your own implementation"));
};

function noop(){}

SharedPool.prototype._onLoad = function(id,err,res){
    this.loading[id] = false;

    if (err){
        for (var i in this.loadCallbacks[id]){
            this.loadCallbacks[id][i](err,null,noop);
        }
        delete this.loadCallbacks[id]
        return;
    }

    this.refCount[id] = this.loadCallbacks[id].length;
    this.loaded[id] = res;

    for (var i in this.loadCallbacks[id]){
        this.loadCallbacks[id][i](null,res,this._release.bind(this,id));
    }
    delete this.loadCallbacks[id];
};