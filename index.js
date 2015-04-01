'use strict';

var alert = require('./lib/alert');
var templateModel = require('./lib/templateModel');

var cloudcms = require('./lib/cloudcms');

var kraken = require('kraken-js'),
        fs = require('fs'),
        logger = require('./lib/logUtil'),
        app = {};

app.supportedLocales = [];

app.configure = function configure(nconf, next) {
    // Async method run on startup.
    // Fired when an app configures itself
    // Get supported locales
    var i18n = nconf.get('i18n');
    var countries = fs.readdirSync(i18n.contentPath);
    for (var i = 0; i < countries.length; i++) {
        var country = countries[i];
        var countryPath = i18n.contentPath + '/' + country;
        var languages = fs.readdirSync(countryPath);
        for (var j = 0; j < languages.length; j++) {
            app.supportedLocales.push((languages[j] + '-' + country).toLowerCase());
        }
    }
    //Initialize logger
    logger.config(nconf.get('loggerConfig'));

    // Required for Alert messages show through out applicaiton.
    require('./lib/dustjsHelper/resourceBundleHelper');

    next(null);

};

app.requestStart = function requestStart(server) {
    // Run before most express middleware has been registered.
};

app.requestBeforeRoute = function requestBeforeRoute(server) {
    // Run before any routes have been added.
    // Fired before routing occurs
    server.use(logger.initialize());
    // Run before any routes have been added.
    server.use(function(req, res, next) {
        var sessionLocale;
        if (req.session.tenantInfo !== undefined) {
            sessionLocale = req.session.tenantInfo.tenantLang;
        }
        var locale = 'en-US';
        if (sessionLocale !== undefined) {
            locale = sessionLocale;
        }

        res.locals.context = {
            locality: locale
        };
        next();
    });
};

app.requestAfterRoute = function requestAfterRoute(server) {
    // Run after all routes have been added.

    //Handling application errors and displaying 500 custom error page.
    server.use(function(err, req, res, next) {
        logger.error(" [Main App - req url] : " + req.url);
        if (err) {
            logger.error(" [Application Error - Main App stack] :\n " + err.stack);
            alert.error(req, "alert.error.internalError");
            delete req.session.user;
            var model = templateModel(req);
            res.render('login', model);
        } else {
            next();
        }
    });
};

if (require.main === module) {
    kraken.create(app).listen(function(err, server) {
        if (err) {
            console.error(err.stack);
        } else {

            // start up cloud cms connections to all tenants
            cloudcms.init(function(errs) {

                if (errs && errs.length > 0)
                {
                    for (var i = 0; i < errs.length; i++)
                    {
                        res.send(500, "Could not connect to Cloud CMS, please check your gitana.json configuration file: " + JSON.stringify(errs[i]));
                    }

                    return;
                }

                console.log("Connected to all Cloud CMS tenants");

            });
        }
    });
}

module.exports = app;
