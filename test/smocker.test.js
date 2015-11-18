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
            }
        },
        spies: {
            "serverClose": stirrer.EMPTY,
            "serverListen": stirrer.EMPTY,
            "setEncoding": stirrer.EMPTY
        },
        stubs: {
            reqOn: stirrer.EMPTY
        },
        requires: [{
            path: "../lib/smocker",
            options: {alias: "smocker"}
        }]
    });

    cup.pour("test fail to load resources", asyncTester(function (done) {

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

            this.getStub("./resourcesLoader").load.rejects(this.pars.loadError);
            next();
        },
        pars: {
            loadError: new Error("test (intentional) failed to find resources!!!")
        }
    });

    cup.pour("test with absolute resources path", asyncTester(function (done) {

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
                this.getStub("path").isAbsolute.returns(true);
                next();
            }
        ],
        afters: function (next) {
            expect(this.getStub("./resourcesLoader").load).to.have.been.calledOnce();

            var loadArgs = this.getStub("./resourcesLoader").load.getCall(0).args;
            expect(loadArgs[0].parent).to.not.exist();

            expect(this.spies.serverListen).to.have.been.calledWith(this.pars.defaultPort);
            next();
        }
    });

    cup.pour("test with relative resources path", asyncTester(function (done) {
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
            expect(this.getStub("./resourcesLoader").load).to.have.been.calledOnce();

            var loadArgs = this.getStub("./resourcesLoader").load.getCall(0).args;
            expect(loadArgs[0].parent).to.exist();

            next();
        }
    });

    cup.pour("test with different port", asyncTester(function (done) {

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
            expect(this.spies.serverListen).to.have.been.calledWith(this.pars.testPort);
            next();
        }
    });

    cup.pour("test server close", asyncTester(function (done) {

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

    cup.pour("test GET request handling - no match", asyncTester(function (done) {

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
            expect(this.getStub("./mockDataLoader").load).to.have.been.calledOnce();

            var dataLoaderLoadOptionsArg = this.getStub("./mockDataLoader").load.getCall(0).args[1],
                dataLoaderLoadReqArg = this.getStub("./mockDataLoader").load.getCall(0).args[0];

            expect(dataLoaderLoadReqArg.url).to.equal(this.pars.getUrl);
            expect(dataLoaderLoadOptionsArg.notFound).to.be.true();

            expect(this.getStub("./httpResponder").respond).to.have.been.calledOnce();

            var responderOptionsArg = this.getStub("./httpResponder").respond.getCall(0).args[2];
            expect(responderOptionsArg.responseData).to.not.exist();

            next();
        },
        pars: {
            getUrl: "api/recipes/123"
        }
    });

    cup.pour("test GET request handling - with match", asyncTester(function (done) {

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

            var dataLoaderLoadOptionsArg = this.getStub("./mockDataLoader").load.getCall(0).args[1];
            expect(dataLoaderLoadOptionsArg.notFound).to.be.false();

            var responderOptionsArg = this.getStub("./httpResponder").respond.getCall(0).args[2];
            expect(responderOptionsArg.responseData).to.equal(this.pars.getResponse);

            next();
        },
        pars: {
            getResponse: {data: "success!"},
            getUrl: "api/recipes/123",
            getResourcePath: "test/resources/api.recipes.$"
        }
    });

    cup.pour("test POST request handling with body", asyncTester(function (done) {

        var smocker = this.getRequired("smocker");

        smocker.start({
            resources: ""
        }).then(function () {
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

            var dataLoaderLoadOptionsArg = this.getStub("./mockDataLoader").load.getCall(0).args[1];
            expect(dataLoaderLoadOptionsArg.notFound).to.be.false();

            var responderOptionsArg = this.getStub("./httpResponder").respond.getCall(0).args[2];
            expect(responderOptionsArg.responseData).to.equal(this.pars.getResponse);
            expect(responderOptionsArg.requestBody).to.equal(this.pars.body);

            next();
        },
        pars: {
            body: "hello"
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
                this.getStub("./requestMatcher").match.returns({});
                next();
            }],
        afters: function (next) {
            var responderOptionsArg = this.getStub("./httpResponder").respond.getCall(0).args[2];
            expect(responderOptionsArg.responseData).to.be.empty();
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

            var loadOptionsArg = this.getStub("./resourcesLoader").load.getCall(0).args[0];
            expect(loadOptionsArg.resources).to.equal(this.pars.newResources);
            expect(loadOptionsArg.port).to.equal(this.pars.newPort);

            var loadOptionsArg = this.getStub("./resourcesLoader").load.getCall(1).args[0];
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
            setTimeout(done, 1);
        });
    }
}

function setupBefore(next) {
    this.getStub("./resourcesLoader").load.resolves([]);

    this.getStub("http").createServer.returns({
        listen: this.spies.serverListen,
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
    this.getStub("./resourcesLoader").load.resolves([]);

    this.getStub("./requestMatcher").match.returns({
        resourcePath: null,
        pathPars: []
    });

    this.getStub("http").createServer.returns({
        listen: this.pars.noop
    }).callsArgWith(0, {
        method: method,
        url: this.pars.getUrl,
        setEncoding: this.spies.setEncoding,
        on: this.stubs.reqOn,
        headers: []
    }, {});

    this.getStub("url").parse.returns({query: ""});
    this.getStub("querystring").parse.returns([]);

    next();
}

function setupBeforeWithMatch(next) {
    this.getStub("./mockDataLoader").load.returns(this.pars.getResponse);
    this.getStub("./requestMatcher").match.returns({
        resourcePath: this.pars.getResourcePath,
        pathPars: []
    });

    next();
}