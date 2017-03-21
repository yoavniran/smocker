var chai = require("chai"),
    expect = chai.expect,
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
            path: "../output/lib/httpResponder",
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

        responder(this.pars.req, this.pars.res, {
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

        responder(this.pars.req, this.pars.res, {
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
	    const responder = this.getRequired("responder");

        responder(this.pars.req, this.pars.res, {
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

	    const responder = this.getRequired("responder");

        responder(this.pars.req, this.pars.res, {
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
	    const responder = this.getRequired("responder");

        responder(this.pars.req, this.pars.res, {
            responseData: {
                filePath: this.pars.filePath,
                headers: {
                    "content-type": this.pars.imageType
                },
                isFile: true,
                fileStream: {
                    pipe: this.spies.pipe
                }
            },
            config: {
                headers: {"test": "123"},
                parent: {
                    filename: this.pars.parentFileName
                }
            }
        });
    }, {
        afters: function (next) {
            expect(this.spies.pipe).to.have.been.calledWith(this.pars.res);
            next();
        }
    });

    cup.pour("should handle file response with file not found", function () {
        const responder = this.getRequired("responder");

        responder(this.pars.req, this.pars.res, {
            notFound: true,
            responseData: {
                filePath: this.pars.filePath,
                isFile: true,
                fileStream: {}
            },
            config: {
                headers: {"test": "123"},
                parent: {
                    filename: this.pars.parentFileName
                }
            }
        });
    }, {
        afters: [
            function (next) {
                expect(this.spies.pipe).to.not.have.been.called();
                expect(this.pars.res.statusCode).to.equal(404);
                expect(this.pars.res.statusMessage).to.equal("not found");
                this.pars.result = "";
                next();
            },
            textResponseAfter]
    });
});