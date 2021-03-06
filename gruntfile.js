module.exports = function (grunt) {

	require("time-grunt")(grunt);

	grunt.loadNpmTasks("grunt-eslint");
	grunt.loadNpmTasks("grunt-babel");
	grunt.loadNpmTasks("grunt-contrib-clean");
	grunt.loadNpmTasks("grunt-contrib-copy");
	grunt.loadNpmTasks("grunt-mocha-test");
	grunt.loadNpmTasks("grunt-blanket");
	grunt.loadNpmTasks("grunt-coveralls");

	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),

		clean: {
			lib: {
				src: ["./lib/**/*"]
			},
			output: {
				src: ["./output/**/*"]
			},
			outputLib: {
				src: ["./output/lib/**/*"]
			}
		},

		"babel": {
			options: {
				sourceMap: false
			},
			dist: {
				files: [
					{expand: true, src: "**/*.js", dest: "./lib", cwd: "./src/"}
				]
			},
			test: {
				files: [
					{expand: true, src: "**/*.js", dest: "./output/lib", cwd: "./src/"}
				]
			}
		},

		eslint: {
			target: ["./src/**/*.js"]
		},

		copy: {
			testCoverage: {
				files: [
					{expand: true, src: "./test/**/*.js", dest: "./output/coverage/"}
				]
			}
		},

		blanket: {        //output the instrumented files
			output: {
				src: "./output/lib/",
				dest: "./output/coverage/output/lib"
			}
		},

		mochaTest: {
			test: {
				options: {
					reporter: "spec",
					captureFile: "output/results.txt" // Optionally capture the reporter output to a file
				},
				src: ["./test/smocker.tests.js"]
			},
			coverage: {
				options: {
					reporter: "mocha-lcov-reporter",
					quiet: false,
					captureFile: "./output/coverage.lcov.txt"
				},
				src: ["./output/coverage/test/smocker.tests.js"]
			},
			htmlcov: {
				options: {
					reporter: "html-cov",
					quiet: true,
					captureFile: "./output/coverage.html"
				},
				src: ["./output/coverage/test/smocker.tests.js"]
			},
			"travis-cov": {
				options: {
					reporter: "travis-cov"
				},
				src: ["./output/coverage/test/stirrer.tests.js"]
			}
		},

		coveralls: {
			options: {
				force: true //dont break build if cant talk to coveralls.io
			},
			smockerCoverage: {
				src: "./output/coverage.lcov.txt"
			}
		}
	});

	grunt.registerTask("trans", ["clean:lib", "babel:dist"]);
	grunt.registerTask("test", ["clean:outputLib", "babel:test", "mochaTest:test"]);
	grunt.registerTask("prepareCoverage", ["clean:output", "babel:test", "blanket", "copy:testCoverage"]);
	grunt.registerTask("localcov", ["prepareCoverage", "mochaTest:htmlcov"]);
	grunt.registerTask("coverage", ["prepareCoverage",  "mochaTest:coverage", "coveralls"]);
	grunt.registerTask("build", ["eslint", "coverage", "mochaTest:travis-cov", "trans"]);

	grunt.registerTask("default", ["eslint", "test"]);

	//grunt.registerTask("repl");
};