module.exports = (function () {
    "use strict";

    var _ = require("lodash"),
        debug = require("debug")("smocker"),
        fs = require("fs");

    function load(config, callback) {

        var prefix = _getPrefix(config),
            replacers = _getResourceReplacers(config),
            resources = [],
            resRgxSource;

        debug("loading resources from: " + config.resources + " with prefix: " + prefix);

        fs.readdir(config.resources, function (err, dirs) {

            if (!err) {
                dirs.forEach(function (val) {
                    resRgxSource = _buildResourceRgxSource(prefix, val, replacers);
                    debug("loaded path rgx = " + resRgxSource);
                    resources.unshift({path: config.resources + "/" + val, rgx: new RegExp(resRgxSource)}); //putting longer paths before shorter ones (naively)
                });
            }

            callback(err, resources);
        });
    }

    function _getResourceReplacers(config) {
        return [
            {rgx: new RegExp("\\.\\" + config.dynamicSymbol, "g"), val: "(?:\/?)([^\\/\\s\\?]*)"}, //replace all dynamic symbols with a regex that supports optional /<value>
            {rgx: /([^\.])\.(?!\.)/g, val: "$1/"}, //replace single . with /
            {rgx: /\//g, val: "\\/"}, //replace all / with // (rgx escaped)
            {rgx: /\.\./g, val: "."} //replace double . with single .
        ];
    }

    function _buildResourceRgxSource(prefix, resourceValue, replacers) {
        var rgxSource = (prefix + resourceValue);

        _.each(replacers, function (rep) {
            rgxSource = rgxSource.replace(rep.rgx, rep.val);
        });

        return rgxSource;
    }

    function _getPrefix(config) {
        var prefix = config.requestPrefix || "";

        if (prefix) {
            prefix = "/" + prefix + "/";
        }

        return prefix;
    }

    return {
        load: load
    };
})();