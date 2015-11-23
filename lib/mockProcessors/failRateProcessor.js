"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _debug = require("debug");

var _debug2 = _interopRequireDefault(_debug);

var _crypto = require("crypto");

var _crypto2 = _interopRequireDefault(_crypto);

var debug = (0, _debug2["default"])("smocker"),
    floor = Math.floor,
    BATCH_SIZE = 100,
    DEFAULT_FAIL_CODE = 500,
    DEFAULT_FAIL_MSG = "failed due to fail-rate set up",
    MAX_BYTE = 255,
    HUNDRED = 100;

function create() /*config*/{
	var requestCache = {};
	return _getProcessor(requestCache);
}

function _getProcessor(requestCache) {
	return function (req, res, responseData, options, next) {

		if (options.config.allowFailureRate && !options.notFound && responseData.failRateData) {
			debug("failRateProcessor - activating fail-rate logic for request: " + req.url);
			_getResponse(requestCache, responseData, options, function (newData) {
				next(newData); //allow the next processor to run or finish post-processing
			});
		} else {
				//not activating fail rate logic
				next(responseData);
			}
	};
}

function _getResponse(requestCache, responseData, options, cb) {

	_getRequestCallsData(options, requestCache, function (callData) {

		var newData = responseData;

		if (callData.randomVals) {
			var currVal = callData.randomVals.shift();
			var _responseData$failRateData = responseData.failRateData;
			var rate = _responseData$failRateData.rate;
			var code = _responseData$failRateData.code;
			var message = _responseData$failRateData.message;

			if (currVal <= rate) {
				//fail the response
				newData = {
					statusCode: code || DEFAULT_FAIL_CODE,
					statusMessage: message || DEFAULT_FAIL_MSG
				};
			}
		} else {
			debug("failRateProcessor - failed to get random bytes, not failing response");
		}

		cb(newData);
	});
}

function _getRequestCallsData(options, requestCache, cb) {

	var callData = requestCache[options.resourcePath];

	if (!callData || !callData.randomVals || callData.randomVals.length === 0) {
		//first time or need a new random-values batch
		_getNewCallData(function (newData) {
			debug("failRateProcessor - creating a new call data for resource: " + options.resourcePath);
			requestCache[options.resourcePath] = newData;
			cb(newData);
		});
	} else {
		cb(callData);
	}
}

function _getNewCallData(cb) {

	_getCallsValues(BATCH_SIZE, function (randomVals) {
		cb({
			randomVals: randomVals
		});
	});
}

function _getCallsValues(max, cb) {
	_crypto2["default"].randomBytes(max, function (err, bytes) {
		var vals = undefined;

		if (!err) {
			vals = [];
			for (var i = 0; i < max; i++) {
				vals.push(floor(bytes[i] / MAX_BYTE * HUNDRED));
			}
		} else {
			debug("failRateProcessor - error from crypto.randomBytes", err);
		}

		cb(vals);
	});
}

exports.create = create;
