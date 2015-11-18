"use strict";

function respondWithFile(filePath, contentType, statusCode, statusMessage) {
    return {
        isFile: true,
        filePath: filePath,
        headers: {
            "content-type": contentType
        },
        statusCode: statusCode,
        statusMessage: statusMessage
    };
}

function respondWithFailureRate(response, failRate, failCode, failMessage) {


}

var utils = {};

Object.defineProperties(utils, {
    "respondWithFile": {
        get: function () {
            return respondWithFile;
        },
        enumerable: true
    },

    "respondWithFailureRate": {
        get: function () {
            return respondWithFailureRate;
        },
        enumerable: true
    }
});


export default utils;