var yRegion = {
    load: function (countryCode, ymaps, callback) {
        jQuery.getScript('../tmp-data/osme.json', function () {

            var collection = new ymaps.GeoObjectCollection();
            for (var i in osme.regions) {
                var geometry = regions.getGeometry(i, osme);
                var region = new ymaps.GeoObject({
                    geometry: {
                        type: 'Polygon',
                        fillRule: 'nonZero',
                        coordinates: geometry.coordinates
                    },
                    properties: {
                        hintContent: osme.regions[i].name,
                        regionInfo: osme.regions[i]
                    }
                });
                collection.add(region);
            }
            callback(collection);
        });
    }
};