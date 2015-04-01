var Gitana = require('gitana');
var nconf = require('nconf');
var fs = require('fs');
var path = require('path');

var async = require('async');

module.exports = {};

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


