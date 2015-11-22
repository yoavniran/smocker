"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

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

	resources.find(function (res) {

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
