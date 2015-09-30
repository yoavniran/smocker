module.exports = (function () {
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

    var utils = {};

    Object.defineProperties(utils, {
        "respondWithFile": {
            get: function () {
                return respondWithFile
            },
            enumerable: true
        }
    });

    return utils;
})();