var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer"),
    _ = require("lodash");

describe("file processor tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    var cup = stirrer.grind({
        restirForEach: true,
        pars: {
            req: {},
            res: {},
            responseData: {
                filePath: "some/file"
            },
            optionsWithParent: {
                isFile: true,
                config: {
                    parent: {
                        filename: "/parent/path"
                    }
                }
            },
            optionsNoParent: {
                isFile: true,
                config: {}
            },
            fileStream: {pipe: true},
            fileSize: 2000,
            parentDir: "pdir",
            absFilePath: "/abs/file/path"
        },
        spies: {
            setHeader: stirrer.EMPTY
        },
        beforeEach: function () {
            this.pars.res.setHeader = this.spies.setHeader
        },
        requires: [{
            path: "../lib/mockProcessors/fileProcessor",
            options: {alias: "processor"}
        }]
    });

    cup.pour("should successfully load file - with absolute file path", function (done) {

        var processor = this.getRequired("processor");

        var processorFn = processor.create();

        processorFn(this.pars.req, this.pars.res, _.clone(this.pars.responseData), this.pars.optionsNoParent, function (data) {
            expect(data.fileStream).to.equal(cup.pars.fileStream);
            done();
        });

    }, {
        befores: function (next) {
            this.getStub("path").isAbsolute.returns(true);
            this.getStub("fs").stat.callsArgWith(1, null, {size: this.pars.fileSize});
            this.getStub("fs").createReadStream.returns(this.pars.fileStream);
            next();
        },
        afters: function (next) {
            expect(this.getStub("path").isAbsolute).to.have.been.calledWith(this.pars.responseData.filePath);
            expect(this.getStub("fs").createReadStream).to.have.been.calledOnce();
            expect(this.getStub("fs").createReadStream).to.have.been.calledWith(this.pars.responseData.filePath);
            expect(this.spies.setHeader).to.have.been.calledWith("content-length", this.pars.fileSize);
            next();
        }
    });

    cup.pour("should successfully load file - with rel file path and with parent", function (done) {

        var processor = this.getRequired("processor");

        var processorFn = processor.create();

        processorFn(this.pars.req, this.pars.res, _.clone(this.pars.responseData), this.pars.optionsWithParent, function (data) {
            expect(data.fileStream).to.equal(cup.pars.fileStream);
            done();
        });
    }, {
        befores: function (next) {
            this.getStub("path").isAbsolute.returns(false);
            this.getStub("path").dirname.returns(this.pars.parentDir);
            this.getStub("path").join.returns(this.pars.absFilePath);
            this.getStub("fs").stat.callsArgWith(1, null, {size: this.pars.fileSize});
            this.getStub("fs").createReadStream.returns(this.pars.fileStream);
            next();
        },
        afters: function (next) {
            expect(this.getStub("path").isAbsolute).to.have.been.calledWith(this.pars.responseData.filePath);
            expect(this.getStub("path").dirname).to.have.been.calledWith(this.pars.optionsWithParent.config.parent.filename);
            expect(this.getStub("path").join).to.have.been.calledWith(this.pars.parentDir, this.pars.responseData.filePath);
            expect(this.getStub("fs").createReadStream).to.have.been.calledOnce();
            expect(this.getStub("fs").createReadStream).to.have.been.calledWith(this.pars.absFilePath);
            expect(this.spies.setHeader).to.have.been.calledWith("content-length", this.pars.fileSize);
            next();
        }
    });

    cup.pour("should successfully load file - with rel file path and no parent", function (done) {

        var processor = this.getRequired("processor");
        var processorFn = processor.create();

        processorFn(this.pars.req, this.pars.res, _.clone(this.pars.responseData), this.pars.optionsNoParent, function (data) {
            expect(data.fileStream).to.equal(cup.pars.fileStream);
            done();
        });
    }, {
        befores: function (next) {
            this.getStub("path").isAbsolute.returns(false);
            this.getStub("path").join.returns(this.pars.absFilePath);
            this.getStub("fs").stat.callsArgWith(1, null, {size: this.pars.fileSize});
            this.getStub("fs").createReadStream.returns(this.pars.fileStream);
            next();
        },
        afters: function (next) {
            expect(this.getStub("path").isAbsolute).to.have.been.calledWith(this.pars.responseData.filePath);
            expect(this.getStub("fs").createReadStream).to.have.been.calledOnce();
            expect(this.getStub("fs").createReadStream).to.have.been.calledWith(this.pars.absFilePath);
            expect(this.spies.setHeader).to.have.been.calledWith("content-length", this.pars.fileSize);

            expect(this.getStub("path").join).to.have.been.calledWith(sinon.match.string, this.pars.responseData.filePath);

            var path = require("path");
            var joinFirstArg = this.getStub("path").join.getCall(0).args[0];
            expect(joinFirstArg).to.satisfy(function (val) {
                return val.endsWith(path.sep + "lib" + path.sep + "mockProcessors")
            });
            next();
        }
    });

    cup.pour("test file not found", function (done) {

        var processor = this.getRequired("processor");
        var processorFn = processor.create();

        processorFn(this.pars.req, this.pars.res, _.clone(this.pars.responseData), this.pars.optionsNoParent, function (data) {
            expect(data.fileStream).to.not.exist();
            expect(cup.pars.optionsNoParent.notFound).to.be.true();
            done();
        });
    }, {
        befores: function (next) {
            this.getStub("path").isAbsolute.returns(true);
            this.getStub("fs").stat.callsArgWith(1, new Error("not found!"));
            next();
        }
    });
});