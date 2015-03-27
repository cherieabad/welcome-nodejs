'use strict';

var templateModel = require('../lib/templateModel');
var alert = require('../lib/alert');
var logger = require('../lib/logUtil');
var nconf = require('nconf');

module.exports = function(server) {
    server.get('/ajax/setLanguage', function(req, res) {
        logger.debug('<< AJAX REQUEST for setLanguage locale-' + req.query.locale);
        res.cookie('locale', req.query.locale);
        res.locals.context = {
            locality: req.query.locale
        };
        req.session.locale = req.query.locale;
        var tenantInfo = req.session.tenantInfo;
        tenantInfo.tenantLang = req.query.locale;

        //Below if is added to allow language selection after user log out
        if (req.session.user) {
            var user = req.session.user;
            user.languageChanged = true;
            req.session.user = user;
        }

        req.session.tenantInfo = tenantInfo;

        //logger.debug('Within setLanguage locale set to -' + tenantInfo.tenantLang);
        res.json({flag: 'success'});
    });

};
