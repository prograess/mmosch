var async = require('async');
var Logger = require('./log');
var logger = Logger.getLogger("IOC");

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

function copyBeans(from,to){
	var beanName,propName;

	for (beanName in from.beans){
		if (! from.beans.hasOwnProperty(beanName)) continue;

		var beanConf = from.beans[beanName];
		if (! to.beans[beanName]) to.beans[beanName] = {};
		var newBeanConf = to.beans[beanName];
		if (beanConf.cons) {
			newBeanConf.cons = beanConf.cons;
		}
		if (beanConf.props) {
			if (!newBeanConf.props) newBeanConf.props = {};
			for (propName in beanConf.props) {
				if (!beanConf.props.hasOwnProperty(propName)) continue;
				var propVal = beanConf.props[propName];
				newBeanConf.props[propName] = propVal;
			}
		}
	}
}

function extend(base,ext){
	var res = {
		static: null,
		beans: {}
	};

	res.static = function(){
		if (base.static) base.static();
		if (ext.static) ext.static();
	};

	copyBeans(base,res);
	copyBeans(ext,res);
	return res;
}

module.exports.IOCContainer = IOCContainer;
module.exports.Ref = Ref;
module.exports.Map = Map;
module.exports.extend = extend;

IOCContainer.prototype.init = function(cb){
    var self = this;

    try {
		self._staticInit();
        self._initTasks = {};
        self._constructBeans();
        self._wireProperties();
        self._autowirePropertiesByName();
    }
    catch (e) {cb(e); return;}

    self._initBeans(cb);
};

IOCContainer.prototype._staticInit = function(){
	if (this.config['static']) this.config['static']();
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
                function _init(name,bean,init,cb){
                    logger.info("Initializing " + name);
                    bean[init](function(err){
						if (err){
							logger.error("Error initializing " + name);
						}
						else{
							logger.info("Initialized " + name);
						}
                        cb(err);
                    });
                }
                self._initTasks[beanName].push(_init.bind(null,beanName,bean,init));
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

            if (beanConfig['props'].hasOwnProperty(k)){
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
