"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports["default"] = {
	port: 9991,
	requestPrefix: "",
	resources: "./resources",
	dynamicSymbol: "$",
	addCorsHeader: true,
	corsAllowedOrigin: "*",
	corsEchoRequestHeaders: true,
	headers: {
		"content-type": "application/json"
	},
	cbParName: "cb",
	okStatusCode: 200,
	okStatusMessage: "ok",
	readRequestBody: true,
	cacheResponses: 50,
	allowFailureRate: true
};
module.exports = exports["default"];
