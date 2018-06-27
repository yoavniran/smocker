import fs from "fs";
import Debug from "debug";

const debug = Debug("smocker");

const getResourceReplacers = (config) =>
	[
		{rgx: new RegExp("\\.\\" + config.dynamicSymbol, "g"), val: "(?:\/?)([^\\/\\s\\?]*)"}, //replace all dynamic symbols with a regex that supports optional /<value>
		{rgx: /([^\.])\.(?!\.)/g, val: "$1/"}, //replace single . with /
		{rgx: /\//g, val: "\\/"}, //replace all / with // (rgx escaped)
		{rgx: /\.\./g, val: "."} //replace double . with single .
	];

const getPrefix = (config) =>
	(config.requestPrefix ? `/${config.requestPrefix}/` : "");

const buildResourceRgxSource = (prefix, resourceValue, replacers) =>
	replacers.reduce((val, rep) => val.replace(rep.rgx, rep.val),
		(prefix + resourceValue));

const getResourcesFromDirs = (dirs, config) => {
	const prefix = getPrefix(config),
		replacers = getResourceReplacers(config),
		resources = [];

	debug("resourceLoader - loading resources from: " + config.resources + " with prefix: " + prefix);

	dirs.forEach((val) => {
		const resRgxSource = buildResourceRgxSource(prefix, val, replacers);
		debug("resourceLoader - loaded path rgx = " + resRgxSource);

		resources.unshift({ //putting longer paths before shorter ones (naively)
			path: config.resources + "/" + val,
			rgsSrc: resRgxSource,
			rgx: new RegExp(resRgxSource)
		});
	});

	return resources;
};

export default (config) =>
	new Promise((resolve, reject) => {
		fs.readdir(config.resources, (err, dirs) => {
			if (!err) {
				let resources = getResourcesFromDirs(dirs, config);
				resolve(resources);
			}
			else {
				reject(err);
			}
		});
	});