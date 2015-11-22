"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
function create() /*config*/{

    var requests = {};

    return _getProcessor(requests);
}

function _getProcessor(requests) {

    return function (req, res, responseData, options, next) {
        next(responseData);
    };
}

exports.create = create;
