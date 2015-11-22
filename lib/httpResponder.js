"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _debug = require("debug");

var _debug2 = _interopRequireDefault(_debug);

var JS_TYPE = "application/javascript",
    debug = (0, _debug2["default"])("smokcer");

function respond(req, res, options) {

    if (options.notFound) {
        debug("request doesnt have a matching resource");
        _respondToRequest(req, res, options);
    } else {
        if (options.jsonpName) {
            _respondToJsonP(req, res, options);
        } else {
            _respondToHttpMethod(req, res, options);
        }
    }
}

function _respondToHttpMethod(req, res, options) {

    var data = options.responseData.response || {};

    options.data = JSON.stringify(data);
    _respondToRequest(req, res, options);
}

function _respondToJsonP(req, res, options) {
    debug("answering with jsonp response with cb: " + options.jsonpName);
    res.setHeader("content-type", JS_TYPE);

    var data = JSON.stringify(options.responseData.response);
    options.data = options.jsonpName + "(\"" + data.replace(/"/g, "\\\"") + "\");";

    _respondToRequest(req, res, options);
}

function _respondToRequest(req, res, options) {

    if (options.notFound) {
        options.responseData.statusCode = 404;
        options.responseData.statusMessage = "not found";
        options.data = "";
    }

    _setResponseInfo(req, res, options);

    if (!options.notFound && options.responseData.fileStream) {
        debug("httpResponder - response is set to file format, will attempt to stream file back");
        options.responseData.fileStream.pipe(res);
    } else {
        res.end(options.data);
    }
}

function _setResponseInfo(req, res, options) {

    var headers = _lodash2["default"].extend({}, options.config.headers, options.responseData.headers);

    res.statusCode = options.responseData.statusCode || options.config.okStatusCode;
    res.statusMessage = options.responseData.statusMessage || options.config.okStatusMessage;

    _lodash2["default"].each(headers, function (val, key) {
        return res.setHeader(key, val);
    }); //add headers from config and from response data if provided

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

exports.respond = respond;
