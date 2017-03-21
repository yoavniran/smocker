import fs from "fs";
import path from "path";
import Debug from "debug";

const debug = Debug("smocker");

function _attachFileStream(req, res, responseData, options, cb) {
	var filePath = _getFilePath(responseData, options);

	fs.stat(filePath, (err, stats) => {

		if (!err) {
			debug("fileProcessor - found file to stream to response: " + filePath);
			res.setHeader("content-length", stats.size);
			responseData.fileStream = fs.createReadStream(filePath);//prepare to stream the file to the response
		}
		else {
			debug("fileProcessor - failed to find file for response: " + filePath);
			options.notFound = true;
		}

		cb();
	});
}

function _getFilePath(responseData, options) {
	let filePath = responseData.filePath;

	if (!path.isAbsolute(filePath)) {
		if (options.config.parent) {
			filePath = path.join(path.dirname(options.config.parent.filename), filePath);
		}
		else {
			filePath = path.join(__dirname, filePath);
		}
	}

	return filePath;
}

export default (/*config*/) =>
	(req, res, responseData, options, next) => {

		if (responseData.isFile && !options.notFound) {
			debug("fileProcessor - responding with file to : " + req.url);
			_attachFileStream(req, res, responseData, options, () => {
				next(responseData);
			});
		}
		else {
			next(responseData);
		}
	};