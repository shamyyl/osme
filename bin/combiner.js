var combiner = 0;

(function () {

    function equals (v1, v2) {
        var e = 1e-8;
        return Math.abs(v1[0] - v2[0]) < e && Math.abs(v1[1] - v2[1]) < e;
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

    function build (region, ways) {
        var outer = region.outer,
            skipset = [0];

        var resultSlices = [],
            iterations = 0,
            passes = 0;
        while (passes != outer.length) {
            var slices = 0;
            for (var i = 1, l = outer.length; i < l; i++) {
                if (!skipset[i]) {
                    slices = ways[outer[i]].nodes.slice(0);
                }
            }
            if (!slices) {
                break;
            }
            while (1) {
                var hit = false;
                iterations++;
                for (var i = 1, l = outer.length; i < l; i++) {
                    if (!skipset[i]) {
                        var way = ways[outer[i]].nodes,
                            result;
                        if (result = test(slices, way)) {
                            way = way.slice(0);
                            //console.log('+', i, "(", outer[i], ") as ", result);
                            if (result == -1) {
                                way.reverse();
                            }
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
            //slices.push(slices[0]);
            resultSlices.push(slices);
        }
        console.log('result in ', resultSlices.length, ' blocks, ', iterations, " iterations for ", outer.length, '/', passes, ' ways');
        return resultSlices;
    }

    combiner = {
        build: build
    };

})();