import Debug from "debug";
import _ from "lodash";
import Lru from "lru-cache";
import {dynamicLoad} from "./utils";
import responseUtils from "./responseUtils";

const debug = Debug("smocker");

const _loadResourceDataFromModule = (options) => {
	let responseData;

	try {
		responseData = (options.config.parent ?
			dynamicLoad(options.config.parent, options.resourcePath) : //load the resource module relative to the module that required smocker
			dynamicLoad(module, options.resourcePath)); //load the resource hopefully with absolute path

		debug("mockDataLoader - successfully loaded resource data");

		if (typeof responseData !== "undefined") {
			_addToCache(responseData, options);
		}
	}
	catch (err) {
		debug("mockDataLoader - failed to load resource data module", err);
		options.notFound = true;
	}

	return responseData;
};

const _runResponseDataFn = (fn, req, options) =>
	fn(req, {
		params: _.clone(options.params),
		config: _.clone(options.config),
		pathPars: _.clone(options.pathPars),
		requestBody: options.requestBody
	}, responseUtils);

const _getFromCache = (options) =>
	(_isCacheAllowed(options) && options._cache ?
		options._cache.get(options.resourcePath) : undefined);

const _addToCache = (data, options) => {
	if (_isCacheAllowed(options, data)) {
		options._cache = options._cache || Lru(_getCacheSize(options));
		options._cache.set(options.resourcePath, data);
	}
};

const _isCacheAllowed = (options, data) =>
	!!(options.config.cacheResponses && (!data || (data && !data.dontCache)));

const _getCacheSize = (options) => {
	const size = options.config.cacheResponses;
	return ((size === true || size < 0) ? Number.POSITIVE_INFINITY : Number(size));
};

const _ensurePromiseResponse = (req, options, responseData) => {
	responseData = (typeof responseData === "function" ?
		_runResponseDataFn(responseData, req, options) : //resource is using function form
		(responseData || {} )); //resource is simple json or empty

	return (responseData.then && typeof responseData.then === "function" ? //already a promise
		responseData : Promise.resolve(responseData)); //turn into a promise
};

export default (req, options) => {
	let responseData;

	if (!options.notFound) {
		debug("mockDataLoader - about to load resource data from: " + options.resourcePath);

		responseData = _getFromCache(options);

		if (!responseData) {
			responseData = _loadResourceDataFromModule(options);
		}
		else {
			debug("mockDataLoader - found cached data for resource: " + options.resourcePath);
		}
	}

	return _ensurePromiseResponse(req, options, responseData);
};