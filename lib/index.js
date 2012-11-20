var async = require('async.js')
var relationManager = require('./relation.js');
var wayManager = require('./way.js');
var simplification = require('./simplification');
var file = require('file.js');

exports.rel = function (relationIDs, epsilon) {

//rel[admin_level~"2|3|4|5"][type=boundary]
    relationManager.query("rel['addr:country'='RU'][type=boundary]", function (region) {
        //relationManager.query('(relation(60189);)', function (region) {
        //filter
        return true;//region.tags['addr:country'] == 'RU';
    }, function (regions) {

        //appendSubareas(regions, function (regions) {

        loadWays(getWays(regions), epsilon, function (ways) {
            file.write("../tmp-data/result.js",
                'var osme=' +
                    JSON.stringify(
                        {
                            regions: regions,
                            ways: ways
                        },
                        null,
                        '    '
                    )
            );
        });
        //});
    });
}

function appendSubareas (regions, callback) {
    var relationIDs = [],
        mask = {};

    regions.forEach(function (inregion) {
        mask[inregion.id] = 1;
    });
    regions.forEach(function (inregion) {
        inregion.subareas.forEach(function (i) {
            if (!mask[i]) {
                relationIDs.push(i);
            }
        });
    });
    loadRelations(relationIDs, function (subareas) {
        console.log('appended ', subareas.length, ' areas');
        var newregions = regions.slice(0);
        newregions.push.apply(newregions, subareas);
        console.log('result:', newregions.length, ' Relations');
        callback(newregions);
    })
}

function loadRelations (relationIDs, callback) {
    var regions = [];
    async.forEach(
        relationIDs,
        function (id, callback) {
            relationManager.loadByID(
                id,
                function (region) {
                    regions.push(region[0]);
                    callback();
                },
                callback
            );
        },
        function () {
            callback(regions);
        }
    );
}

function getWays (regions) {
    var ways = {};
    regions.forEach(function (region) {
        if (!region.outer) {
            console.log(region);
        }
        region.outer.forEach(function (wayID) {
            ways[wayID] = true;
        })
        region.inner.forEach(function (wayID) {
            ways[wayID] = true;
        })
    });
    return Object.keys(ways);
}

function loadWays (wayIDs, epsilon, callback) {
    var ways = {};
    console.log(wayIDs.length, ' ways to load');
    async.forEach(
        wayIDs,
        function (id, callback) {
            wayManager.loadByID(
                id,
                epsilon,
                function (way) {
                    ways[id] = way;
                    callback();
                },
                callback
            );
        },
        function () {
            callback(ways);
        }
    );
}