var countor = 0;

(function () {

    function equals (v1, v2) {
        var e = 0.0001;//точность вычислений не велика
        //в OSM есть нестыковки
        var tx = Math.abs(v1[0] - v2[0]) < e;
        var ty = Math.abs(v1[1] - v2[1]) < e;
        if (tx) {
            if (ty) {
                return true;
            }
            else {
                ty = 360 - Math.abs(v1[1] - v2[1]) < e;
                return ty;
            }
        }
        else return false;
    }

    function test (a, b) {
        var alast = a[a.length - 1];
        if (equals(alast, b[0])) {
            return 1;
        }
        if (equals(alast, b[b.length - 1])) {
            return -1;
        }
        return 0;
    }

    function getSquare (countor) {
        if (!equals(countor[countor.length - 1], countor[0])) {
            countor.push(countor[0]);
        }
        //расчет площади методом трапеций
        var ret = 0;
        for (var i = 0, l = countor.length - 1; i < l; ++i) {
            ret += (countor[i][0] - countor[i + 1][0]) * (countor[i][1] + countor[i + 1][1]) / 2;
        }
        return ret;
    }

    function revertsWay (ways) {
        for (var i = 0, l = ways.length; i < l; ++i) {
            ways[i] *= -1;
        }
    }

    function build (region, ways) {
        var outer = region.outer,
            skipset = [0];

        var resultSlices = [],
            iterations = 0,
            passes = 0,
            metaways = [],
            wayshash = {};


        //сортируем по длине сегмента
        outer.sort(function (a, b) {
            return ways[b].nodes.length - ways[a].nodes.length;
        });
        for (var i = outer.length - 1; i > 0; --i) {
            if (ways[outer[i]].nodes.length) {
                break;
            }
        }
        outer.length = i + 1;

        while (passes != outer.length) {
            var slices = 0,
                metaslices = [];
            for (var i = 0, l = outer.length; i < l; i++) {
                if (!skipset[i]) {
                    slices = ways[outer[i]].nodes.slice(0);
                    metaslices.push(outer[i]);
                    skipset[i] = 1;
                    break;
                }
            }
            if (!slices) {
                break;
            }
            while (1) {
                var hit = false;
                iterations++;
                for (var i = 0, l = outer.length; i < l; i++) {
                    if (!skipset[i]) {
                        var way = ways[outer[i]].nodes,
                            result;
                        if (result = test(slices, way)) {
                            way = way.slice(0);
                            //console.log('+', i, "(", outer[i], ") as ", result);
                            if (result == -1) {
                                way.reverse();
                            }
                            metaslices.push(outer[i] * result);
                            //удаляем последний элемент
                            slices.length = slices.length - 1;
                            hit = true;
                            slices.push.apply(slices, way);
                            skipset[i] = 1;
                            passes++;
                        }
                    }
                }
                if (!hit) {
                    break;
                }
            }
            resultSlices.push(slices);
            if (getSquare(slices) < 0) {
                revertsWay(metaslices);
            }
            metaways.push.apply(metaways, metaslices);
            metaways.push('break');
        }

        for (var i = 1, l = metaways.length; i < l; i++) {
            if (metaways[i] != 'break') {
                wayshash[metaways[i]] = 1;
            }
        }

        return {
            ways: metaways,
            hash: wayshash,
            coordinates: resultSlices
        };
    }

    countor = {
        build: build
    };

})();