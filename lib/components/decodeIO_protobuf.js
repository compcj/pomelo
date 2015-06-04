var fs = require('fs');
var path = require('path');
var protobuf = require('protobufjs');
var Constants = require('../util/constants');
var crypto = require('crypto');
var logger = require('pomelo-logger').getLogger('pomelo', __filename);

module.exports = function(app, opts) {
  return new Component(app, opts);
};

var Component = function(app, opts) {
  this.app = app;
  this.protoMap = {};
  this.protoKeyMap = {};
  this.messageSchemaCache = {};
  opts = opts || {};
  this.serverProtos = {};
  this.clientProtos = {};
  this.version = "";
  this.builder = protobuf.newBuilder();
  this.keyCount = 0;
  this.keyPrefix = 'a';
  
  var env = app.get(Constants.RESERVED.ENV);
  var originServerPath = path.join(app.getBase(), Constants.FILEPATH.SERVER_PROTOS);
  var presentServerPath = path.join(Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.SERVER_PROTOS));
  var originClientPath = path.join(app.getBase(), Constants.FILEPATH.CLIENT_PROTOS);
  var presentClientPath = path.join(Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.CLIENT_PROTOS));

  this.serverProtosPath = opts.serverProtos || (fs.existsSync(originClientPath) ? Constants.FILEPATH.SERVER_PROTOS : presentServerPath);
  this.clientProtosPath = opts.clientProtos || (fs.existsSync(originServerPath) ? Constants.FILEPATH.CLIENT_PROTOS : presentClientPath);

  this.init(path.join(app.getBase(), this.serverProtosPath), path.join(app.getBase(), this.clientProtosPath));
};

var pro = Component.prototype;

pro.name = '__decodeIO_protobuf__';


pro.getMessageSchema(key) {
  if (this.messageSchemaCache[key] == undefined) {
    this.messageSchemaCache[key] = builder.build(this.protoKeyMap[key]);
  return this.messageSchemaCache[key];
}

pro.encode = function(key, msg) {
  var messageSchema = this.getMessageSchema(key);
  var msgObj = new messageSchema(msg);
  return msgObj.encode();
};

pro.encode2Bytes = function(key, msg) {
  var buffer = this.encode(key, msg);
  if(!buffer || !buffer.length){
		console.warn('encode msg failed! key : %j, msg : %j', key, msg);
		return null;
	}
	var bytes = new Uint8Array(buffer.length);
	for(var offset = 0; offset < buffer.length; offset++){
		bytes[offset] = buffer.readUInt8(offset);
	}

	return bytes;
};

pro.decode = function(key, msg) {
  var msgSchema = this.getMessageSchema(key);
  return msgSchema.decode(msg);
};

pro.getProtos = function() {
  return {
    server : this.serverProtos,
    client : this.clientProtos,
    version : this.version
  };
};

pro.getVersion = function() {
  return this.version;
};

pro.init = function(serverProto, clientProto) {
  this._setProtos(Constants.RESERVED.CLIENT, clientProto);
  this._setProtos(Constants.RESERVED.SERVER, serverProto);
  this.updateVersion();
}

pro.updateVersion = function() {
  var protoStr = this.clientProtos + this.serverProtos;
  this.version = crypto.createHash('md5').update(protoStr).digest('base64');
}

pro.setProtos = function(type, path) {
  this._setProtos(type, path);
  this.updateVersion();
}
pro._setProtos = function(type, path) {
  if(!fs.existsSync(path)) {
    return;
  }

  if(type === Constants.RESERVED.SERVER) {
    this.serverProtos = self.parse(require(path));
    protobuf.loadProto(this.serverProtos, this.builder);
  }

  if(type === Constants.RESERVED.CLIENT) {
    this.clientProtos = self.parse(require(path));
    protobuf.loadProto(this.clientProtos, this.builder);
  }
};

pro.parse = function(protos) {
  this.keyCount ++;
  var proto = '';
  for (var key in protos) {
    this.protoKeyMap[key] = this.prefix + this.keyCount;
    proto += "message " + this.protoKeyMap[key] + JSON.stringify(protos[key]);
  }
  return proto;
}

