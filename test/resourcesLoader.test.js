var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");

describe("resources loader tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    var cup = stirrer.grind({
        pars: {
            config: {
                requestPrefix: "myPrfx",
                resources: "bla/bla",
                dynamicSymbol: "$"
            },
            simpleResource: "orders.users",
            pathResource: "campaigns.target.$",
            fileResource: "files.images.logo..jpg"
        },
        requires: [{
            path: "../lib/resourcesLoader",
            options: {alias: "loader"}
        }]
    });

    cup.pour("should succeed to convert a simple path", function (done) {

        var loader = this.getRequired("loader");

        var p = loader.load(this.pars.config);

        expect(p).to.exist();

        p.then(function (resources) {
            expect(resources).to.exist();
            expect(resources).to.have.length(1);

            var resource = resources[0];

            expect(resource.path).to.equal("bla/bla/orders.users");
            expect(resource.rgx.source).to.equal("\\/myPrfx\\/orders\\/users");
        }, done).then(done, done);
    }, {
        befores: function (next) {
            this.getStub("fs").readdir.callsArgWithAsync(1, null, [this.pars.simpleResource]);
            next();
        }
    });

    cup.pour("should succeed to convert a path with path par", function (done) {
        var loader = this.getRequired("loader");

        loader.load(this.pars.config) //, function (err, resources) {
            .then(function (resources) {
                var resource = resources[0];

                expect(resource.path).to.equal("bla/bla/campaigns.target.$");
                expect(resource.rgx.source).to.equal("\\/myPrfx\\/campaigns\\/target(?:\\/?)([^\\\\/\\s\\?]*)");
            }, done).then(done, done);
    }, {
        befores: function (next) {
            this.getStub("fs").readdir.callsArgWithAsync(1, null, [this.pars.pathResource]);
            next();
        }
    });

    cup.pour("should succeed to convert a path with .", function (done) {

        var loader = this.getRequired("loader");

        loader.load(this.pars.config) //, function (err, resources) {
            .then(function (resources) {
                var resource = resources[0];

                expect(resource.path).to.equal("bla/bla/files.images.logo..jpg");
                expect(resource.rgx.source).to.equal("\\/myPrfx\\/files\\/images\\/logo.jpg");
            }, done).then(done, done);
    }, {
        befores: function (next) {
            this.getStub("fs").readdir.callsArgWithAsync(1, null, [this.pars.fileResource]);
            next();
        }
    });

    cup.pour("should reject on fs error", function (done) {

        var loader = this.getRequired("loader");

        loader.load(this.pars.config)
            .then(function () {
                    throw new Error("should not have been resolved!");
                },
                function (err) {
                    expect(err).to.be.an.instanceOf(Error);
                }).then(done, done);

    }, {
        befores: function (next) {
            this.getStub("fs").readdir.callsArgWithAsync(1, new Error("bahhhh!"), null);
            next();
        }
    });
});