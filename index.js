'use strict';

var alert = require('./lib/alert');
var templateModel = require('./lib/templateModel');
var gitana = require("gitana");

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
            gitana.connect(function(err) {
                // if we were unable to connect, send back an error
                if (err) {
                    res.send(500, "Could not connect to Cloud CMS, please check your gitana.json configuration file: " + JSON.stringify(err));
                    return;
                } else {
                    /* PREMISE: For local storage purposes
                     * 1. This portion of code should traverse the projects of all configured tenants
                     * 2. Each tenant will have its own project and a designated user
                     * 3. Each page will have the following:
                     *    - definition (a definition is mainly based on specific UI, i.e. landing page, home page)
                     *    - form based on the created definition
                     *    - content instance for each form
                     */
                    logger.info(">>>>>>>>> GITANA CONNECTION SUCCESSFUL!!!");

                    var platform = this;
                    
                    platform.listRepositories().each(function() {
                        var repository = this;
                        console.log("Repository: " + JSON.stringify(repository));
                        console.log("Repository title: " + this.get("title"));

                        repository.listBranches().each(function() {
                            var branch = this;
                            console.log("Branch: " + JSON.stringify(branch));
                            console.log("Branch title: " + this.get("title"));

                            // TEST 1: Read a node by searching a node using a keyword - Working
                            branch.searchNodes("CMS").then(function() {
                                console.log("Found a node via keyword search: " + JSON.stringify(this));
                            });

                            // TEST 2: Read a node by node id - not working
                            var nodeId = "d0296a766d643a70dbef";

                            // here we read by node ID
                            branch.readNode(nodeId).then(function() {
                                console.log("Found node using node ID: " + JSON.stringify(this));
                            });
							
                            // TEST 3: Read a node by qname - not working
                            var qname = "testdefinition:data01";


                            // here we read by QName
                            branch.readNode(qname).then(function() {
                                console.log("Found node using qname: " + JSON.stringify(this));
                            });
                        });
                    });
                }
            });
        }
    });
}

module.exports = app;
