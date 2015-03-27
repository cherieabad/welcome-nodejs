'use strict';
var logger        = require('../lib/logUtil');

module.exports = function () {
    return function (req, res, next) {

        var locale = req.cookies && req.cookies.locale;
        logger.info(' $$$$$$$ req.locale:: '+locale);
        //Set the locality for this response. The template will pick the appropriate bundle
        res.locals.context = {
            locality: locale
        };
        next();
    };
};
