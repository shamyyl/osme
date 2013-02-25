/**
 * @fileOverview рекурсивное находжение родителей на основе геокодера
 *
 */
var connection = require('./initConnection.js');
var database = require("./database.js");
var async = require("async.js");
var connection = database.getConnection('SELECT');
var bincode = require("./binaryCode.js");

var math = require("./math.js");
var geocoder = require("./backgeocode.js");


exports.process = function (callback) {
    var startLevel = 3;
    connection.driver.query("SELECT Id,parent FROM regions WHERE Level=? limit 5", [startLevel], function (err, results) {
        if (err) {
            throw new Error(err);
        }
        var regions = {};
        for (var i in results) {
            regions[results[i].Id] = results[i];
        }
        var regionKeys = Object.keys(regions);
        var regionWays = {}, ways = {};
        database.getRegionPaths(regionKeys, function (regionPaths) {
            for (var regionId in regionPaths) {
                var regionData = regionPaths[regionId];
                for (var path in regionData) {
                    var wid = regionData[path].wayId;
                    regionWays[regionId] = {wayId:wid, direction:regionData[path].direction};
                    ways[wid] = wid;
                    break;
                }
            }

            database.getPaths(Object.keys(ways), function (ways) {
                var coordinates = {};
                for (var wid in ways) {
                    coordinates[wid] = bincode.decode(ways[wid], 2);
                }
                async.forEach(Object.keys(regionWays), function (regionId, callback) {
                    var region = regionWays[regionId],
                        thisWay = coordinates[region.wayId],
                        point = getPointInside(thisWay, region.direction);
                    geocoder.geocode(point, {level:2}, function (results) {
                        if (!results) {
                            console.log(regionId, " empty");
                        } else {
                            if (results.hit != regions[regionId].parent) {
                                console.log("? as parent", results, regions[regionId]);
                            } else {
                                console.log('region ', regionId, ' with', regions[regionId].parent, ' ok');
                            }
                        }
                        callback();
                    });

                }, callback);
                //callback();
            });

        });
    });
}

function getPointInside(way, direction) {
    var a = way[0],
        b = way[1],

        vector = [b[0] - a[0], b[1] - a[1]],
        middlepoint = [a[0] + vector[0] / 2, a[1] + vector[1] / 2],
        length = Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]),
        width = Math.max(length / 10, 0.01),
        normal = [width * vector[0] / length, width * vector[1] / length],
        arrow1 = [-normal[1], normal[0]],
        arrow2 = [ normal[1], -normal[0]],
        point1 = [middlepoint[0] + arrow1[0], middlepoint[1] + arrow1[1]],
        point2 = [middlepoint[0] + arrow2[0], middlepoint[1] + arrow2[1]],

        SQ1 = math.getSquare([a, b, point1]),
        SQ2 = math.getSquare([a, b, point2]);

    // console.log(SQ1, SQ2, direction, point1, point2, normal);
    if (SQ1 > 0 && direction < 0) return point1;
    return point2;

}


exports.process(function () {
    console.log('end');
});


