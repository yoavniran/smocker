var chai = require("chai"),
	expect = chai.expect,
	dirtyChai = require("dirty-chai"),
	sinonChai = require("sinon-chai"),
	stirrer = require("mocha-stirrer");

describe("mock data loader tests", function () {
	"use strict";

	chai.use(sinonChai);
	chai.use(dirtyChai);

	var cup = stirrer.grind({
		restirForEach: true,
		pars: {
			req: {},
			noCacheOptions: {
				resourcePath: "bla/bla",
				config: {
					cacheResponses: false
				},
				params: {
					"p1": "v1"
				},
				pathPars: {
					"path1": "aaa"
				},
				requestBody: "bla bla bla"
			},
			withCacheOptions: {
				resourcePath: "bla/bla",
				config: {
					cacheResponses: true
				}
			},
			jsonResult: {
				response: {result: "hello world"}
			},
			fnPromiseResult: () => Promise.resolve("yay")
		},
		stubs: {
			fnForm: stirrer.EMPTY
		},
		requires: [{
			path: "../output/lib/mockDataLoader",
			options: {alias: "dataLoader"}
		}]
	});

	cup.pour("should retrieve a mock module with JSON response", asyncTester(function (done) {
		const dataLoader = this.getRequired("dataLoader"),
			result = dataLoader({}, this.pars.noCacheOptions);

		result
			.then((data) => {
				expect(data).to.equal(cup.pars.jsonResult);
			})
			.then(done, done);
	}), {
		befores: function (next) {
			this.getStub("lib/utils").dynamicLoad.returns(this.pars.jsonResult);
			next();
		},
		afters: function (next) {
			expect(this.getStub("lru-cache").prototype.get).to.have.callCount(0);
			expect(this.getStub("lru-cache").prototype.set).to.have.callCount(0);
			expect(this.getStub("lib/utils").dynamicLoad).to.have.callCount(1);
			next();
		}
	});

	cup.pour("should handle function form of mock module", asyncTester(function (done) {

		const dataLoader = this.getRequired("dataLoader"),
			result = dataLoader(this.pars.req, this.pars.noCacheOptions);

		result.then((data) => {
			expect(cup.stubs.fnForm).to.have.been.calledOnce();
			expect(data).to.equal(cup.pars.jsonResult);

			const fnCall = cup.stubs.fnForm.getCall(0);

			expect(fnCall.args).to.have.length(3);
			expect(fnCall.args[0]).to.equal(cup.pars.req);
			expect(fnCall.args[1].params.p1).to.equal("v1");
			expect(fnCall.args[1].config.cacheResponses).to.be.false();
			expect(fnCall.args[1].pathPars.path1).to.equal("aaa");
			expect(fnCall.args[1].requestBody).to.equal("bla bla bla");
		})
			.then(done, done);
	}), {
		befores: function (next) {
			this.getStub("lib/utils").dynamicLoad.returns(this.stubs.fnForm);
			this.stubs.fnForm.returns(this.pars.jsonResult);
			next();
		}
	});

	cup.pour("should handle promise from function form of mock module", asyncTester(function (done) {

		const dataLoader = this.getRequired("dataLoader"),
			result = dataLoader(this.pars.req, this.pars.noCacheOptions);

		result
			.then((data) => {
				expect(data).to.equal("yay");
			})
			.then(done, done);
	}), {
		befores: function (next) {
			this.getStub("lib/utils").dynamicLoad.returns(this.pars.fnPromiseResult);
			next();
		}
	});

	cup.pour("should convert empty result to empty object", asyncTester(function (done) {
		const dataLoader = this.getRequired("dataLoader"),
			result = dataLoader({}, this.pars.noCacheOptions);

		result
			.then((data) => {
				expect(data).to.be.empty();
			})
			.then(done, done);

	}), {
		befores: function (next) {
			this.getStub("lib/utils").dynamicLoad.returns(null);
			next();
		}
	});

	cup.pour("should get from cache on second try", asyncTester(function (done) {
		const dataLoader = this.getRequired("dataLoader"),
			result = dataLoader({}, this.pars.withCacheOptions);

		result
			.then((data) => {
				expect(data).to.equal(this.pars.jsonResult);

				return dataLoader({}, this.pars.withCacheOptions)
					.then((cachedData) => {
						expect(cachedData).to.equal(this.pars.jsonResult);

						return dataLoader({}, this.pars.withCacheOptions)
							.then((cachedData2) => {
								expect(cachedData2).to.equal(this.pars.jsonResult);
							});
					});
			})
			.then(done, done);

	}), {
		befores: function (next) {
			this.getStub("lib/utils").dynamicLoad.returns(this.pars.jsonResult);
			this.getStub("lru-cache").prototype.get.returns(this.pars.jsonResult);
			next();
		},
		afters: function (next) {
			expect(this.getStub("lru-cache").prototype.get).to.have.callCount(2);
			expect(this.getStub("lru-cache").prototype.set).to.have.callCount(1);
			expect(this.getStub("lru-cache").prototype.set).to.have.been.calledWith(this.pars.withCacheOptions.resourcePath, this.pars.jsonResult);
			expect(this.getStub("lib/utils").dynamicLoad).to.have.callCount(1);

			next();
		}
	});

	cup.pour("should handle module not found", asyncTester(function (done) {
		const dataLoader = this.getRequired("dataLoader"),
			result = dataLoader({}, this.pars.withCacheOptions);

		result.then((data) => {
			expect(data).to.be.empty();
		}).then(done, done);
	}), {
		befores: function (next) {
			this.getStub("lib/utils").dynamicLoad.throws(new Error("not found!"));
			next();
		}
	});
});