"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _debug = require("debug");

var _debug2 = _interopRequireDefault(_debug);

var debug = (0, _debug2["default"])("smocker");

function create() /*config*/{
	return function (req, res, responseData, options, next) {

		if (options.isFile && !options.notFound) {
			_attachFileStream(req, res, responseData, options, function () {
				next(responseData);
			});
		}
	};
}

function _attachFileStream(req, res, responseData, options, cb) {
	var filePath = _getFilePath(responseData, options);

	_fs2["default"].stat(filePath, function (err, stats) {

		if (!err) {
			debug("fileProcessor - found file to stream to response: " + filePath);
			res.setHeader("content-length", stats.size);
			responseData.fileStream = _fs2["default"].createReadStream(filePath); //prepare to stream the file to the response
		} else {
				debug("fileProcessor - failed to find file for response: " + filePath);
				options.notFound = true;
			}

		cb();
	});
}

function _getFilePath(responseData, options) {
	var filePath = responseData.filePath;

	if (!_path2["default"].isAbsolute(filePath)) {
		if (options.config.parent) {
			filePath = _path2["default"].join(_path2["default"].dirname(options.config.parent.filename), filePath);
		} else {
			filePath = _path2["default"].join(__dirname, filePath);
		}
	}

	return filePath;
}

exports.create = create;
