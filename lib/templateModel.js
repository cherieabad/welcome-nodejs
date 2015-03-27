'use strict';

module.exports = function (req) {

    var tmpModel = {
        user: req.session.user,
        alerts: req.session.alerts,
        reqBody: req.body,
        menu: req.session.menu,
        tenantInfo: req.session.tenantInfo
    };

    // TODO - cleaner to call the 'alert' module to get/reset
    // reset the alerts recorded in the session, as we're about to display them
    req.session.alerts = [];

    return tmpModel;
};
