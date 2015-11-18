"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.dynamicLoad = dynamicLoad;

function dynamicLoad(parent, modulePath) {
    return parent.require(modulePath);
}
