"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _debug = require("debug");

var _debug2 = _interopRequireDefault(_debug);

var debug = (0, _debug2["default"])("smocker");

function load(config) {

    return new Promise(function (resolve, reject) {

        _fs2["default"].readdir(config.resources, function (err, dirs) {

            if (!err) {
                var resources = _getResourcesFromDirs(dirs, config);
                resolve(resources);
            } else {
                reject(err);
            }
        });
    });
}

function _getResourcesFromDirs(dirs, config) {
    var prefix = _getPrefix(config),
        replacers = _getResourceReplacers(config),
        resources = [];

    debug("resourceLoader - loading resources from: " + config.resources + " with prefix: " + prefix);

    dirs.forEach(function (val) {
        var resRgxSource = _buildResourceRgxSource(prefix, val, replacers);
        debug("resourceLoader - loaded path rgx = " + resRgxSource);

        resources.unshift({ //putting longer paths before shorter ones (naively)
            path: config.resources + "/" + val,
            rgx: new RegExp(resRgxSource)
        });
    });

    return resources;
}

function _getResourceReplacers(config) {
    return [{ rgx: new RegExp("\\.\\" + config.dynamicSymbol, "g"), val: "(?:\/?)([^\\/\\s\\?]*)" }, //replace all dynamic symbols with a regex that supports optional /<value>
    { rgx: /([^\.])\.(?!\.)/g, val: "$1/" }, //replace single . with /
    { rgx: /\//g, val: "\\/" }, //replace all / with // (rgx escaped)
    { rgx: /\.\./g, val: "." } //replace double . with single .
    ];
}

function _buildResourceRgxSource(prefix, resourceValue, replacers) {
    return replacers.reduce(function (val, rep) {
        return val.replace(rep.rgx, rep.val);
    }, prefix + resourceValue);
}

function _getPrefix(config) {
    var prefix = config.requestPrefix || "";

    if (prefix) {
        prefix = "/" + prefix + "/";
    }

    return prefix;
}

exports.load = load;
