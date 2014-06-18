var util = require('util');
var AuthMethod = require('../authMethod.js');
var crypto = require('crypto');
var Logger = require('../log.js');

//var log = Logger.getLogger(path.relative(require.main.filename,__filename));
var log = Logger.getLogger(__filename);

function VK_auth_module(){
    this.config = undefined;
    this.authDataSource = undefined;
}
util.inherits(VK_auth_module,AuthMethod);

/**
 * Check VK auth checksum, md5(app_id + "_" + viewer_id + "_" + app_secret)
 * @param authData - contains app id, viewer id and received auth key
 * @param app_key - application secret
 * @return {Boolean}
 */

VK_auth_module.prototype.checkVKAuthKey = function(authData, app_key){
    log.info("received auth_key:" + authData['auth_key']);
    var auth_key = crypto.createHash('md5');
    auth_key.update( authData['api_id'] + "_" + authData['viewer_id'] + "_" + app_key );
    auth_key = auth_key.digest('hex');
    log.info("calculated auth_key:" + auth_key);
    return auth_key == authData['auth_key'];
};

VK_auth_module.prototype.checkVKData= function(config,authObject){
    var self = this;

    log.info("checkVKData start");
    log.info("VK authObject:" + JSON.stringify(authObject));

    if (! authObject['api_id']) {
        throw new Error("Application id (api_id) not found in authObject");
    }
    var appConfig =  config[authObject['api_id']];
    if (! appConfig){
        throw new Error("Application id (api_id) not found in config");
    }

    if (! authObject['viewer_id']){
        throw new Error("VK user id (viewer_id) not found in authObject");
    }

    if (appConfig['allowedIds']){
        if (appConfig['allowedIds'].indexOf(authObject['viewer_id']) === -1){
            throw new Error("vkUid " + authObject['viewer_id'] + " is not allowed");
        }
    }

    if (!self.checkVKAuthKey(authObject, appConfig['appKey'])){
        log.info("auth failed, wrong auth_key");
        throw new Error("VK authentication error");
    }
    //appParam = {"id":authObject.api_id, "appKey":appConfig.appKey};
    log.info("VK authentication OK");
};

/**
 * Authenticate user by VK data.
 * @param authObject - received "flash_vars", containing viewr_id, app_id, auth_key
 * @param callback - function(err,userID)
 *      if auth successful - err is null, and userID is id of user in our db (not vkUid)
 *      if auth data is valid, but user not found in db - err is null, and userId is null
 *      if auth data is invalid, or error happen - err is not null
 */
VK_auth_module.prototype.doVKAuth = function(config,authObject,callback){
    var self = this;

    try{
        self.checkVKData(config,authObject)
    }
    catch (e){
        callback(e);
        return;
    }

    self.authDataSource.findAuthRecord("vk",authObject['viewer_id'],function(err,res){
        if (err){
            log.info("FindAuthRecor by vkuid error:" + err);
            callback(err);
            return;
        }

        //create user if not registered yet
        if (! res){
            log.info("Record not found, vkUid="+authObject['viewer_id']);
            callback(null,null);
        } else {
            log.info("Record found, userId=" + res.uid.toString()+" vkUid="+authObject['viewer_id']);
            callback(null,res);
        }
    });
};

VK_auth_module.prototype.doRegister = function(config,uid,authObject,callback){
    var self = this;

    try{
        self.checkVKData(config,authObject)
    }
    catch (e){
        callback(e);
        return;
    }

    self.authDataSource.createAuthRecord(uid,"vk",authObject['viewer_id'],authObject,function(err,res){
        if (err){
            log.info("createAuthRecor error:" + err);
            callback(err);
            return;
        }

        log.info("Record created, userId=" + res.uid.toString()+" vkUid="+authObject['viewer_id']);
        callback(null,res);
    });
};

/**
 *
 * @param _config - configuration object.
 *   {"app_id":{appKey:"app_key", allowedIds:[id1,id2]}}
 *   app_id - your application id. One server support auth from many applications
 *   app_key - application secret key
 *   allowedIds - optional, array of vkUids, only they will authenticate.
 * @param callback - function(err)
 */
VK_auth_module.prototype.init = function(callback){
    var self = this;

    try {
        if (! self.authDataSource) throw new Error("authDataSource required");
        self.checkConfig();
    }
    catch(e){
        callback(e);
        return;
    }
    callback(null);
};

/**
 *
 * @param data - auth_data
 * @param callback - function(err,uid)
 */
VK_auth_module.prototype.auth = function(data, callback){
    if (! this.config){
        callback(new Error("Module not initialized"));
        return;
    }
    this.doVKAuth(this.config,data,callback);
};

VK_auth_module.prototype.register = function(uid, data, callback){
    if (! this.config){
        callback(new Error("Module not initialized"));
        return;
    }
    this.doRegister(this.config,uid,data,callback);
};


VK_auth_module.prototype.checkConfig = function(){
    if (!this.config) throw new Error("Empty config");
    for (var i in this.config){
        if (! this.config[i]["appKey"]){
            log.info("appKey not found in config["+i+"]");
            throw new Error("appKey not found in config["+i+"]");
        }
    }
};


module.exports = VK_auth_module;