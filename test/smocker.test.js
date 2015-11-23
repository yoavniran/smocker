var chai = require("chai"),
	expect = chai.expect,
	dirtyChai = require("dirty-chai"),
	sinonChai = require("sinon-chai"),
	stirrer = require("mocha-stirrer");

describe("smocker tests", function () {
	"use strict";

	chai.use(sinonChai);
	chai.use(dirtyChai);

	var cup = stirrer.grind({
		restirForEach: true,
		pars: {
			testPort: 2222,
			defaultPort: 9991,
			defaultResources: "./resources",
			noop: function () {
			},
			res: {res: true},
			resources: []
		},
		spies: {
			"serverClose": stirrer.EMPTY,
			"setEncoding": stirrer.EMPTY
		},
		stubs: {
			reqOn: stirrer.EMPTY,
			runProcessors: stirrer.EMPTY,
			"serverListen": stirrer.EMPTY,
		},
		requires: [{
			path: "../output/lib/smocker",
			options: {alias: "smocker"}
		}]
	});

	cup.pour("should notify on failure to load resources", asyncTester(function (done) {

		var smocker = this.getRequired("smocker");

		smocker.start({})
			.then(function () {
					done(new Error("shouldnt have resolved successfully"))
				},
				function (reason) {
					expect(reason).to.equal(this.pars.loadError);
					done();
				}.bind(this));

	}), {
		befores: function (next) {
			this.getStub("lib/resourcesLoader").load.rejects(this.pars.loadError);
			next();
		},
		pars: {
			loadError: new Error("test (intentional) failed to find resources!!!")
		}
	});

	cup.pour("should cope with absolute resources path", asyncTester(function (done) {

		var smocker = this.getRequired("smocker");

		smocker.start({
				"resources": "/test/resources"
			})
			.then(function (stopHandle) {
				expect(stopHandle).to.be.a("function");
			}, done).then(done, done);
	}), {
		befores: [
			setupBefore,
			function (next) {
				this.stubs.serverListen.callsArg(1);
				this.getStub("path").isAbsolute.returns(true);
				next();
			}
		],
		afters: function (next) {
			expect(this.getStub("lib/resourcesLoader").load).to.have.been.calledOnce();

			var loadArgs = this.getStub("lib/resourcesLoader").load.getCall(0).args;
			expect(loadArgs[0].parent).to.not.exist();

			expect(this.stubs.serverListen).to.have.been.calledWith(this.pars.defaultPort);
			next();
		}
	});

	cup.pour("should cope with relative resources path", asyncTester(function (done) {
		var smocker = this.getRequired("smocker");

		smocker.start({
				"resources": "./test/resources"
			})
			.then(function (stopHandle) {
				expect(stopHandle).to.be.a("function");
			}, done).then(done, done);
	}), {
		befores: [
			setupBefore,
			function (next) {
				this.getStub("path").isAbsolute.returns(false);
				next();
			}
		],
		afters: function (next) {
			expect(this.getStub("lib/resourcesLoader").load).to.have.been.calledOnce();

			var loadArgs = this.getStub("lib/resourcesLoader").load.getCall(0).args;
			expect(loadArgs[0].parent).to.exist();

			next();
		}
	});

	cup.pour("should use the config's different port", asyncTester(function (done) {

		var smocker = this.getRequired("smocker");

		smocker.start({
				"resources": "./test/resources",
				"port": this.pars.testPort
			})
			.then(function (stopHandle) {
				expect(stopHandle).to.be.a("function");
			}, done).then(done, done);
	}), {
		befores: setupBefore,
		afters: function (next) {
			expect(this.stubs.serverListen).to.have.been.calledWith(this.pars.testPort);
			next();
		}
	});

	cup.pour("close should close the server instance", asyncTester(function (done) {

		var smocker = this.getRequired("smocker");

		smocker.start({
				"resources": "./test/resources",
				"port": this.pars.testPort
			})
			.then(function (stopHandle) {
				stopHandle();
			}, done).then(done, done);
	}), {
		befores: setupBefore,
		afters: function (next) {
			expect(this.spies.serverClose).to.have.been.calledOnce();
			next();
		}
	});

	cup.pour("should handle GET request with no match", asyncTester(function (done) {

		var smocker = this.getRequired("smocker");

		smocker.start({
			resources: ""
		}).then(function () {
			done();
		}, done);

	}), {
		befores: setupBeforeForGet,
		afters: function (next) {

			expect(this.getStub("url").parse).to.have.been.calledWith(this.pars.getUrl);
			expect(this.getStub("lib/mockDataLoader").load).to.have.been.calledOnce();

			var dataLoaderLoadOptionsArg = this.getStub("lib/mockDataLoader").load.getCall(0).args[1],
				dataLoaderLoadReqArg = this.getStub("lib/mockDataLoader").load.getCall(0).args[0];

			expect(dataLoaderLoadReqArg.url).to.equal(this.pars.getUrl);
			expect(dataLoaderLoadOptionsArg.notFound).to.be.true();

			expect(this.getStub("lib/httpResponder").respond).to.have.been.calledOnce();

			var responderOptionsArg = this.getStub("lib/httpResponder").respond.getCall(0).args[2];
			expect(responderOptionsArg.responseData).to.not.exist();

			next();
		},
		pars: {
			getUrl: "api/recipes/123"
		}
	});

	cup.pour("should deliver GET request - with match", asyncTester(function (done) {

		var smocker = this.getRequired("smocker");

		smocker.start({
			resources: ""
		}).then(function () {
			done();
		}, done);
	}), {
		befores: [setupBeforeForGet,
			setupBeforeWithMatch],
		afters: function (next) {

			var dataLoaderLoadOptionsArg = this.getStub("lib/mockDataLoader").load.getCall(0).args[1];
			expect(dataLoaderLoadOptionsArg.notFound).to.be.false();

			var responderOptionsArg = this.getStub("lib/httpResponder").respond.getCall(0).args[2];
			expect(responderOptionsArg.responseData).to.equal(this.pars.getResponse);

			next();
		},
		pars: {
			getResponse: {data: "success!"},
			getUrl: "api/recipes/123",
			getResourcePath: "test/resources/api.recipes.$"
		}
	});

	cup.pour("should deliver POST request with body", asyncTester(function (done) {

		var smocker = this.getRequired("smocker");

		smocker.start({})
			.then(function () {
				done();
			}, done);
	}), {
		befores: [setupBeforeForPost,
			setupBeforeWithMatch,
			function (next) {
				this.stubs.reqOn.callsArgWith(1, this.pars.body);
				next();
			}],
		afters: function (next) {

			var dataLoaderLoadOptionsArg = this.getStub("lib/mockDataLoader").load.getCall(0).args[1];
			expect(dataLoaderLoadOptionsArg.notFound).to.be.false();

			var responderOptionsArg = this.getStub("lib/httpResponder").respond.getCall(0).args[2];
			expect(responderOptionsArg.responseData).to.equal(this.pars.getResponse);
			expect(responderOptionsArg.requestBody).to.equal(this.pars.body);

			var processorsArgs = this.stubs.runProcessors.getCall(0).args;
			expect(processorsArgs[0]).to.equal(this.pars.req);
			expect(processorsArgs[1]).to.equal(this.pars.res);
			expect(processorsArgs[2]).to.equal(this.pars.getResponse);
			expect(processorsArgs[3].notFound).to.be.false();
			expect(processorsArgs[3].resourcePath).to.equal(this.pars.getResourcePath);

			next();
		},
		pars: {
			body: "hello"
		}
	});

	cup.pour("should cope with body parsing failing", asyncTester(function (done) {

		var smocker = this.getRequired("smocker");

		smocker.start({})
			.then(function () {
				done();
			}, done);
	}), {
		befores: [setupBeforeForPost,
			setupBeforeWithMatch,
			function (next) {

				this.pars.reqWithBody = {
					method: "PUT",
					url: this.pars.getUrl,
					setEncoding: this.spies.setEncoding,
					on: this.stubs.reqOn,
					headers: {"content-type": "test/json"}
				};

				this.getStub("http").createServer.returns({
					listen: this.pars.noop
				}).callsArgWith(0, this.pars.reqWithBody, this.pars.res);

				this.stubs.reqOn.callsArgWith(1, this.pars.body);
				next();
			}],
		afters: function (next) {

			var dataLoaderLoadOptionsArg = this.getStub("lib/mockDataLoader").load.getCall(0).args[1];
			expect(dataLoaderLoadOptionsArg.notFound).to.be.false();

			var responderOptionsArg = this.getStub("lib/httpResponder").respond.getCall(0).args[2];
			expect(responderOptionsArg.responseData).to.equal(this.pars.getResponse);
			expect(responderOptionsArg.requestBody).to.not.exist();

			var processorsArgs = this.stubs.runProcessors.getCall(0).args;
			expect(processorsArgs[0]).to.equal(this.pars.reqWithBody);
			expect(processorsArgs[1]).to.equal(this.pars.res);
			expect(processorsArgs[2]).to.equal(this.pars.getResponse);
			expect(processorsArgs[3].notFound).to.be.false();
			expect(processorsArgs[3].resourcePath).to.equal(this.pars.getResourcePath);

			next();
		},
		pars: {
			body: "aaa"
		}
	});

	cup.pour("test OPTIONS request handling", asyncTester(function (done) {
		var smocker = this.getRequired("smocker");

		smocker.start({
			resources: ""
		}).then(function () {
			done();
		}, done);
	}), {
		befores: [setupBeforeForOptions,
			function (next) {
				this.getStub("lib/requestMatcher").match.returns({});
				next();
			}],
		afters: function (next) {
			var responderOptionsArg = this.getStub("lib/httpResponder").respond.getCall(0).args[2];
			expect(responderOptionsArg.responseData).to.be.empty();
			next();
		}
	});

	cup.pour("test success mock with failed post-processors", asyncTester(function (done) {

		var smocker = this.getRequired("smocker");

		smocker.start({
			resources: ""
		}).then(function () {
			done();
		}, done);

	}), {
		befores: [
			setupBeforeForGet,
			function (next) {
				this.stubs.runProcessors.rejects(new Error("processors failed!"));
				next();
			}
		],
		afters: function (next) {

			var responderOptionsArg = this.getStub("lib/httpResponder").respond.getCall(0).args[2];
			expect(responderOptionsArg.notFound).to.be.true();
			expect(responderOptionsArg.responseData.statusCode).to.equal(500);

			next();
		}
	});

	cup.pour("test set and restore defaults on smocker", asyncTester(function (done) {

		var smocker = this.getRequired("smocker");

		var newDefaults = smocker.setDefaults({
			port: this.pars.newPort,
			resources: this.pars.newResources
		});

		expect(newDefaults).to.exist();
		expect(newDefaults.port).to.equal(this.pars.newPort);

		smocker.start().then(function () {
				smocker.restoreDefaults();
				newDefaults = smocker.setDefaults({});

				expect(newDefaults).to.exist();
				expect(newDefaults.port).to.equal(this.pars.defaultPort);

				return smocker.start();
			}.bind(this), done)
			.then(function () {
				done();
			}, done);


	}), {
		befores: setupBefore,
		afters: function (next) {

			var loadOptionsArg = this.getStub("lib/resourcesLoader").load.getCall(0).args[0]; //first call
			expect(loadOptionsArg.resources).to.equal(this.pars.newResources);
			expect(loadOptionsArg.port).to.equal(this.pars.newPort);

			loadOptionsArg = this.getStub("lib/resourcesLoader").load.getCall(1).args[0]; //second call
			expect(loadOptionsArg.resources).to.equal(this.pars.defaultResources);
			expect(loadOptionsArg.port).to.equal(this.pars.defaultPort);

			next();
		},
		pars: {
			newPort: 1234,
			newResources: "/new/resources"
		}
	});
});

//need this because tests here test code with promises and the promise swallows any assertion error so we break out
//from the promise flow by wrapping the stirrer done method setTimeout
//todo: move to mocha-stirrer for other projects to benefit from
function asyncTester(fn) {
	"use strict";
	return function (done) {
		fn.call(this, function () {
			setTimeout(done.apply(null, arguments), 1);
		});
	}
}

function setupBefore(next) {
	this.getStub("lib/resourcesLoader").load.resolves([]);

	this.getStub("http").createServer.returns({
		listen: this.stubs.serverListen,
		close: this.spies.serverClose
	});

	next();
}

function setupBeforeForGet(next) {
	setupBeforeForMethod.call(this, "GET", next);
}

function setupBeforeForPost(next) {
	setupBeforeForMethod.call(this, "POST", next);
}

function setupBeforeForOptions(next) {
	setupBeforeForMethod.call(this, "OPTIONS", next);
}

function setupBeforeForMethod(method, next) {
	this.getStub("lib/resourcesLoader").load.resolves(this.pars.resources);

	this.getStub("lib/requestMatcher").match.returns({
		resourcePath: null,
		pathPars: []
	});
	this.getStub("mockProcessors/index").create.returns(this.stubs.runProcessors);

	this.pars.req = {
		method: method,
		url: this.pars.getUrl,
		setEncoding: this.spies.setEncoding,
		on: this.stubs.reqOn,
		headers: []
	};

	this.getStub("http").createServer.returns({
		listen: this.pars.noop
	}).callsArgWith(0, this.pars.req, this.pars.res);

	this.stubs.runProcessors.resolves({
		responseData: this.pars.getResponse,
		req: {},
		res: {}
	});

	this.getStub("url").parse.returns({query: ""});
	this.getStub("querystring").parse.returns([]);

	next();
}

function setupBeforeWithMatch(next) {
	this.getStub("lib/mockDataLoader").load.returns(this.pars.getResponse);

	this.getStub("lib/requestMatcher").match.returns({
		resourcePath: this.pars.getResourcePath,
		pathPars: []
	});

	next();
}