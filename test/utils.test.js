var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");

describe("utils tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    var cup = stirrer.grind({
        pars: {
            requireRes: {foo: "bar"}
        },
        stubs: {
            require: stirrer.EMPTY
        },
        requires: [{
            path: "../lib/utils",
            options: {alias: "utils"}}]
    });

    describe("dynamicLoad tests", function () {

        cup.pour("should return require result from parent", function () {

            var result = this.getRequired("utils").dynamicLoad({require: this.stubs.require}, "some/path");

            expect(result).to.equal(this.pars.requireRes);
        }, {
            befores: function (next) {
                this.stubs.require.returns(this.pars.requireRes);
                next();
            }
        });
    });
});