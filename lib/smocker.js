"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _http = require("http");

var _http2 = _interopRequireDefault(_http);

var _url = require("url");

var _url2 = _interopRequireDefault(_url);

var _querystring = require("querystring");

var _querystring2 = _interopRequireDefault(_querystring);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _debug = require("debug");

var _debug2 = _interopRequireDefault(_debug);

var _resourcesLoader = require("./resourcesLoader");

var _mockDataLoader = require("./mockDataLoader");

var _httpResponder = require("./httpResponder");

var _requestMatcher = require("./requestMatcher");

var _mockProcessorsIndex = require("./mockProcessors/index");

var _serverDefaults = require("./serverDefaults");

var _serverDefaults2 = _interopRequireDefault(_serverDefaults);

var debug = (0, _debug2["default"])("smocker"),
    _isJson = /\/json/;

var _usedDefaults;

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
 *  config.allowFailureRate - globally control whether to allow failure rate responses or ignore it (relates the utils.respondWithFailureRate() helper) (default true)
 *
 *  @returns Promise - resolved with a function thats when called will stop the running http server.
 */
function start(config) {

	config = _lodash2["default"].extend({}, _serverDefaults2["default"], _usedDefaults, config);

	if (!_path2["default"].isAbsolute(config.resources)) {
		config.parent = module.parent.parent || module.parent; //if used relative path, try and use the module that required index.js or smocker.js directly as the parent
	}

	return new Promise(function (resolve, reject) {

		(0, _resourcesLoader.load)(config).then(_createInstance.bind(null, config)).then(function (server) {
			resolve(_stop.bind(null, server));
		})["catch"](function (err) {
			console.error("smocker - failed to load resources! ", err); // eslint-disable-line no-console
			reject(err);
		});
	});
}

/**
 * changes the root defaults object for all future instances
 * use this method to update some or all of the defaults smocker uses when starting a new instance
 *
 * @returns Object - a clone object of the current defaults
 */
function setDefaults(config) {
	_usedDefaults = _lodash2["default"].extend({}, _serverDefaults2["default"], config);
	return _lodash2["default"].clone(_usedDefaults);
}

/**
 * restores the defaults object used to its original state
 *
 * @returns Object - a clone object of the restored defaults
 */
function restoreDefaults() {
	_usedDefaults = null;
	return _lodash2["default"].clone(_serverDefaults2["default"]);
}

/**************************************************************
 *  PRIVATE METHODS
 * ************************************************************/

function _stop(server) {

	if (server) {
		debug("closing http server!");
		server.close(function (err) {
			debug("server close encountered an error: ", err);
		});
	}
}

function _createInstance(config, resources) {

	debug("smocker - resources loaded - creating smocker instance");

	var runProcessors = (0, _mockProcessorsIndex.create)(config);
	var instance = { resources: resources, config: config, runProcessors: runProcessors };

	debug("smocker - about to start http server");
	var server = _http2["default"].createServer(_processRequest.bind(null, instance));

	server.listen(config.port, function () {
		debug("smocker - HTTP server listening on: " + config.port);
	});

	return server;
}

function _processRequest(instance, req, res) {
	var config = instance.config;
	var resources = instance.resources;
	var runProcessors = instance.runProcessors;
	var params = _getQueryParams(req);
	var resourcePathData = (0, _requestMatcher.match)(req, resources);
	var jsonpName = params[config.cbParName];

	var options = { //data for the request
		params: params,
		resourcePath: resourcePathData.resourcePath,
		notFound: !resourcePathData.resourcePath,
		pathPars: resourcePathData.pathPars,
		jsonpName: jsonpName ? jsonpName.replace(/\s/g, "") : null,
		config: _lodash2["default"].clone(config), //pass along a copy of the config object
		runProcessors: runProcessors
	};

	debug("smocker - incoming request - " + req.method + "::" + req.url);
	_generateResponse(req, res, options);
}

function _generateResponse(req, res, options) {

	if (req.method === "OPTIONS") {
		//support preflight requests for CORS
		options.responseData = {};
		(0, _httpResponder.respond)(req, res, options);
	} else {
		_readRequestBody(req, options, function (err, body) {

			if (!err && body) {
				req.body = body; //make it easy to access the body directly from the request object
				options.requestBody = body;
			}

			var mockedData = (0, _mockDataLoader.load)(req, options);

			options.runProcessors(req, res, mockedData, options) //run post-processors
			.then(function (data) {
				//post-processors finished successfully
				debug("smocker - post processing finished, will send respond to client");
				options.responseData = data.responseData;
				(0, _httpResponder.respond)(data.req, data.res, options);
			}, _failOnPostProcessors.bind(null, req, res, options));
		});
	}
}

function _failOnPostProcessors(req, res, options, err) {
	debug("smocker - Failed to run post-processors or encountered error with one of them", err);
	options.notFound = true;
	options.responseData = { statusCode: 500, statusMessage: "Smocker post-processors failed" };
	(0, _httpResponder.respond)(req, res, options);
}

function _readRequestBody(req, options, cb) {
	//todo: move to a pre-processor

	var body = "";

	if (!options.readRequestBody && req.method !== "GET") {
		debug("about to read body of request");

		req.setEncoding("utf8");

		req.on("data", function (chunk) {
			body += chunk;
		});

		req.on("end", function () {
			var data = body;

			try {
				if (body && _isJson.test(req.headers["content-type"])) {
					data = JSON.parse(body);
				}

				debug("smocker - read from request: ", data);
				cb(null, data);
			} catch (err) {
				debug("smocker - failed to parse request body as JSON");
				cb(err);
			}
		});
	} else {
		cb();
	}
}

function _getQueryParams(req) {
	var urlParts = _url2["default"].parse(req.url);

	return _querystring2["default"].parse(urlParts.query);
}

exports.start = start;
exports.setDefaults = setDefaults;
exports.restoreDefaults = restoreDefaults;
