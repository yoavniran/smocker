var chai = require("chai"),
    expect = chai.expect,
    sinon = require("sinon"),
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");

describe("http responder tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    var cup = stirrer.grind({
        restirForEach: true,
        pars: {
            filePath: "./some/file/somewhere",
            jsonpName: "cb123",
            okStatusCode: 200,
            statusCode: 708,
            req: {
                headers: {"access-control-request-headers": "bla"}
            },
            config: {
                headers: {"test": "123"},
                okStatusCode: 200
            },
            jsonResponse: {"message": "hello world"},
            corsOrigin: "*",
            corsHeaders: "bla",
            parentFileName: "path/of/parent/module.js",
            parentDir: "path/of/parent",
            absFilePath: "absolute-path-to-file.jpg",
            fileSize: 101,
            imageType: "image/png"
        },
        spies: {
            "setHeader": stirrer.EMPTY,
            "end": stirrer.EMPTY,
            "pipe": stirrer.EMPTY
        },
        requires: [{
            path: "../lib/httpResponder",
            options: {alias: "responder"}
        }],
        beforeEach: function () {
            this.pars.res = {
                setHeader: this.spies.setHeader,
                end: this.spies.end
            }
        },
        afterEach: function () {
            expect(this.spies.setHeader).to.have.been.calledWith("test", "123");
        }
    });

    function textResponseAfter(next) {
        var result = this.pars.result;

        if (result) {
            result = JSON.stringify(result);
        }

        expect(this.spies.end).to.have.been.calledWith(result);
        next();
    }

    cup.pour("should handle not found response", function () {
        var responder = this.getRequired("responder");

        responder.respond(this.pars.req, this.pars.res, {
            notFound: true,
            responseData: {},
            config: this.pars.config
        });
    }, {
        afters: [
            function (next) {
                expect(this.pars.res.statusCode).to.equal(404);
                expect(this.pars.res.statusMessage).to.equal("not found");
                this.pars.result = "";
                next();
            },
            textResponseAfter]
    });

    cup.pour("should handle http method response", function () {
        var responder = this.getRequired("responder");

        responder.respond(this.pars.req, this.pars.res, {
            responseData: {response: this.pars.jsonResponse, statusCode: this.pars.statusCode},
            config: this.pars.config
        });
    }, {
        afters: [
            function (next) {
                expect(this.pars.res.statusCode).to.equal(this.pars.statusCode);
                this.pars.result = this.pars.jsonResponse;
                next();
            },
            textResponseAfter]
    });

    cup.pour("should handle http method response with cors", function () {
        var responder = this.getRequired("responder");

        responder.respond(this.pars.req, this.pars.res, {
            responseData: {response: this.pars.jsonResponse, statusCode: this.pars.statusCode},
            config: {
                headers: {"test": "123"},
                corsAllowedOrigin: this.pars.corsOrigin,
                addCorsHeader: true,
                corsEchoRequestHeaders: true
            }
        });
    }, {
        afters: [
            function (next) {
                expect(this.pars.res.statusCode).to.equal(this.pars.statusCode);
                expect(this.spies.setHeader).to.have.been.calledWith("Access-Control-Allow-Origin", this.pars.corsOrigin);
                expect(this.spies.setHeader).to.have.been.calledWith("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, HEAD");
                expect(this.spies.setHeader).to.have.been.calledWith("Access-Control-Allow-Headers", this.pars.corsHeaders);

                this.pars.result = this.pars.jsonResponse;
                next();
            },
            textResponseAfter]
    });

    cup.pour("should handle jsonp response", function () {

        var responder = this.getRequired("responder");

        responder.respond(this.pars.req, this.pars.res, {
            responseData: {response: this.pars.jsonResponse},
            jsonpName: this.pars.jsonpName,
            config: this.pars.config
        });
    }, {
        afters: function (next) {
            expect(this.pars.res.statusCode).to.equal(this.pars.okStatusCode);
            expect(this.spies.setHeader).to.have.been.calledWith("content-type", "application/javascript");
            expect(this.spies.end).to.have.been.calledWith(this.pars.jsonpName + "(\"" + JSON.stringify(this.pars.jsonResponse).replace(/"/g, "\\\"") + "\");");
            next();
        }
    });

    cup.pour("should handle file response successfully", function () {
        var responder = this.getRequired("responder");

        responder.respond(this.pars.req, this.pars.res, {
            responseData: {
                filePath: this.pars.filePath,
                headers: {
                    "content-type": this.pars.imageType
                },
                isFile: true
            },
            config: {
                headers: {"test": "123"},
                parent: {
                    filename: this.pars.parentFileName
                }
            }
        });
    }, {
        befores: function (next) {
            this.getStub("path").isAbsolute.returns(false);
            this.getStub("path").dirname.returns(this.pars.parentDir);
            this.getStub("path").join.returns(this.pars.absFilePath);
            this.getStub("fs").stat.callsArgWith(1, null, {size: this.pars.fileSize});
            this.getStub("fs").createReadStream.returns({pipe: this.spies.pipe});
            next();
        },
        afters: function (next) {
            expect(this.getStub("path").isAbsolute).to.have.been.calledWith(this.pars.filePath);
            expect(this.getStub("path").dirname).to.have.been.calledWith(this.pars.parentFileName);
            expect(this.getStub("path").join).to.have.been.calledWith(this.pars.parentDir, this.pars.filePath);
            expect(this.spies.setHeader).to.have.been.calledWith("content-length", this.pars.fileSize);
            expect(this.spies.setHeader).to.have.been.calledWith("content-type", this.pars.imageType);
            expect(this.spies.pipe).to.have.been.calledWith(this.pars.res);
            next();
        }
    });

    cup.pour("should handle file response successfully - no parent", function () {
        var responder = this.getRequired("responder");

        responder.respond(this.pars.req, this.pars.res, {
            responseData: {
                filePath: this.pars.filePath,
                headers: {
                    "content-type": this.pars.imageType
                },
                isFile: true
            },
            config: {
                headers: {"test": "123"}
            }
        });
    }, {

        befores: function (next) {
            this.getStub("path").isAbsolute.returns(false);
            this.getStub("path").dirname.returns(this.pars.parentDir);
            this.getStub("path").join.returns(this.pars.absFilePath);
            this.getStub("fs").stat.callsArgWith(1, null, {size: this.pars.fileSize});
            this.getStub("fs").createReadStream.returns({pipe: this.spies.pipe});
            next();
        },
        afters: function (next) {
            expect(this.getStub("path").join).to.have.been.calledWith(sinon.match.string, this.pars.filePath);
            var joinFirstArg = this.getStub("path").join.getCall(0).args[0];

            var path = require("path");

            expect(path.isAbsolute(joinFirstArg)).to.be.true();
            expect(joinFirstArg).to.satisfy(function(val){return val.endsWith(path.sep + "lib")});
            next();
        }
    });


    cup.pour("should handle file response with file not found", function () {
        var responder = this.getRequired("responder");

        responder.respond(this.pars.req, this.pars.res, {
            responseData: {
                filePath: this.pars.filePath,
                isFile: true
            },
            config: {
                headers: {"test": "123"},
                parent: {
                    filename: this.pars.parentFileName
                }
            }
        });
    }, {
        befores: function (next) {
            this.getStub("path").join.returns(this.pars.absFilePath);
            this.getStub("fs").stat.callsArgWith(1, "err");
            next();
        },
        afters: [
            function (next) {
                expect(this.pars.res.statusCode).to.equal(404);
                expect(this.pars.res.statusMessage).to.equal("not found");
                this.pars.result = "";
                next();
            },
            textResponseAfter]
    });
});