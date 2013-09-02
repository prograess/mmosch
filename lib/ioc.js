var async = require('async');

var DEFAULT_INIT = 'init';


function getBeanConstructor(cons){
    if (typeof cons === "string"){
        return require(cons);
    }
    if (typeof cons === "function"){
        return cons;
    }

    throw new Error("Illegal constructor: " + cons);
}

function getInitName(beanConfig){
    if (beanConfig.hasOwnProperty('init')) return beanConfig['init'];
    return DEFAULT_INIT;
}

function Ref(beanName){
    this.name = beanName;
}

function Map(cons){
    this.cons = cons;
}

function IOCContainer(){
    this.beans = {};
    this.config = {};
}

module.exports.IOCContainer = IOCContainer;
module.exports.Ref = Ref;
module.exports.Map = Map;

IOCContainer.prototype.init = function(cb){
    var self = this;

    try {
        self._initTasks = {};
        self._constructBeans();
        self._wireProperties();
        self._autowirePropertiesByName();
    }
    catch (e) {cb(e); return;}

    self._initBeans(cb);
};

IOCContainer.prototype._constructBeans = function(){
    var self = this;

    for (var beanName in self.config['beans']){
        self._constructBean(beanName);
        self._initTasks[beanName] = [];
    }
};

IOCContainer.prototype._constructBean = function(id){
    var self = this;

    var beanConfig = self.config['beans'][id];
    if (! beanConfig){
        throw new Error('Bean "'+id+'" not found');
    }

    var cons = getBeanConstructor(beanConfig['cons']);
    self.beans[id] = new cons();
};

IOCContainer.prototype._checkCyclic = function(){
    var self = this;

    var beanName;
    var pendingBeans = {};
    for (beanName in self.beans){
        pendingBeans[beanName] = true;
    }

    var insideBeans = {};
    var visitedBeans = {};

    function dfs(rootName){
        delete pendingBeans[rootName];
        insideBeans[rootName] = true;

        for (var i in self._initTasks[rootName]){
            var depName = self._initTasks[rootName][i];
            if (insideBeans[depName]) throw new Error("Cyclic dependency on " + depName);
            dfs(depName);
        }

        delete insideBeans[rootName];
        visitedBeans[rootName] = true;
    }

    for (beanName in pendingBeans){
        dfs(beanName);
    }
};

IOCContainer.prototype._initBeans = function(cb){
    var self = this;

    try {
        self._checkCyclic();

        for (var beanName in self.beans){
            var beanConfig = self.config['beans'][beanName];
            var bean = self.beans[beanName];
            var init = getInitName(beanConfig);
            if (bean[init] !== undefined){
                self._initTasks[beanName].push(bean[init].bind(bean));
            }
            else {
                delete self._initTasks[beanName];
                for (var beanName2 in self.beans){
                    if (! self._initTasks[beanName2]) continue;
                    var index = self._initTasks[beanName2].indexOf(beanName);
                    if (index !== -1){
                        self._initTasks[beanName2].splice(index,1);
                        continue;
                    }
                }
            }
        }
    }
    catch (e) {cb(e); return;}

    async.auto(self._initTasks,cb);
};

IOCContainer.prototype._autowirePropertiesByName = function(){
    var self = this;

    for (var beanName in self.beans){
        var bean = self.beans[beanName];

        for (var k in bean){
            if (bean[k] !== undefined){
                continue;
            }

            if (self.beans[k]){
                bean[k] = self.beans[k];
                self._initTasks[beanName].push(k);
                continue;
            }

            throw new Error("Property " + k + " of bean " + beanName + " not found");
        }
    }
};

IOCContainer.prototype._wireProperties = function(){
    var self = this;

    for (var beanName in self.beans){
        var bean = self.beans[beanName];
        var beanConfig = self.config['beans'][beanName];
        if (beanConfig['props'] === undefined) continue;

        for (var k in bean){
//            if (bean[k] !== undefined){
//                continue;
//            }

            if (beanConfig['props'][k]){
                var propConf = beanConfig['props'][k];
                if (propConf instanceof Ref){
                    var ref = propConf.name;
                    bean[k] = self.beans[ref];
                    self._initTasks[beanName].push(ref);
                }
                else if (propConf instanceof Map){
                    bean[k] = {};

                    var cons = getBeanConstructor(propConf.cons);
                    for (var beanName2 in self.beans){
                        if (self.beans[beanName2] instanceof cons){
                            bean[k][beanName2] = self.beans[beanName2];
                            self._initTasks[beanName].push(beanName2);
                        }
                    }
                }
                else {
                    bean[k] = propConf;
                }
            }

//            throw new Error("Property " + k + " of bean " + beanName + " not found");
        }
    }
}