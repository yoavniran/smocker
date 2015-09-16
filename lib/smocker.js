module.exports = (function () {
    "use strict";

    var http = require("http"),
        url = require("url"),
        qs = require("querystring"),
        fs = require("fs"),
        path = require("path"),
        _ = require("lodash"),
        debug = require("debug")("smocker");

    var JSON_TYPE = "application/json",
        JS_TYPE = "application/javascript",
        _resources = [],

        _defaults = {
            port: 9991,
            requestPrefix: "",
            resources: "./resources",
            dynamicSymbol: "$",
            addCorsHeader: true,
            corsEchoRequestHeaders: true
        };

    function start(config) {

        config = _.extend({}, _defaults, config);

        if (!path.isAbsolute(config.resources)) {
            config.parent = module.parent.parent || module.parent; //if used relative path, try and use the module that required index.js or smocker.js directly
        }

        _loadResources(config);

        var server = http.createServer(_requestHandler.bind(null, config));

        server.listen(config.port, function () {
            console.log("HTTP server listening on: " + config.port);
        });
    }

    /**************************************************************
     *  PRIVATE METHODS
     * ************************************************************/

    function _loadResources(config) {
        var prefix = _getPrefix(config),
            repRgx = [new RegExp("\\.\\" + config.dynamicSymbol, "g"), /\./g, /\//g],
            valRgx;

        debug("loading resources from: " + config.resources + " with prefix: " + prefix);

        fs.readdir(config.resources, function (err, dirs) {
            if (err) {
                throw err;
            }
            dirs.forEach(function (val) {

                valRgx = (prefix + val)
                    .replace(repRgx[0], "(?:\/?)([^\\/\\s\\?]*)") //replace all dynamic symbols with a regex that supports optional /<value>
                    .replace(repRgx[1], "/")//replace all . with /
                    .replace(repRgx[2], "\\/"); //replace all / with // (escaped)

                debug("loaded path rgx = " + valRgx);

                _resources.unshift({path: config.resources + "/" + val, rgx: new RegExp(valRgx)}); //putting longer paths before shorter ones (naively)
            });
        });
    }

    function _requestHandler(config, req, res) {

        debug("incoming request - " + req.method + "::" + req.url);

        var params = _getQueryParams(req);
        var resourcePathData = _getResourceDataFromRequest(req);

        var options = {
            params: params,
            resourcePath: resourcePathData.resourcePath,
            notFound: !resourcePathData.resourcePath,
            pathPars: resourcePathData.pathPars,
            config: config
        };

        _generateResponse(req, res, options);
    }

    function _generateResponse(req, res, options) {

        if (req.method === "OPTIONS") { //support preflight requests for CORS
            options.responseData = {};
            _doHttpMethod(req, res, options)
        }
        else {
            _loadResourceData(req, res, options);

            if (options.notFound) {
                console.log("\t-request doesnt have a matching resource");
                _respondToRequest(req, res, options);
            }
            else if (options.params.cb) {
                _doJsonP(req, res, options);
            }
            else {
                _doHttpMethod(req, res, options);
            }
        }
    }

    function _getResourceDataFromRequest(req) {
        var reqUrl = req.url,
            reqMethod = req.method,
            result = {
                resourcePath: null,
                pathPars: []
            },
            res;

        for (var i = 0; i < _resources.length; i++) {
            res = _resources[i];

            var match = res.rgx.exec(reqUrl);

            if (match) {
                debug("found matching resource dir for request: " + reqUrl);

                result.resourcePath = res.path + "/" + reqMethod.toLowerCase() + ".js";
                result.pathPars = match.slice(1);

                break; //look no further
            }
        }

        return result;
    }

    function _loadResourceData(req, res, options) {

        var responseData;

        if (!options.notFound) {
            debug("about to load resource data from: " + options.resourcePath);

            try {

                if (options.config.parent) {
                    responseData = options.config.parent.require(options.resourcePath);
                }
                else {
                    responseData = require(options.resourcePath);
                }

                debug("successfully loaded resource data");
            }
            catch (err) {
                debug("failed to load resource data module", err);
                options.notFound = true;
            }
        }

        options.responseData = (typeof responseData === "function" ?
            responseData(req, options) :
            (responseData || {} ));
    }

    function _getPrefix(config) {
        var prefix = config.requestPrefix || "";

        if (prefix) {
            prefix = "/" + prefix + "/";
        }

        return prefix;
    }

    function _doHttpMethod(req, res, options) {

        var data = options.responseData.response || {};

        options.data = JSON.stringify(data);

        _respondToRequest(req, res, options);
    }

    function _respondToRequest(req, res, options) {

        var statusCode = options.responseData.statusCode || 200;

        if (options.config.addCorsHeader) {
            _setCorsHeaders(req, res, options);
        }

        if (options.notFound) {
            res.statusCode = 404;
            res.statusMessage = "not found";
        }
        else {
            res.statusCode = statusCode;
            res.statusMessage = "ok";
        }

        res.end(options.data);
    }

    function _setCorsHeaders(req, res, options) {

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, HEAD");

        if (options.config.corsEchoRequestHeaders) {

            var allowedHeaders = req.headers["access-control-request-headers"];

            if (allowedHeaders) {
                debug("settings cors allowed headers: ", allowedHeaders);
                res.setHeader("Access-Control-Allow-Headers", allowedHeaders);
            }
        }
    }

    function _doJsonP(req, res, options) {

        debug("answering with jsonp response with cb: " + options.params.cb);
        res.setHeader("Content-Type", JS_TYPE);

        var data = JSON.stringify(options.responseData.response);
        options.data = options.params.cb + "(\"" + data.replace(/"/g, "\\\"") + "\");";

        _respondToRequest(req, res, options);
    }

    function _getQueryParams(req) {
        var urlParts = url.parse(req.url);

        return qs.parse(urlParts.query);
    }

    return {
        start: start
    };
})();