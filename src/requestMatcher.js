"use strict";

import Debug  from "debug";
const debug = Debug("smocker");

function match(req, resources) {
    let reqUrl = req.url,
        reqMethod = req.method,
        result = {
            resourcePath: null,
            pathPars: []
        };

    resources.find ((res)=> {

        let match = res.rgx.exec(reqUrl);

        if (match) {
            debug("requestMatcher - found matching resource dir for request: " + reqUrl);
            result.resourcePath = res.path + "/" + reqMethod.toLowerCase() + ".js";
            result.pathPars = match.slice(1);
        }

        return match; //no need to continue looking
    });

    return result;
}

export {match};