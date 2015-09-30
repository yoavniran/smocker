module.exports = (function () {
    "use strict";

    var _ = require("lodash"),
        debug = require("debug")("smocker"),
        Lru = require("lru-cache"),
        utils = require("./utils"),
        responseUtils = require("./responseUtils");

    function load(req, options) {
        var responseData;

        if (!options.notFound) {
            debug("about to load resource data from: " + options.resourcePath);

            responseData = _getFromCache(options);

            if (!responseData) {
                responseData = _loadResourceDataFromModule(options);
            }
            else {
                debug("mockDataLoader - found cached data for resource: " + options.resourcePath);
            }
        }

        return (typeof responseData === "function" ?
            _runResponseDataFn(responseData, req, options) : //resource is using function form
            (responseData || {} )); //resource is simple json or empty
    }

    function _loadResourceDataFromModule(options) {
        var responseData;

        try {

            responseData = (options.config.parent ?
                utils.dynamicLoad(options.config.parent, options.resourcePath) : //load the resource module relative to the module that required smocker
                utils.dynamicLoad(module, options.resourcePath)); //load the resource hopefully with absolute path

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
    }

    function _runResponseDataFn(fn, req, options) {

        var fnInfo = {
            params: _.clone(options.params),
            config: _.clone(options.config),
            pathPars: _.clone(options.pathPars),
            requestBody: options.requestBody
        };

        fn(req, fnInfo, responseUtils);
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
            options._cache = options._cache || Lru(_getCacheSize(options));
            options._cache.set(options.resourcePath, data);
        }
    }

    function _isCacheAllowed(options) {
        return !!(options.config.cacheResponses);
    }

    function _getCacheSize(options) {
        var size = options.config.cacheResponses;
        return ((size === true || size < 0) ? Number.POSITIVE_INFINITY : Number(size));
    }

    return {
        load: load
    };
})();