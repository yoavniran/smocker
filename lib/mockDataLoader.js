"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _debug = require("debug");

var _debug2 = _interopRequireDefault(_debug);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _lruCache = require("lru-cache");

var _lruCache2 = _interopRequireDefault(_lruCache);

var _utils = require("./utils");

var _responseUtils = require("./responseUtils");

var _responseUtils2 = _interopRequireDefault(_responseUtils);

var debug = (0, _debug2["default"])("smocker");

function load(req, options) {
    var responseData;

    if (!options.notFound) {
        debug("about to load resource data from: " + options.resourcePath);

        responseData = _getFromCache(options);

        if (!responseData) {
            responseData = _loadResourceDataFromModule(options);
        } else {
            debug("mockDataLoader - found cached data for resource: " + options.resourcePath);
        }
    }

    return typeof responseData === "function" ? _runResponseDataFn(responseData, req, options) : //resource is using function form
    responseData || {}; //resource is simple json or empty
}

function _loadResourceDataFromModule(options) {
    var responseData;

    try {

        responseData = options.config.parent ? (0, _utils.dynamicLoad)(options.config.parent, options.resourcePath) : //load the resource module relative to the module that required smocker
        (0, _utils.dynamicLoad)(module, options.resourcePath); //load the resource hopefully with absolute path

        debug("mockDataLoader - successfully loaded resource data");

        if (typeof responseData !== "undefined") {
            _addToCache(responseData, options);
        }
    } catch (err) {
        debug("mockDataLoader - failed to load resource data module", err);
        options.notFound = true;
    }

    return responseData;
}

function _runResponseDataFn(fn, req, options) {
    var params = options.params;
    var config = options.config;
    var pathPars = options.pathPars;
    var requestBody = options.requestBody;

    var fnInfo = {
        params: _lodash2["default"].clone(params),
        config: _lodash2["default"].clone(config),
        pathPars: _lodash2["default"].clone(pathPars),
        requestBody: requestBody
    };

    return fn(req, fnInfo, _responseUtils2["default"]);
}

function _getFromCache(options) {

    var data;

    if (_isCacheAllowed(options)) {
        if (options._cache) {
            data = options._cache.get(options.resourcePath);
        }
    }

    return data;
}

function _addToCache(data, options) {
    if (_isCacheAllowed(options)) {
        options._cache = options._cache || (0, _lruCache2["default"])(_getCacheSize(options));
        options._cache.set(options.resourcePath, data);
    }
}

function _isCacheAllowed(options) {
    return !!options.config.cacheResponses;
}

function _getCacheSize(options) {
    var size = options.config.cacheResponses;
    return size === true || size < 0 ? Number.POSITIVE_INFINITY : Number(size);
}

exports.load = load;
