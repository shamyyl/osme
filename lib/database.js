var mysql = require("node-mysql"),
	crc32 = require("crc32"),
	executeQuery = require("executeQuery").createQuery,
	async = require('async.js');

var SELECTconnections = [],
	connections = [],
	INSERTconnection = 0,
	connectionCount = 20,
	queryCount = 0;

function connectionSort (a, b) {
	return a.used - b.used;
}

function getConnection (method) {
	if (method == 'SELECT') {
		SELECTconnections.sort(connectionSort);
		return SELECTconnections[0];
	} else {
		if (0)
			if (!INSERTconnection.TRANSACTION) {
				INSERTconnection.driver.query("START TRANSACTION");
				INSERTconnection.driver.query("SET AUTOCOMMIT=0");
				INSERTconnection.TRANSACTION = true;
			}
		return INSERTconnection;
	}
}

exports.getConnection = getConnection;

exports.init = function (settings) {
	if (settings.connectionCount) {
		connectionCount = settings.connectionCount;
	}
	SELECTconnections = [];
	for (var i = 0; i < connectionCount; ++i) {
		SELECTconnections[i] = {
			id: i,
			driver: mysql.createConnection(settings),
			used: 0
		};
	}
	INSERTconnection = {
		id: 'update',
		driver: mysql.createConnection(settings),
		used: 0
	};

	connections = [];
	connections.push.apply(connections, SELECTconnections);
	connections.push(INSERTconnection);
}

function query (sql, values, callback) {
	var method = sql.indexOf('SELECT') == 0 ? 'SELECT' : 'UPDATE';
	var connection = getConnection(method);
	connection.used++;

	queryCount++;
	var timestart = +(new Date());
	connection.driver.query(sql, values, function (err, results) {
		connection.used--;
		var timeTook = +(new Date()) - timestart;
		if (timeTook > 100) {
			console.log(timeTook, sql);
		}
		if (err) {
			console.log(sql);
			console.error(err);
			if (err.fatal) {
				throw new Error(err);
			}
		}
		if (callback) {
			callback(err, results);
		}
	});
}

exports.query = query;

var shutDownStartTime = 0;

var closeDatabase = function (connections) {
	var useCount = 0;
	for (var i = 0; i < connectionCount + 1; ++i) {
		useCount += connections[i].used;
	}
	if (useCount) {
		console.log('still ', useCount, ' in queue. ', queryCount, " passed");
		setTimeout(function () {
			closeDatabase(connections)
		}, 1000);
	} else {
		for (var i = 0; i < connectionCount + 1; ++i) {
			connections[i].driver.end();
		}
		console.log("ended in ", +(new Date()) - shutDownStartTime);
	}
}

exports.close = function () {
	for (var i = 0; i < connectionCount + 1; ++i) {
		if (connections[i].TRANSACTION) {
			connections[i].driver.query('COMMIT;');
		}
	}
	shutDownStartTime = +(new Date());
	closeDatabase(connections.slice(0));
	connections = [];
}

exports.hasAWay = function (id, callback, error, extendedData) {
	var SELECTFields = extendedData ? "coordinates,tags,firstNode,lastNode" : "ID";
	query("SELECT " + SELECTFields + " FROM ways WHERE Id=?", [id], function (err, results) {
		if (results.length == 0) {
			//console.log('empty Q',id,results);
			error();
		} else {
			callback(results[0]);
		}
	});
}

exports.saveWay = function (id, coordinates, tags, bounds, nodes, callback) {
	query("REPLACE INTO ways SET ?", {
		id: id,
		coordinates: coordinates,
		tags: JSON.stringify(tags) || '',
		minx: bounds[0][0],
		miny: bounds[0][1],
		maxx: bounds[1][0],
		maxy: bounds[1][1],
		firstNode: nodes[0],
		lastNode: nodes[nodes.length - 1]
	}, callback);
}

exports.saveRegion = function (id, tags, createRegionPaths, callback, force) {
	var callbackquery = executeQuery(callback);


	callbackquery.push();
	query("SELECT Id FROM regions WHERE Id=?", [id], function (err, results) {
		if (force || results.length == 0) {
			callbackquery.push();
			createRegionPaths(function () {
				query("DELETE FROM regions WHERE Id=?", [id], function () {
					callbackquery.push();
					query("INSERT INTO regions SET ?", {
						id: id,
						level: tags.admin_level
					}, function () {
						callbackquery.pop();
					});
					callbackquery.pop();
				});

				callbackquery.push();
				query("DELETE FROM regions_i18n WHERE regionId=?", [id], function () {
					for (var key in tags) {
						if (key.indexOf('alt_name') == 0) {
							key = 'name:@alt';
						}
						if (key.indexOf('name') == 0) {
							var lng = key.substr(5) || '@';
							callbackquery.push();
							query("INSERT INTO regions_i18n SET ?", {
								regionId: id,
								lang: lng,
								value: tags[key]
							}, function () {
								callbackquery.pop()
							});
						}
					}
					callbackquery.pop();
				});

				callbackquery.push();
				query("DELETE FROM regions_tags WHERE regionId=?", [id], function () {

					for (var key in tags) {
						callbackquery.push();
						query("INSERT INTO regions_tags SET ?", {
							regionId: id,
							tag: key,
							value: tags[key]
						}, function () {
							callbackquery.pop()
						});
					}
					callbackquery.pop();
				});
			});
		}
		callbackquery.pop();
	});
}


exports.linkPath = function (regionId, ways, callback) {
	var callbackquery = executeQuery(callback);
	callbackquery.push();
	query("DELETE FROM regionPaths WHERE regionId=?", [regionId], function () {
		var pathId = 0,
			order = 0;
		//save
		for (var j = 0, l = ways.length; j < l; ++j) {
			if (ways[j] !== 'break') {
				var dirrection = ways[j] < 0 ? -1 : 1,
					wayId = Math.abs(ways[j]);
				callbackquery.push();
				query("INSERT INTO regionPaths SET ?", {
					regionId: regionId,
					pathId: pathId,
					order: order,
					wayId: wayId,
					direction: dirrection
				}, function () {
					callbackquery.pop()
				});
				order++;
			} else {
				if (order > 0) {
					pathId++;
					order = 0;
				}
			}
		}
		callbackquery.pop();
	});
}


exports.assignParents = function (callback) {

	function updateSlots (callback) {
		query("DELETE FROM `regionParentsSlots`", [], function () {
			query("INSERT INTO `regionParentsSlots` SELECT r.id,slot,1 FROM regions as r INNER JOIN freeslots WHERE slot<r.level", [], function () {
				query("UPDATE `regionParentsSlots` as rps  LEFT JOIN regionParents as rp ON rp.region=rps.region LEFT JOIN regions as r ON r.id=rp.parent and r.level=slot SET free=0 WHERE r.id>0", [], callback);
			});
		});
	}

	function updateRegionParents (callback) {
		query("DELETE FROM regionParents WHERE stage=0",
			[],
			function () {
				updateSlots(function () {
					//установка непосредственного родителя
					query("UPDATE regions as r SET flag=42,parent=(SELECT parent FROM regionParents WHERE region=r.id ORDER BY deltaLevel ASC LIMIT 1)",
						[],
						function () {
							console.log('flow parents');
							//переброс уровня родителя
							query("UPDATE regions as r LEFT JOIN regions as r2 on r2.id=r.parent SET r.flag=r2.level WHERE r.parent!=0",
								[],
								function () {
									console.log('subupdate');

									//снятие флага с элементов которые имеют родителя уровня 2(страна)
									query("UPDATE regions SET flag=0 WHERE flag=2",
										//query("UPDATE regions as r LEFT JOIN regionParents as rp on rp.region=r.id LEFT JOIN regions as r2 on r2.id=rp.parent SET r.flag=0 WHERE r2.level=2",
										[],
										callback);
								})
						});
				});
			});
	}

	function clear (callback) {
		console.log('clear parents');
		query("DELETE FROM regionParents WHERE 1", [], function () {
			query("UPDATE regions SET parent=0", [], function () {
				callback();
			});
		});
	}
ß
	function linkBack (callback) {
		console.log('linking');
				query("INSERT INTO regionParents SELECT id,0,-level,0 FROM regions WHERE id NOT IN(SELECT region FROM regionParents)", [], function () {
					updateRegionParents(callback);
				});
	}

	function linkDirectParent (callback) {
		//связывание регионов имеющие общие границы с родителем
		query("INSERT INTO regionParents SELECT aid,cid,delta,1 FROM (SELECT a.id as aid, c.id as cid,c.level-a.level as delta, count(*) as hits \
                FROM regions AS a\
                INNER JOIN regionPaths AS b ON a.id = b.regionId\
                INNER JOIN regionPaths AS b2 ON b2.wayId = b.wayId and b2.direction = b.direction\
                INNER JOIN regions AS c ON c.id = b2.regionId\
                WHERE a.level > c.level\
                GROUP BY aid,delta,c.id ORDER BY hits DESC) as intable GROUP BY aid,delta", [], callback);
	}

	var stageOn = 1;

	function fetchParents (callback) {
		stageOn++;
		// связывание регионов которые имеют связь с родителем
		// но нет доступа до верхних уровней
		query("INSERT INTO regionParents  SELECT a.id, c.id, c.level - a.level,1" + stageOn + "\
            FROM regions AS a\
            INNER JOIN regionParents AS rp ON rp.region = a.parent \
            INNER JOIN regions AS cp ON cp.id = a.parent\
            INNER JOIN regions AS c ON c.id = rp.parent\
            WHERE a.parent and cp.flag=0 and a.level > c.level\
            AND a.flag > c.level\
            GROUP BY a.id, c.id", [], callback);

	}

	function setNearestParent (callback) {
		// связывание регионов которые не имеют общих связей с родителем
		// но есть доступ до регионов того же уровня которые имеют
		// при этом регион не должен иметь общих связей с предполагаемым родителем
		//
		query("INSERT INTO regionParents  SELECT a.id, c.id, c.level - a.level,2" + stageOn + "\
            FROM regions AS a\
            INNER JOIN regionPaths AS b ON a.id = b.regionId\
            INNER JOIN regionPaths AS b2 ON b2.wayId = b.wayId\
            AND b2.direction = - b.direction\
            INNER JOIN regionParents AS rp ON rp.region = b2.regionId\
            LEFT JOIN regionParents AS rp3 ON rp3.region = b.regionId\
            INNER JOIN regions AS c ON c.id = rp.parent\
            INNER JOIN regions AS c2 ON c2.id = rp.region\
            INNER JOIN regionParentsSlots as rps ON rps.region=a.id and rps.slot=c.level \
            WHERE a.level > c.level and a.level<=c2.level\
            AND ((rps.free and (rp3.stage=null OR rp3.stage!=1)) OR a.flag=42)\
		    GROUP BY a.id, c.id", [], function () {
			//снимает родителей со смежных регионов
			//callback();return;

			//UPDATE regionParents AS rp INNER JOIN regions r ON r.id = rp.region INNER JOIN regionPaths AS b ON rp.region = b.regionId INNER JOIN regionPaths AS b2 ON b2.wayId = b.wayId AND b.direction = - b2.direction AND b2.regionId = rp.parent SET flag =43 WHERE b.wayId AND b2.wayId

			query("UPDATE regionParents as rp\
			    INNER JOIN regions r ON r.id=rp.region\
				INNER JOIN regionPaths AS b ON rp.region = b.regionId\
                INNER JOIN regionPaths AS b2 ON b2.wayId = b.wayId AND b2.direction = - b.direction and b2.regionId=rp.parent\
                SET stage=0\
                WHERE b.wayId and b2.wayid and stage=2" + stageOn,
				[], callback);
		});

		//            AND 0 = (SELECT COUNT(*) FROM regionPaths AS rp3 WHERE (rp3.regionId = c.id OR rp3.regionId=c2.id) AND rp3.wayId = b.wayId )\

	}

	function stage (callback) {
		console.log(">>stage", stageOn);
		updateRegionParents(function () {
			fetchParents(function () {
				updateRegionParents(function () {
					setNearestParent(callback);
				});
			})
		});
	}

	console.log('assigning parents');
	clear(function () {
		console.log('stage 1');
		linkDirectParent(function () {
			console.log('stage 2');
			updateRegionParents(function () {
				//связывание внутрених регионов
				stage(function () {
					//вторичное связывание
					//не все регионы доступны в первый шаг
					stage(function () {
						// финальный проход, закрывает пятую итерацию(районы москвы)
						stage(function () {
							stage(function () {
								stage(function () {
									linkBack(callback);
								});
							});
						});
					});
				});
			});
		});
	});
}

exports.queryRegions = function (querySettings, callback) {
	var params = [];
	var where = [];
	var lang = querySettings.language || 'ru';
	var result = {};
	console.log(querySettings);
	if (querySettings.adminLevel) {
		where.push('level in (' + querySettings.adminLevel + ')');
		//params.push(querySettings.adminLevel)
	}
	if (querySettings.country) {
		where.push('(Id=? OR rp2.parent=?)');
		params.push(querySettings.country[0]);
		params.push(querySettings.country[0]);
	}

	if (querySettings.id) {
		where.push('Id=?');
		params.push(querySettings.id);
	}
	where = where.join(' AND ');
	if (!where)where = 0;

	//console.log(where, params, 'l', lang);
	query("SELECT Id,level,rp1.parent as parent,rp1.deltaLevel FROM regions LEFT JOIN regionParents rp1 ON rp1.region=Id LEFT JOIN regionParents rp2 ON rp2.region=Id WHERE " + where + " GROUP BY Id,parent,deltalevel ORDER BY Id,deltaLevel ASC", params, function (err, results) {
		var cntRegions = 0;
		for (var i = 0, l = results.length; i < l; ++i) {
			var rid = results[i].Id;
			if (!result[rid]) {
				cntRegions++;
				result[rid] = {
					id: rid,
					level: results[i].level
				};
			}
			if (results[i].parent) {
				if (!result[rid].parents) {
					result[rid].parents = [];
				}
				result[rid].parents.push({
					id: results[i].parent,
					delta: results[i].deltaLevel
				});
			}
		}

		function appendNames (callback) {
			async.forEach(Object.keys(result), function (regionId, callback) {
				query("SELECT lang,value FROM regions_i18n WHERE regionId=? and (lang='@' or lang='en' or lang=?)", [regionId, lang], function (err, results) {
					var rlang = {};
					for (var i = 0, l = results.length; i < l; ++i) {
						rlang[results[i].lang] = results[i].value;
					}

					if (rlang[lang]) {
						result[regionId].name = rlang[lang];
					} else {
						if (rlang['@'] && inNativeCodeSet(rlang['@'], lang)) {
							//спец обработка локальных названий
							result[regionId].name = rlang['@'];
						} else if (rlang['en']) {
							result[regionId].name = rlang['en'];
						} else if (rlang['@']) {
							result[regionId].name = rlang['@'];
						}
					}
					callback();
				});
			}, callback);
		}

		function appendTags (callback) {
			async.forEach(Object.keys(result), function (regionId, callback) {
				query("SELECT tag,value FROM regions_tags WHERE regionId=?", [regionId], function (err, results) {
					var tags = {};
					for (var i = 0, l = results.length; i < l; ++i) {
						tags[results[i].tag] = results[i].value;
					}
					result[regionId].tags = tags;
					callback();
				});
			}, callback);
		}

		appendNames(function () {
			if (querySettings.withTags) {
				appendTags(function () {
					callback(result);
				});
			} else {
				callback(result);
			}
		});


	});
}

function inNativeCodeSet (name, lang) {

	if (lang == 'ru') {
		//не все имена представлены как :ru, иногда лучше проверить ручками
		var cp1251 = ' -,йфяцычувскамепинртгоьшлбщдюзжэхъё';
		name = name.toLowerCase();
		for (var i = 0, l = name.length; i < l; ++i) {

			if (cp1251.indexOf(name[i]) >= 0) {

			} else {
				return false;
			}
		}
		return true;

	}
	return false;
}

exports.getRegionPaths = function (regions, callback) {
	var data = {};
	async.forEach(regions, function (regionId, callback) {
		query("SELECT pathId,`order`,wayId,direction FROM regionPaths WHERE regionId=? ORDER BY pathId,`order`", [parseInt(regionId)], function (err, results) {
			data[regionId] = results;
			callback();
		})
	}, function () {
		callback(data);
	})
}


exports.getPaths = function (waysIds, callback) {
	var ways = {};
	async.forEach(waysIds, function (wayId, callback) {
		query("SELECT coordinates FROM ways WHERE Id=? LIMIT 1", [wayId], function (err, results) {
			if (results.length > 0) {
				ways[wayId] = results[0].coordinates;
			}
			callback();
		});
	}, function () {
		callback(ways);
	})
}

exports.cache = function (name, request, callback) {
	var crc = parseInt('0x' + crc32(name));
	var fetchData = function (newdata) {
		query("INSERT INTO cache SET ?", {
			url: name,
			crc: crc,
			content: newdata,
			timestamp: +(new Date())
		}, function () {
			callback(newdata);
		});
	}

	query('SELECT content FROM cache WHERE crc=? and url = ? LIMIT 1', [crc, name], function (err, results) {
			if (results.length == 0 || results[0].content.length < 5 || results[0].content[0] != '{') {
				request(function (newdata) {
						if (results.length == 0) {
							fetchData(newdata);
						} else {
							query("DELETE FROM cache WHERE url=?", [name], function () {
								fetchData(newdata);
							});
						}
					}
				);
			} else {
				callback(results[0].content);
			}
		}
	);
}