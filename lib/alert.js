'use strict';

//var i18nUtil = require('./i18nUtil');

function addAlert ( req, type, msg ) {

	var locale = req.session.locale;
	if ( !req.session.hasOwnProperty('alerts') ) {
		req.session.alerts = [];
	}
        req.session.alerts.push({type: type, msg : msg, locale: locale});
}

exports.info = function( req, msg ) {
	addAlert(req,'info',msg);
};

exports.success = function( req, msg ) {
	addAlert(req,'success',msg);
};

exports.warning = function( req, msg ) {
	addAlert(req,'warning',msg);
};

exports.error = function( req, msg ) {
	addAlert(req,'error',msg);
};

// TODO - getAndReset... return alerts and reset the current alerts stored in the session
