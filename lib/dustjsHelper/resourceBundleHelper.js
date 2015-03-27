'use strict';
/**
 * Author: j.navarro@iscale.welcome-rt.com
 *
 */

var i18n = require('makara');
var nconf = require('nconf');

(function(dust) {

    /**
     * getMessage - gets message value from a bundle using a dynamic key.
     *              This is an alternative to {@pre type="content" key="key.name"/}.
     *              The former doesn't work when a dynamic content is passed 
     *              (.e.g  {@pre type="content" key="{dynamicKey}}"/})
     *              Example: {@getMessage key="{dynamicKey}" bundle="bundleName"/}
     *  
     */
    dust.helpers.getMessage = function(chunk, context, bodies, params) {
        var config = nconf.get('i18n');
        var provider = i18n.create(config);
        //var bundleName=__filename.substring(__dirname.length+1,__filename.indexOf('.'));
        //var fallbackLang = nconf.get('i18n').fallback || 'en-US';
		var fallbackLang = dust.helpers.tap(params.locale, chunk, context);
        var lang = (context.stack.head.context && context.stack.head.context.locality) || fallbackLang;
        var key = dust.helpers.tap(params.key, chunk, context);
        var bundleName = dust.helpers.tap(params.bundle, chunk, context);

        return chunk.map(function(chunk) {
            provider.getBundle(bundleName, lang, function(err, bundle) {
                var output = '';
                if (!err) {
                    output = bundle.get(key);
                }
                chunk.end(output);
            });
        });
    };

})(typeof exports !== 'undefined' ? module.exports = require('dustjs-helpers') : dust);