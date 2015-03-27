'use strict';

var log4js = require('log4js');
var logId = 'MLP';

var logger = function () {
	var logger = log4js.getLogger(logId);
	return {
		config: function(conf) {
                        console.log('logUtil: Logger configuration');
			log4js.configure(conf);
		},
		initialize: function () {
		   return function (req, res, next) {
			    	log4js.connectLogger(logger, { level: 'auto' }); //connect console.log to the logger
			    	next();
		    	};
		},
		info:function(message){
			logger.info(message);
		},
		debug:function(message){
			logger.debug(message);
		},
		trace:function(message){
			logger.trace(message);
		},
		warn:function(message){
			logger.warn(message);
		},
		error:function(err){
			logger.error(err);
		},
		fatal:function(err){
			logger.fatal(err);
		}
	};
};

module.exports = logger();
