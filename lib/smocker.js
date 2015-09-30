module.exports = (function () {
    "use strict";

    var http = require("http"),
        url = require("url"),
        qs = require("querystring"),
        path = require("path"),
        _ = require("lodash"),
        debug = require("debug")("smocker"),
        resourcesLoader = require("./resourcesLoader"),
        mockDataLoader = require("./mockDataLoader"),
        httpResponder = require("./httpResponder");

    var JSON_TYPE = "application/json",
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
            readRequestBody: true,
            cacheResponses: 50
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
     *  config.cacheResponses - whether to cache the mocked modules after they are first loaded to improve performance. Value can be Boolean or a valid positive integer. If set to true will cache all modules. if set to a number will remove old items from cache as it fills up. (default: 50)
     */
    function start(config) {

        config = _.extend({}, _defaults, config);

        if (!path.isAbsolute(config.resources)) {
            config.parent = module.parent.parent || module.parent; //if used relative path, try and use the module that required index.js or smocker.js directly as the parent
        }

        _loadResources(config, _onResourcesLoaded.bind(null, config));
    }

    /**
     * changes the root defaults object across all instances
     * use this method to update some or all of the defaults smocker uses when starting a new instance
     */
    function setDefaults(config) {
        _.extend(_defaults, config);
    }

    /**************************************************************
     *  PRIVATE METHODS
     * ************************************************************/

    function _onResourcesLoaded(config, err, resources) {

        if (err) {
            console.error("Smocker - failed to load resources! ", err);
        }
        else {
            debug("resources loaded, about to start http server");

            var server = http.createServer(_processRequest.bind(null, resources, config));

            server.listen(config.port, function () {
                debug("HTTP server listening on: " + config.port);
            });
        }
    }

    function _loadResources(config, callback) {
        resourcesLoader.load(config, callback);
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
            httpResponder.respond(req, res, options); //_doHttpMethod(req, res, options);
        }
        else {
            _readRequestBody(req, options, function _onRequestBodyDone(err, body) {

                if (!err && body) {
                    req.body = body; //make it easy to access the body directly from the request object
                    options.requestBody = body;
                }

                options.responseData = mockDataLoader.load(req, options);
                httpResponder.respond(req, res, options);
            });
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
                    debug("failed to parse request body as JSON");
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
        start: start,
        setDefaults: setDefaults
    };
})();