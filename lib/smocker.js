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
        _isJson = /\/json/,

        _defaults = {
            port: 9991,
            requestPrefix: "",
            resources: "./resources",
            dynamicSymbol: "$",
            addCorsHeader: true,
            corsAllowedOrigin: "*",
            corsEchoRequestHeaders: true,
            headers: {
                "content-type": JSON_TYPE
            },
            cbParName: "cb",
            okStatusCode: 200,
            okStatusMessage: "ok",
            readRequestBody: true
        };

    /**
     * start a new instance of Smocker with the provided or default configuration.
     *  internally starts a new http server
     *
     * @param config (optional)
     *  config.port - the server port to use (default: 9991)
     *  config.resources - the path to where the resources for the responses will be loaded from (default: "./resources")
     *  config.requestPrefix - the prefix to use for (all) requests when matching the url of an incoming request (default: "")
     *  config.dynamicSymbol - the symbol to use in the folder name to denote the dynamic/optional part(s). Must be a valid file name character (default: "$")
     *  config.addCorsHeader - whether to add the [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) headers to the response (default: true)
     *  config.corsAllowedOrigin - the hosts to allow when CORS is enabled (default: "*")
     *  config.corsEchoRequestHeaders - whether to echo the headers sent by a [preflight](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS#Preflighted_requests) request as the allowed cross origin request headers (default: true)
     *  config.headers - a key/val map of default headers to send with every response (default: {content-type: "application/json"})
     *  config.cbParName - the url parameter name to use as the callback function name for jsonp (default "cb")
     *  config.okStatusCode - the default status code to set on the response (default: 200)
     *  config.okStatusMessage - the default status message to set on the response (default: "ok")
     *  config.readRequestBody - whether to read the body of incoming requests and pass it to the resource module (when using function form) (default true)
     */
    function start(config) {

        config = _.extend({}, _defaults, config);

        if (!path.isAbsolute(config.resources)) {
            config.parent = module.parent.parent || module.parent; //if used relative path, try and use the module that required index.js or smocker.js directly as the parent
        }

        var resources = _loadResources(config);

        var server = http.createServer(_processRequest.bind(null, resources, config));

        server.listen(config.port, function () {
            debug("HTTP server listening on: " + config.port);
        });
    }

    /**************************************************************
     *  PRIVATE METHODS
     * ************************************************************/

    function _loadResources(config) {
        var prefix = _getPrefix(config),
            repRgx = [new RegExp("\\.\\" + config.dynamicSymbol, "g"), /\./g, /\//g],
            resources = [],
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
                    .replace(repRgx[2], "\\/"); //replace all / with // (rgx escaped)

                debug("loaded path rgx = " + valRgx);

                resources.unshift({path: config.resources + "/" + val, rgx: new RegExp(valRgx)}); //putting longer paths before shorter ones (naively)
            });
        });

        return resources;
    }

    function _processRequest(resources, config, req, res) {

        debug("incoming request - " + req.method + "::" + req.url);

        var params = _getQueryParams(req),
            resourcePathData = _matchRequestToResourceData(req, resources),
            jsonpName = params[config.cbParName];

        var options = { //data for the request
            params: params,
            resourcePath: resourcePathData.resourcePath,
            notFound: !resourcePathData.resourcePath,
            pathPars: resourcePathData.pathPars,
            jsonpName: (jsonpName ? jsonpName.replace(/\s/g, "") : null),
            config: _.clone(config) //handover a copy of the config object
        };

        _generateResponse(req, res, options);
    }

    function _generateResponse(req, res, options) {

        if (req.method === "OPTIONS") { //support preflight requests for CORS
            options.responseData = {};
            _doHttpMethod(req, res, options);
        }
        else {
            _readRequestBody(req, options, function _onRequestBodyDone(err, body) {

                if (!err && body) {
                    req.body = body; //make it easy to access the body directly from the request object
                    options.requestBody = body;
                }

                _loadResourceData(req, res, options);

                if (options.notFound) {
                    debug("request doesnt have a matching resource");
                    _respondToRequest(req, res, options);
                }
                else {
                    _handleHttpRequest(req, res, options);
                }
            });
        }
    }

    function _loadResourceData(req, res, options) {

        var responseData;

        if (!options.notFound) {
            debug("about to load resource data from: " + options.resourcePath);

            try {

                if (options.config.parent) { //load the resource module relative to the module that required smocker
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
            responseData(req, options) : //resource is using function form
            (responseData || {} )); //resource is simple json or empty
    }

    function _handleHttpRequest(req, res, options) {

        if (options.jsonpName) {
            _doJsonP(req, res, options);
        }
        else {
            _doHttpMethod(req, res, options);
        }
    }

    function _matchRequestToResourceData(req, resources) {
        var reqUrl = req.url,
            reqMethod = req.method,
            result = {
                resourcePath: null,
                pathPars: []
            },
            res;

        for (var i = 0; i < resources.length; i += 1) {
            res = resources[i];

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

    function _doJsonP(req, res, options) {

        debug("answering with jsonp response with cb: " + options.params.cb);
        res.setHeader("Content-Type", JS_TYPE);

        var data = JSON.stringify(options.responseData.response);
        options.data = (options.jsonpName + "(\"" + data.replace(/"/g, "\\\"") + "\");");

        _respondToRequest(req, res, options);
    }

    function _respondToRequest(req, res, options) {

        if (options.notFound) {
            options.responseData.statusCode = 404;
            options.responseData.statusMessage = "not found";
        }

        _setResponseInfo(req, res, options);

        res.end(options.data);
    }

    function _setResponseInfo(req, res, options) {

        var headers = _.extend({}, options.config.headers, options.responseData.headers);

        res.statusCode = options.responseData.statusCode || options.config.okStatusCode;
        res.statusMessage = options.responseData.statusMessage || options.config.okStatusMessage;

        _.each(headers, function (val, key) { //add headers from config and from response data if provided
            res.setHeader(key, val);
        });

        if (options.config.addCorsHeader) {
            _setCorsHeaders(req, res, options);
        }
    }

    function _setCorsHeaders(req, res, options) {

        res.setHeader("Access-Control-Allow-Origin", options.config.corsAllowedOrigin);
        res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, HEAD");

        if (options.config.corsEchoRequestHeaders) {

            var allowedHeaders = req.headers["access-control-request-headers"];

            if (allowedHeaders) {
                debug("setting cors allowed headers header: ", allowedHeaders);
                res.setHeader("Access-Control-Allow-Headers", allowedHeaders);
            }
        }
    }

    function _readRequestBody(req, options, cb) {

        var body = "";

        if (!options.readRequestBody && req.method !== "GET") {
            debug("about to read body of request");

            req.setEncoding("utf8");

            req.on("data", function (chunk) {
                body += chunk;
            });

            req.on("end", function () {
                var data;

                debug("read from request: ", body);

                try {
                    if (body && _isJson.test(req.headers["content-type"])) {
                        data = JSON.parse(body);
                    }

                    cb(null, data);
                }
                catch (err) {
                    cb(err);
                }
            });
        }
        else {
            cb(null, null);
        }
    }

    function _getQueryParams(req) {
        var urlParts = url.parse(req.url);

        return qs.parse(urlParts.query);
    }

    return {
        start: start
    };
})();