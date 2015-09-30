module.exports = (function () {
    "use strict";

    function dynamicLoad(parent, modulePath) {
        return parent.require(modulePath);
    }

    return {
        dynamicLoad: dynamicLoad
    };
})();