"use strict";

var sinon = require("sinon");

//todo: move to mocha-stirrer so can be used in other projects

sinon.stub.resolves = sinon.stub.resolves || function (value) {
		return this.returns(new Promise(function (resolve) {
			resolve(value);
		}));
	};

sinon.stub.rejects = sinon.stub.rejects || function (reason) {
		reason = (typeof reason === "string") ? new Error(reason) : reason;

		return this.returns(new Promise(function (resolve, reject) {
			reject(reason);
		}));
	};
