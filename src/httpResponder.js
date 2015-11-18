"use strict";

import path from "path";
import fs from "fs";
import _ from "lodash";
import Debug from "debug";

const JS_TYPE = "application/javascript",
    debug = Debug("smokcer");

function respond(req, res, options) {

    if (options.notFound) {
        debug("request doesnt have a matching resource");
        _respondToRequest(req, res, options);
    }
    else {
        if (options.jsonpName) {
            _respondToJsonP(req, res, options);
        }
        else {
            _respondToHttpMethod(req, res, options);
        }
    }
}

function _respondToHttpMethod(req, res, options) {

    let data = options.responseData.response || {};

    options.data = JSON.stringify(data);
    _respondToRequest(req, res, options);
}

function _respondToJsonP(req, res, options) {
    debug("answering with jsonp response with cb: " + options.jsonpName);
    res.setHeader("content-type", JS_TYPE);

    const data = JSON.stringify(options.responseData.response);
    options.data = (options.jsonpName + "(\"" + data.replace(/"/g, "\\\"") + "\");");

    _respondToRequest(req, res, options);
}

function _respondToRequest(req, res, options) {

    if (options.notFound) {
        options.responseData.statusCode = 404;
        options.responseData.statusMessage = "not found";
        options.data = "";
    }

    _setResponseInfo(req, res, options);

    if (!options.notFound && options.responseData.isFile) {
        debug("response is set to file format, will attempt to stream file back");
        _respondWithFile(req, res, options);
    }
    else {
        res.end(options.data);
    }
}

function _setResponseInfo(req, res, options) {

    let headers = _.extend({}, options.config.headers, options.responseData.headers);

    res.statusCode = options.responseData.statusCode || options.config.okStatusCode;
    res.statusMessage = options.responseData.statusMessage || options.config.okStatusMessage;

    _.each(headers, (val, key) => res.setHeader(key, val)); //add headers from config and from response data if provided

    if (options.config.addCorsHeader) {
        _setCorsHeaders(req, res, options);
    }
}

function _respondWithFile(req, res, options) {
    var filePath = _getFilePath(options);

    fs.stat(filePath, (err, stats) => {

        if (!err) {
            debug("found file to stream to response: " + filePath);
            res.setHeader("content-length", stats.size);
            fs.createReadStream(filePath).pipe(res); //stream the file to the response
        }
        else {
            debug("failed to find file for response: " + filePath);
            options.notFound = true;
            options.responseData = {};
            _respondToRequest(req, res, options);
        }
    });
}

function _getFilePath(options) {
    let filePath = options.responseData.filePath;

    if (!path.isAbsolute(filePath)) {
        if (options.config.parent) {
            filePath = path.join(path.dirname(options.config.parent.filename), filePath);
        }
        else {
            filePath = path.join(__dirname, filePath);
        }
    }

    return filePath;
}

function _setCorsHeaders(req, res, options) {

    res.setHeader("Access-Control-Allow-Origin", options.config.corsAllowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, HEAD");

    if (options.config.corsEchoRequestHeaders) {

        let allowedHeaders = req.headers["access-control-request-headers"];

        if (allowedHeaders) {
            debug("setting cors allowed headers header: ", allowedHeaders);
            res.setHeader("Access-Control-Allow-Headers", allowedHeaders);
        }
    }
}

export {respond};