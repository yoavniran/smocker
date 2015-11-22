"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _failRateProcessor = require("./failRateProcessor");

var _fileProcessor = require("./fileProcessor");

function create(config) {
    var processors = [(0, _failRateProcessor.create)(config), (0, _fileProcessor.create)(config)];

    return _getProcessingLogic(processors);
}

function _getProcessingLogic(processors) {
    return function (req, res, responseData, options) {
        //will be run for every response

        var runningProcessors = processors.slice();

        return new Promise(function (resolve) {

            var next = function next(data) {
                responseData = data || responseData;
                runNext();
            };

            var runNext = function runNext() {
                if (runningProcessors.length > 0) {
                    var processor = runningProcessors.pop();
                    processor(req, res, responseData, options, next);
                } else {
                    resolve({ req: req, res: res, responseData: responseData }); //we're done
                }
            };

            runNext();
        });
    };
}

exports.create = create;
