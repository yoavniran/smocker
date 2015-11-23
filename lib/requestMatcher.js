"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _debug = require("debug");

var _debug2 = _interopRequireDefault(_debug);

var debug = (0, _debug2["default"])("smocker");

function match(req, resources) {
	var reqUrl = req.url,
	    reqMethod = req.method,
	    result = {
		resourcePath: null,
		pathPars: []
	};

	_lodash2["default"].find(resources, function (res) {
		//cant use Array.find while supporting Node 0.12

		var match = res.rgx.exec(reqUrl);

		if (match) {
			debug("requestMatcher - found matching resource dir for request: " + reqUrl);
			result.resourcePath = res.path + "/" + reqMethod.toLowerCase() + ".js";
			result.pathPars = match.slice(1);
		}

		return match; //no need to continue looking
	});

	return result;
}

exports.match = match;
