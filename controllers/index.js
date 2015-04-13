'use strict';


var templateModel = require('../lib/templateModel');
var alert = require('../lib/alert');
var logger = require('../lib/logUtil');
var nconf = require('nconf');
//var globalize = require('../lib/globalize');

module.exports = function(server) {
    server.get('/', function(req, res) {
        logger.info('*** Index.js GET function with tenant ID parameter');
        // Retrieve the tenant id from the URL
        //var tenantId = req.query.tenantId;
        var tenantCd = req.query.tenantCd;
        logger.info('*** Index.js tenantCd - ' + tenantCd);
        var styleConf, tenantConf, cloudcmsConf;

        // Get the default configuration based on the tenant id
        nconf.file({file: 'config/settingsTenant' + tenantCd + '.json'});
        styleConf = nconf.get('styleConfig');
        tenantConf = nconf.get('tenantConfig');
        cloudcmsConf = nconf.get('cloudcmsConfig');

        if (styleConf === '') {
            nconf.file({file: 'config/defaultSettings.json'});
            styleConf = nconf.get('styleConfig');
        }
        if (tenantConf === '') {
            nconf.file({file: 'config/defaultSettings.json'});
            tenantConf = nconf.get('tenantConfig');
        }

        // Once the login is successful, these settings should be put into session
        var model = templateModel(req);
        // set tenantInfo as a JSON format
        var tenantInfo = {
            tenantLogoFilename: styleConf.TENANT_LOGO_FILENAME,
            tenantCssFilename: styleConf.TENANT_CSS_FILENAME,
            tenantCode: tenantConf.TENANT_CODE,
            tenantId: tenantConf.TENANT_INT_ID,
            tenantSupportedLang: tenantConf.SUPPORTED_LANGUAGE_LIST,
            tenantLang: tenantConf.DEF_LANG,
            tenantCurrency: tenantConf.CURRENCY,
            tenantTimezone: tenantConf.TIMEZONE,
            tenantCtryRes: tenantConf.RESIDENCE_COUNTRY_DEFAULT,
            tenantCtryList: tenantConf.COUNTRY_LIST
        };

        var user = req.session.user;

        if (user !== undefined) {
            user.languageChanged = false;
        } else {
            // this is flag for to continue User login process..
            user = {languageChanged: false, hasLoggedInBefore: false};
        }

        req.session.user = user;

        //Overwrite the def lang with the one already in session (set by user)
        if (req.session.locale) {
            tenantInfo.tenantLang = req.session.locale;
        } else {
            req.session.locale = tenantInfo.tenantLang;
        }

        req.session.tenantInfo = tenantInfo;
        model.tenantInfo = tenantInfo;
        //logger.debug('*** Index.js locale - ' + tenantInfo.tenantLang);

        //Setting the locale to def lang
        res.locals.context = {locality: tenantInfo.tenantLang};

        /**
         * The Cloud CMS middleware provided in cloudcms.js sets up req.branch for us.  We can simply use this
         * to retrieve anything we'd like for the current tenant.
         *
         * Let's find news items...
         */
        req.branch.queryNodes({
            //"_type": "test:news_item",
            "_doc": "15266453e731fd70e188"
        }).then(function() {

            // nodes as a list
            model.newsItems = this.asArray();

        }).then(function() {

            // now render the view
            res.render('login', model);
        });

    });

};
