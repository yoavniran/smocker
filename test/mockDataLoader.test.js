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
            }
        },
        stubs: {
            fnForm: stirrer.EMPTY
        },
        requires: [{
            path: "../lib/mockDataLoader",
            options: {alias: "dataLoader"}
        }]
    });

    cup.pour("should retrieve a mock module with JSON response", function () {

        var dataLoader = this.getRequired("dataLoader");
        var responseData = dataLoader.load({}, this.pars.noCacheOptions);

        expect(responseData).to.equal(this.pars.jsonResult);
    }, {
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

    cup.pour("should handle function form of mock module", function () {

        var dataLoader = this.getRequired("dataLoader");
        var result = dataLoader.load(this.pars.req, this.pars.noCacheOptions);

        expect(this.stubs.fnForm).to.have.been.calledOnce();
        expect(result).to.equal(this.pars.jsonResult);

        var fnCall = this.stubs.fnForm.getCall(0);

        expect(fnCall.args).to.have.length(3);
        expect(fnCall.args[0]).to.equal(this.pars.req);
        expect(fnCall.args[1].params.p1).to.equal("v1");
        expect(fnCall.args[1].config.cacheResponses).to.be.false();
        expect(fnCall.args[1].pathPars.path1).to.equal("aaa");
        expect(fnCall.args[1].requestBody).to.equal("bla bla bla");
    }, {
        befores: function (next) {
            this.getStub("lib/utils").dynamicLoad.returns(this.stubs.fnForm);
            this.stubs.fnForm.returns(this.pars.jsonResult);
            next();
        }
    });

    cup.pour("should convert empty result to empty object", function () {
        var dataLoader = this.getRequired("dataLoader");
        var responseData = dataLoader.load({}, this.pars.noCacheOptions);

        expect(responseData).to.be.empty();
    }, {
        befores: function (next) {
            this.getStub("lib/utils").dynamicLoad.returns(null);
            next();
        }
    });

    cup.pour("should get from cache on second try", function () {
        var dataLoader = this.getRequired("dataLoader");

        var responseData = dataLoader.load({}, this.pars.withCacheOptions);
        expect(responseData).to.equal(this.pars.jsonResult);

        var cachedResponseData = dataLoader.load({}, this.pars.withCacheOptions);
        expect(cachedResponseData).to.equal(this.pars.jsonResult);

        var cachedResponseData2 = dataLoader.load({}, this.pars.withCacheOptions);
        expect(cachedResponseData2).to.equal(this.pars.jsonResult);
    }, {
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

    cup.pour("should handle module not found", function () {
        var dataLoader = this.getRequired("dataLoader");

        var responseData = dataLoader.load({}, this.pars.withCacheOptions);
        expect(responseData).to.be.empty();

    }, {
        befores: function (next) {
            this.getStub("lib/utils").dynamicLoad.throws(new Error("not found!"));
            next();
        }
    });
});