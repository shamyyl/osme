var database = require('./database.js');
var async = require("async.js");
var bincode = require("./binaryCode.js");


var findClosestPathPosition = require("./math.js").findClosestPathPosition;
var getSquare = require("./math.js").getSquare;

//SELECT * FROM regions_tags WHERE tag='name' and regionId IN (SELECT regionId FROM regionPaths WHERE wayId IN (SELECT id FROM `ways` WHERE minX<55.743545 and maxY>37.597962 and minY<37.597962))


function explain (rid, callback, settings) {

	var result = {};
	database.queryRegions({
		id: rid,
		withTags: settings.withTags
	}, function (results) {
		console.log('Q', results);
		var regions = [];
		result[rid] = results[rid];
		for (var j in results[rid].parents) {
			regions.push(results[rid].parents[j].id);
		}
		async.forEach(regions, function (id, callback) {
			database.queryRegions({id: id}, function (results) {
				//console.log(results)
				for (var i in results) {
					delete results[i].parents;
					result[i] = results[i];
				}
				callback();
			});
		}, function () {
			callback({
				hit: rid,
				trace: result
			});
		});
	})
}

function findRegion (waySet, testPoint, settings, callback, excode) {
	var dist = waySet.distance,
		coords = waySet.coordinates,
		SQ = -getSquare([coords[dist.prevPointIndex], coords[dist.nextPointIndex], testPoint]);

	if (settings.verbose) {
		console.log('SQ', SQ, 'wid', waySet.wayId);
	}

	var direction = (SQ > 0 ? -1 : 1);  // ???

	if (excode) {
		direction *= -1;
	}

	var exWhere = '1';
	if (settings.level) {
		exWhere = 'r.level<=' + settings.level + ' ';
	}

	database.query(
		"SELECT r.Id as rid FROM regions as r LEFT JOIN regionPaths as rp ON rp.regionId=r.id WHERE WayId=? and (direction=?) and " + exWhere + " ORDER BY level DESC",
		[waySet.wayId, direction], function (err, results) {
			if (err) throw err;
			if (settings.verbose) {
				console.log('>>', results);
			}
			if (results.length == 0) {
				if (excode) {
					callback(false);
				} else {
					findRegion(waySet, testPoint, settings, callback, 1)
				}
			} else {
				process.nextTick(function () {
					explain(results[0].rid, callback, settings, excode);
				});
			}
		});
}


function sortResults (results, testCenter, settings) {
	var distance = 10000000,
		selected = 0;

	for (var i in results) {

		//минимально возможное растояние
		var deltaX = Math.abs(results[i].minx - testCenter[0]);

		if (deltaX <= distance) {
			var coordinates = bincode.decode(results[i].coordinates, 2);
			delete results[i].coordinates;

			var dres = findClosestPathPosition(coordinates, testCenter);
			if (dres.distance <= distance) {
				distance = dres.distance;
				selected = {
					distance: dres,
					wayId: results[i].wayId,
					record: results[i],
					coordinates: coordinates
				};
				if (settings.verbose) {
					console.log('SEL', results[i], dres);
				}
			}
		}
	}
	return selected;
}

var inout = 0;

function geocode (testCenter, settings, callback) {

	var exWhere = '';
	if (settings.level) {
		exWhere = 'AND r.level<=' + settings.level + ' ';
	}
	if (settings.not) {
		exWhere += 'AND r.id!=' + settings.not + ' ';
	}
	if (settings.fullPath) {
		exWhere += 'AND (r.flag!=42 OR r.level=2) ';
	}
	var SQL =
		'SELECT regionPaths.regionId as regionId, wayId,direction, coordinates, ways.minx, ways.miny, ways.maxx, ways.maxy ' +
			'FROM regionPaths ' +
			'LEFT JOIN ways ON ways.id = regionPaths.wayId ' +
			'LEFT JOIN regions as r ON r.id = regionPaths.regionId ' +
			'WHERE ways.minX < ? and ways.minX > ?' +
			'AND ways.maxY > ? AND ways.maxY < ? ' +
			'AND ways.minY < ? AND ways.minY > ? ' +
			exWhere +
			'GROUP BY wayId ORDER BY maxX DESC LIMIT 0,50';

	var deltaSearch = 5;

	console.log(SQL);

	database.query(SQL, [
		testCenter[0], testCenter[0] - deltaSearch,
		testCenter[1], testCenter[1] + deltaSearch,
		testCenter[1], testCenter[1] - deltaSearch
	], function (err, results) {
		if (err) {
			console.error(err);
		}
		console.log('in', results.length, 'ways');
		var selected = sortResults(results, testCenter, settings);

		if (selected) {
			process.nextTick(function () {
				findRegion(selected, testCenter, settings, callback)
			});
		} else {
			console.log('no match');
			callback();
		}

	});
}

exports.geocode = geocode;



