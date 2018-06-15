var redis = require('redis');
var {redisConf} = require('../config');

class Cache {
	constructor() {
		this._init()
	}
	
	_init() {
		this.client = redis.createClient(redisConf.port, '127.0.0.1', {no_ready_check: true});
		// this.client.auth(redisConf.password, function () {
		// 	console.log('通过认证！')
		// });
		this.client.on('ready', function (res) {
			console.log('ready')
		});
		this.client.on('error', function (err) {
			console.log('Error: ' + err)
		})
	}
	
	get(key, fn) {
		return this.client.get(key, fn)
	}
	
	set(key, value, fn) {
		return this.client.set(key, value, fn)
	}
	
	expire(key, fn) {
		return this.client.expire(key, redisConf.expireTime, fn)
	}
	
	exit() {
		this.client.quit()
	}
}

module.exports = new Cache;