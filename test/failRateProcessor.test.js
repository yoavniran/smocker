var chai = require("chai"),
	expect = chai.expect,
	dirtyChai = require("dirty-chai"),
	sinonChai = require("sinon-chai"),
	stirrer = require("mocha-stirrer");

describe("fail-rate processor tests", function () {
	"use strict";

	chai.use(sinonChai);
	chai.use(dirtyChai);

	var cup = stirrer.grind({
		restirForEach: true,
		pars: {
			req: {
				url: "api/orders"
			},
			res: {},
			responseData: {
				response: "yes!",
				statusCode: 201,
				statusMessage: "we did it",
				failRateData: {
					rate: 30,
					code: 3001,
					message: "bummer"
				}
			},
			responseDataDefs: {
				failRateData: {
					rate: 30
				}
			},
			responseDataNoFail: {
				response: "yes!",
				statusCode: 201,
				statusMessage: "we did it",
			},
			options: {
				resourcePath: "a/b/c",
				config: {
					allowFailureRate: true
				}
			},
			optionsNoFail: {
				resourcePath: "a/b/c",
				config: {
					allowFailureRate: false
				}
			}
		},
		requires: [{
			path: "../output/lib/mockProcessors/failRateProcessor",
			options: {alias: "processor"}
		}]
	});

	cup.pour("should return fail response data when in fail rate", function (done) {

		var runProcessor = this.getRequired("processor")();

		runProcessor(this.pars.req, this.pars.res, this.pars.responseData, this.pars.options,
			function (data) {
				expect(data).to.exist();
				expect(data.response).to.not.exist();
				expect(data.statusCode).to.equal(cup.pars.responseData.failRateData.code);
				expect(data.statusMessage).to.equal(cup.pars.responseData.failRateData.message);

				done();
			});
	}, {
		befores: function (next) {

			this.getStub("crypto").randomBytes.callsArgWith(1, null,
				[(this.pars.responseData.failRateData.rate - 1)]);

			next();
		}
	});

	cup.pour("should return same response when not in fail rate", function (done) {

		var runProcessor = this.getRequired("processor")();

		runProcessor(this.pars.req, this.pars.res, this.pars.responseData, this.pars.options,
			function (data) {
				expect(data).to.exist();
				expect(data.response).to.not.exist();
				expect(data.statusCode).to.equal(cup.pars.responseData.failRateData.code);
				expect(data.statusMessage).to.equal(cup.pars.responseData.failRateData.message);

				runProcessor(cup.pars.req, cup.pars.res, cup.pars.responseData, cup.pars.options,
					function (data) {
						expect(data).to.exist();
						expect(data.response).to.equal(cup.pars.responseData.response);
						expect(data.statusCode).to.equal(cup.pars.responseData.statusCode);
						expect(data.statusMessage).to.equal(cup.pars.responseData.statusMessage);

						done();
					});
			});
	}, {
		befores: function (next) {

			this.getStub("crypto").randomBytes.callsArgWith(1, null,
				[(this.pars.responseData.failRateData.rate - 1), 254]);

			next();
		},
		afters: function (next) {
			expect(this.getStub("crypto").randomBytes).to.have.been.calledOnce();
			next();
		}
	});

	cup.pour("should return fail response data with defaults if code or message no supplied in fail data", function (done) {

		var runProcessor = this.getRequired("processor")();

		runProcessor(this.pars.req, this.pars.res, this.pars.responseDataDefs, this.pars.options,
			function (data) {
				expect(data).to.exist();
				expect(data.response).to.not.exist();
				expect(data.statusCode).to.equal(500);
				expect(data.statusMessage).to.equal("failed due to fail-rate set up");

				done();
			});
	}, {
		befores: function (next) {

			this.getStub("crypto").randomBytes.callsArgWith(1, null,
				[(this.pars.responseData.failRateData.rate - 1)]);

			next();
		}
	});

	cup.pour("should return same response when fail rate data not supplied", function (done) {

		var runProcessor = this.getRequired("processor")();

		runProcessor(this.pars.req, this.pars.res, this.pars.responseDataNoFail, this.pars.options,
			function (data) {
				expect(data).to.exist();
				expect(data.response).to.equal(cup.pars.responseDataNoFail.response);
				expect(data.statusCode).to.equal(cup.pars.responseDataNoFail.statusCode);
				expect(data.statusMessage).to.equal(cup.pars.responseDataNoFail.statusMessage);

				done();
			});
	}, {
		befores: function (next) {

			this.getStub("crypto").randomBytes.callsArgWith(1, null,
				[(this.pars.responseData.failRateData.rate - 1)]);

			next();
		},
		afters: function (next) {
			expect(this.getStub("crypto").randomBytes).to.not.have.been.called();
			next();
		}
	});

	cup.pour("should return same response when config.allowFailureRate set to false", function (done) {
			var runProcessor = this.getRequired("processor")();

			runProcessor(this.pars.req, this.pars.res, this.pars.responseData, this.pars.optionsNoFail,
				function (data) {
					expect(data).to.exist();
					expect(data.response).to.equal(cup.pars.responseDataNoFail.response);
					expect(data.statusCode).to.equal(cup.pars.responseDataNoFail.statusCode);
					expect(data.statusMessage).to.equal(cup.pars.responseDataNoFail.statusMessage);

					done();
				});
		},
		{
			befores: function (next) {

				this.getStub("crypto").randomBytes.callsArgWith(1, null,
					[(this.pars.responseData.failRateData.rate - 1)]);

				next();
			},
			afters: function (next) {
				expect(this.getStub("crypto").randomBytes).to.not.have.been.called();
				next();
			}
		});

	cup.pour("should return same response if randomBytes fails", function (done) {

		var runProcessor = this.getRequired("processor")();

		runProcessor(this.pars.req, this.pars.res, this.pars.responseData, this.pars.options,
			function (data) {
				expect(data).to.exist();
				expect(data.response).to.equal(cup.pars.responseData.response);
				expect(data.statusCode).to.equal(cup.pars.responseData.statusCode);
				expect(data.statusMessage).to.equal(cup.pars.responseData.statusMessage);

				done();
			});
	}, {
		befores: function (next) {

			this.getStub("crypto").randomBytes.callsArgWith(1, new Error("oh crap!"));
			next();
		},
		afters: function (next) {
			expect(this.getStub("crypto").randomBytes).to.have.been.calledOnce();
			next();
		}
	});
});
