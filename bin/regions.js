var regions = {
    decodeWay: function (way, wayId, osmeData) {
        if (osmeData.wayCache[wayId]) {
            return osmeData.wayCache[wayId];
        }
        osmeData.wayCache[wayId] = ymaps.util.coordinates.decode(way);
        return osmeData.wayCache[wayId];
    },

    getGeometry: function (regionId, osmeData) {
        var coordinates = [],
            meta = [],
            paths = osmeData.paths[regionId],
            osmeWays = osmeData.ways;

        osmeData.wayCache = osmeData.wayCache || {};

        for (var pathId = 0, pathLength = paths.length; pathId < pathLength; ++pathId) {
            var path = paths[pathId];
            var pathCoordinates = [],
                ways = [];
            for (var i = 0, l = path.length; i < l; ++i) {
                var wayId = Math.abs(path[i]);
                var way = this.decodeWay(osmeWays[wayId], wayId, osmeData);
                if (path[i] < 0) {
                    way = way.slice(0);
                    way.reverse();
                }
                //координаты соседних кусочков совпадают
                if (pathCoordinates.length) {
                    pathCoordinates.length = pathCoordinates.length - 1;
                }
                pathCoordinates.push.apply(pathCoordinates, way);
                ways.push(wayId);
            }
            coordinates.push(pathCoordinates);
            meta.push(ways);
        }

        return {
            type: 'Polygon',
            fillRule: 'nonZero',
            coordinates: coordinates,
            ways: meta
        }
    }
};