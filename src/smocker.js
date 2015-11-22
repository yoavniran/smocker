import http from "http";
import url from "url";
import qs from "querystring";
import path from "path";
import _  from "lodash";
import Debug  from "debug";
import {load as loadResources} from "./resourcesLoader";
import {load as loadMockedData} from "./mockDataLoader";
import {respond as httpRespond} from "./httpResponder";
import {match as matchRequest} from "./requestMatcher";
import {create as createProcessors} from "./mockProcessors";
import SERVER_DEFAULTS from "./serverDefaults";

const debug = Debug("smocker"),
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

	config = _.extend({}, SERVER_DEFAULTS, _usedDefaults, config);

	if (!path.isAbsolute(config.resources)) {
		config.parent = module.parent.parent || module.parent; //if used relative path, try and use the module that required index.js or smocker.js directly as the parent
	}

	return new Promise((resolve, reject)=> {

		loadResources(config)
			.then(_createInstance.bind(null, config))
			.then((server)=> {
				resolve(_stop.bind(null, server));
			})
			.catch((err)=> {
				console.error("smocker - failed to load resources! ", err);// eslint-disable-line no-console
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
	_usedDefaults = _.extend({}, SERVER_DEFAULTS, config);
	return _.clone(_usedDefaults);
}

/**
 * restores the defaults object used to its original state
 *
 * @returns Object - a clone object of the restored defaults
 */
function restoreDefaults() {
	_usedDefaults = null;
	return _.clone(SERVER_DEFAULTS);
}

/**************************************************************
 *  PRIVATE METHODS
 * ************************************************************/

function _stop(server) {

	if (server) {
		debug("closing http server!");
		server.close((err)=> {
			debug("server close encountered an error: ", err);
		});
	}
}

function _createInstance(config, resources) {

	debug("smocker - resources loaded - creating smocker instance");

	const runProcessors = createProcessors(config);
	const instance = {resources, config, runProcessors};

	debug("smocker - about to start http server");
	const server = http.createServer(_processRequest.bind(null, instance));

	server.listen(config.port, () => {
		debug("smocker - HTTP server listening on: " + config.port);
	});

	return server;
}

function _processRequest(instance, req, res) {

	const {config, resources, runProcessors}  = instance,
		params = _getQueryParams(req),
		resourcePathData = matchRequest(req, resources),
		jsonpName = params[config.cbParName];

	let options = { //data for the request
		params,
		resourcePath: resourcePathData.resourcePath,
		notFound: !resourcePathData.resourcePath,
		pathPars: resourcePathData.pathPars,
		jsonpName: (jsonpName ? jsonpName.replace(/\s/g, "") : null),
		config: _.clone(config), //pass along a copy of the config object
		runProcessors
	};

	debug("smocker - incoming request - " + req.method + "::" + req.url);
	_generateResponse(req, res, options);
}

function _generateResponse(req, res, options) {

	if (req.method === "OPTIONS") { //support preflight requests for CORS
		options.responseData = {};
		httpRespond(req, res, options);
	}
	else {
		_readRequestBody(req, options, (err, body) => {

			if (!err && body) {
				req.body = body; //make it easy to access the body directly from the request object
				options.requestBody = body;
			}

			let mockedData = loadMockedData(req, options);

			options.runProcessors(req, res, mockedData, options) //run post-processors
				.then((data)=> { //post-processors finished successfully
						debug("smocker - post processing finished, will send respond to client");
						options.responseData = data.responseData;
						httpRespond(data.req, data.res, options);
					},
					_failOnPostProcessors.bind(null, req, res, options));
		});
	}
}

function _failOnPostProcessors(req, res, options, err) {
	debug("smocker - Failed to run post-processors or encountered error with one of them", err);
	options.notFound = true;
	options.responseData = {statusCode: 500, statusMessage: "Smocker post-processors failed"};
	httpRespond(req, res, options);
}

function _readRequestBody(req, options, cb) { //todo: move to a pre-processor

	var body = "";

	if (!options.readRequestBody && req.method !== "GET") {
		debug("about to read body of request");

		req.setEncoding("utf8");

		req.on("data", (chunk) => {
			body += chunk;
		});

		req.on("end", () => {
			let data = body;

			try {
				if (body && _isJson.test(req.headers["content-type"])) {
					data = JSON.parse(body);
				}

				debug("smocker - read from request: ", data);
				cb(null, data);
			}
			catch (err) {
				debug("smocker - failed to parse request body as JSON");
				cb(err);
			}
		});
	}
	else {
		cb();
	}
}

function _getQueryParams(req) {
	let urlParts = url.parse(req.url);

	return qs.parse(urlParts.query);
}

export {start, setDefaults, restoreDefaults};