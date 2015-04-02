var Gitana = require('gitana');
var nconf = require('nconf');
var fs = require('fs');
var path = require('path');

var async = require('async');

var http = require('http');
var https = require('https');
var httpProxy = require('http-proxy');

module.exports = {};

require('ssl-root-cas').inject();

/**
 * Initialize connections to Cloud CMS for all tenants from the config directory.
 * We connect in parallel on server startup.
 *
 * Once the connections complete (or fail), the callback is fired.
 * The errors passed back if any have occurred.
 *
 * @type {Function}
 */
var init = module.exports.init = function(callback) {

    var absConfigPath = path.join(__dirname, "../config");

    var fns = [];

    var filenames = fs.readdirSync(absConfigPath);
    for (var i = 0; i < filenames.length; i++)
    {
        if (filenames[i].indexOf("settingsTenant") === 0)
        {
            nconf.file({file: path.join(absConfigPath, filenames[i])});

            var cloudcmsConf = nconf.get("cloudcmsConfig");
            var tenantConf = nconf.get("tenantConfig");

            var fn = function(cloudcmsConf, tenantConf) {
                return function(done) {

                    connect(cloudcmsConf, function(err) {

                        if (err) {
                            console.log("Failed to connect to tenant: " + tenantConf.TENANT_CODE + ", err: " + JSON.stringify(err));
                        } else {
                            console.log("Successfully connected to tenant: " + tenantConf.TENANT_CODE);
                        }

                        done();
                    });

                }
            }(cloudcmsConf, tenantConf);
            fns.push(fn);
        }
    }

    async.parallel(fns, function(errs) {
        callback(errs);
    });
};

/**
 * Connects to Cloud CMS for a given JSON configuration.  Each "tenant" is actually a Cloud CMS application connected
 * to it's own project.
 *
 * There are two projects:
 *
 *    iRedeemSpend-DEV-1.0
 *    iRedeemSpend-TEST-1.0
 *
 * And each project has an application with it's own API Keys.  The API Keys are defined in settingsTenant1.json
 * and settingsTenant2.json.
 *
 * These can be seen here:
 *
 *    https://collinson.cloudcms.net/#/developers
 *
 * Cloud CMS driver connections are cached.  These are connected and cached on server startup (using the init() method).
 * All of this caching is handled internally within the Gitana.connect() method and is cached based on the
 * "application" key.
 *
 * This connect() method does a little extra work to hand back the master branch (since this is most frequently what
 * a web application would want to work with).
 *
 * @type {Function}
 */
var connect = module.exports.connect = function(cloudcmsConf, callback) {

    Gitana.connect(cloudcmsConf, function(err) {

        if (err) {
            callback(err);
            return;
        }

        var cms = this;

        this.datastore("content").readBranch("master").then(function () {
            callback(null, cms, this);
        });

    });

};

/**
 * Sets up Express Middleware to make integration with Cloud CMS as simple as possible.
 *
 * @type {Function}
 */
var routes = module.exports.routes = function(server) {
    _bindRequest(server);
    _bindStaticRoute(server);
};

/**
 * Pre-populates the request with req.tenantCd, req.cms and req.branch so that they can be used by routes.
 *
 * @param server
 * @private
 */
var _bindRequest = function(server) {

    var absConfigPath = path.join(__dirname, "../config");

    server.use(function(req, res, next) {

        // req.tenantCd
        var tenantCd = req.query.tenantCd;
        if (!tenantCd) {
            res.status(503).send("You must identify a tenantCd");
            return;
        }
        req.tenantCd = tenantCd;


        // req.cms and req.branch
        nconf.file({file: path.join(absConfigPath, "settingsTenant" + tenantCd + ".json")});
        var cloudcmsConfig = nconf.get("cloudcmsConfig");
        connect(cloudcmsConfig, function(err, cms, branch) {

            if (err) {
                res.status(503).send("Unable to connect to Cloud CMS for tenant: " + tenantCd);
                return;
            }

            req.cms = cms;
            req.branch = branch;

            next();
        });

    });
};

/**
 * Sets up a /static route for use in retrieving static assets.
 */
var _bindStaticRoute = function(server) {

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    var proxyConfig = {
        "target": "https://api.cloudcms.com",
        "keepAlive": true,
        "keepAliveMsecs": 1000 * 60 * 5
    };

    var proxyServer = new httpProxy.createProxyServer(proxyConfig);
    proxyServer.on("error", function(err, req, res) {
        console.log(err);
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });

        res.end('Something went wrong while proxying the request.');
    });

    var proxyHandlerServer = http.createServer(function(req, res) {

        req.headers["host"] = "api.cloudcms.com";

        // copy the authorization header into the proxy request to allow things to flow through
        req.headers["Authorization"] = req.cms.platform().getDriver().getHttpHeaders()["Authorization"];

        for (var k in req.headers) {
            console.log(" -> " + k + " = " + req.headers[k]);
        }

        // proxy
        proxyServer.web(req, res);
    });
    var proxyHandler = proxyHandlerServer.listeners('request')[0];

    server.get("/static/:node", function(req, res) {

        var nodeId = req.params["node"];
        var attachmentId = "default";

        req.url = path.join(req.branch.getUri(), "nodes", nodeId, "attachments", attachmentId);

        proxyHandler(req, res);
    });

    server.get("/static/:node/:attachment", function(req, res) {

        var nodeId = req.params["node"];
        var attachmentId = req.params["attachment"];

        req.url = path.join(req.branch.getUri(), "nodes", nodeId, "attachments", attachmentId);

        proxyHandler(req, res);
    });

};


