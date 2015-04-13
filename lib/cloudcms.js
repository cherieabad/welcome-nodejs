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
var connect = module.exports.connect = function(req, callback) {

    // make a copy of the cloudcms config
    var config = JSON.parse(JSON.stringify(req.cloudcmsConfig));

    // set key to "{applicationId}:{sessionId}"
    config.key = config.application + ":" + req.session.id;

    Gitana.connect(config, function(err) {

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
    _bindCommon(server);
    _bindRequest(server);
    _bindStaticRoute(server);
    _bindSetLocaleRoute(server);
};

/**
 * Pre-populates the request with req.tenantCd, req.styleConfig, req.tenantConfig and req.cloudcmsConfig
 * so that they can be used by routes.
 *
 * @param server
 * @private
 */
var _bindCommon = function(server) {

    var absConfigPath = path.join(__dirname, "../config");

    server.use(function(req, res, next) {

        // req.tenantCd
        var tenantCd = req.query.tenantCd;
        if (!tenantCd) {
            res.status(503).send("You must identify a tenantCd");
            return;
        }
        req.tenantCd = tenantCd;

        // all of the configs
        nconf.file({file: path.join(absConfigPath, "settingsTenant" + tenantCd + ".json")});
        req.styleConfig = nconf.get("styleConfig");
        req.tenantConfig = nconf.get("tenantConfig");
        req.cloudcmsConfig = nconf.get("cloudcmsConfig");

        next();
    });
};

/**
 * Pre-populates the request with req.cms and req.branch so that they can be used by routes.
 *
 * @param server
 * @private
 */
var _bindRequest = function(server) {

    server.use(function(req, res, next) {

        // req.cms and req.branch
        connect(req, function(err, cms, branch) {

            if (err) {
                res.status(503).send("Unable to connect to Cloud CMS for tenant: " + req.tenantCd);
                return;
            }

            req.cms = cms;
            req.branch = branch;

            // ensure driver locale is set
            if (req.session.locale) {
                req.cms.getDriver().setLocale(req.session.locale);
            }

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

var _bindSetLocaleRoute = function(server) {

    server.get("/locale/:locale", function(req, res) {

        // switch session locale
        req.session.locale = req.params.locale;

        // redirect back
        res.redirect(req.headers["referer"]);
    });
};
