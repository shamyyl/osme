var epsilon = 0.0001;
var fullEqual = 0.0001;
var codingEqual = 0.000001;

var math=require("./math.js");

function dist (v1, v2) {
    var tx = v1[0] - v2[0],
        ty = v1[1] - v2[1];
    return Math.sqrt(tx * tx + ty * ty);
}

function equals (v1, v2, _epsilon, v) {
    var e = _epsilon || epsilon;
    // точность вычислений не велика
    // в OSM есть нестыковки
    var tx = Math.abs(v1[0] - v2[0]) < e;
    var ty = Math.abs(v1[1] - v2[1]) < e;
    if (tx) {
        if (ty) {
            return true;
        }
        else {
            ty = (360 - Math.abs(v1[1] - v2[1])) < e;
            return ty;
        }
    }
    else return false;
}

function selectBest (selected, slices, edgeType) {
    var best = 10,
        bestId = -1;
    console.log(selected.length, ' to select', edgeType);
    console.log(slices);
    for (var j in selected) {
        var dist = testDist(slices, selected[j][2]),
            d360 = 360 - Math.abs(dist[2]);
        if (d360 < 0.0001) {
            dist[2] = d360;
        }
        //selectedEnd.push([i, result1, way, wId]);
        var vectorDist = Math.sqrt(dist[1] * dist[1] + dist[2] * dist[2]);

        console.log('>', vectorDist, dist[0], selected[j][1], selected[j][3], '< ', selected[j][2].length);
        //console.log(selected[j][2]);
        if (vectorDist < best) {
            best = vectorDist;
            bestId = j;
        }

    }
    console.log('selected', selected[bestId][3], best)
    return [selected[bestId]];
}

function testDist (atest, b) {
    var blast = b[b.length - 1];
    if (equals(atest, b[0])) {
        return [1, atest[0] - b[0][0], atest[1] - b[0][1]]
    }
    if (equals(atest, blast)) {
        return [-1, atest[0] - blast[0], atest[1] - blast[1]]
    }
}

function test (atest, b) {
    var eq1 = equals(atest, b[0], fullEqual);
    var eq2 = equals(atest, b[b.length - 1], fullEqual);
    if (eq1 != eq2) {
        if (eq1)return 1;
        if (eq2)return -1;
    }
    if (!eq1 && !eq2) {
        return 0;
    }
    console.log('microWay');
    return 0;
}


function revertsWay (ways) {
    for (var i = 0, l = ways.length; i < l; ++i) {
        ways[i] *= -1;
    }
    ways.reverse();
}


function build (region, ways) {
    var outer = region.outer,
        skipset = [0];

    var resultSlices = [],
        passes = 0,
        metaways = [],
        metaslices = [],
        slices = 0;

    function pushCountor () {
        if (slices) {
            resultSlices.push(slices);
			for(var i in metaslices){
				if(Math.abs(metaslices[i])==126600351){
					console.log("!!! way as ",metaslices[i]);
				}
			}
            var square = math.getSquare(slices);
            if (square < 0) {
				console.log('CW (inv)',square,slices.length);
                revertsWay(metaslices);
            }else{
				console.log('CCW',square,slices.length)
			}
            metaways.push.apply(metaways, metaslices);
            metaways.push('break');
        }
        slices = 0;
        metaslices = [];
    }

    function getFreeWay () {
        for (var i = 0, l = outer.length; i < l; i++) {
            if (!skipset[i]) {
                slices = ways[outer[i]].nodes.slice(0);
                metaslices.push(outer[i]);
                skipset[i] = 1;
                break;
            }
        }
        return slices;
    }


    var lookup = {};
    var node = {};
    //pass 1
    //remove self closed
    for (var i = 0, l = outer.length; i < l; i++) {
        var wid = outer[i],
            way = ways[wid];
        if(way.nodes.length==0){
            console.log('bad way ',wid);
            skipset[i] = true;
        }
        if (way.firstNode == way.lastNode) {
            console.log('self closed ', wid);
            skipset[i] = true;
            slices = ways[outer[i]].nodes.slice(0);
            metaslices.push(outer[i]);
            pushCountor();
            passes++;
        } else {
            var nid = way.firstNode;
            lookup[nid] = lookup[nid] || [];
            lookup[nid].push(wid);

            var nid = way.lastNode;
            lookup[nid] = lookup[nid] || [];
            lookup[nid].push(wid);
        }
    }

    //pass 2
    //обьединения по номерам нод


    //console.log(lookup);
    for (var i = 0, l = outer.length; i < l; i++) {
        if (!skipset[i]) {
            var wid = outer[i],
                way = ways[wid];
            var pairs = lookup[way.firstNode];
            if (pairs && pairs.length == 2) {
                for (var j = 0, lj = pairs.length; j < lj; ++j) {

                }
            }
        }
    }


    while (1) {
        metaslices = [];
        slices = getFreeWay();

        if (!slices) {
            break;
        }

        while (1) {
            var hit = false;
            var selectedEnd = [];
            var selectedFirst = [];
            var lastPoint = slices[slices.length - 1];
            for (var i = 0, l = outer.length; i < l; i++) {
                if (!skipset[i]) {
                    var wId = outer[i],
                        way = ways[wId].nodes,
                        result;
                    var result1 = test(lastPoint, way);
                    var result2 = test(slices[0], way);

                    if (result1) {
                        selectedEnd.push([i, result1, way, wId]);
                    }
                    else if (result2) {
                        selectedFirst.push([i, -result2, way, wId]);
                    }
                }
            }
            if (selectedEnd.length > 1) {
                selectedEnd = selectBest(selectedEnd, lastPoint, 1);
            }
            if (selectedFirst.length > 1) {
                selectedFirst = selectBest(selectedFirst, slices[0], 2);
            }

            if (selectedEnd.length) {
                i = selectedEnd[0][0];
                result = selectedEnd[0][1];
                way = selectedEnd[0][2];
                way = way.slice(0);

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
            if (selectedFirst.length) {
                i = selectedFirst[0][0];
                result = selectedFirst[0][1];
                way = selectedFirst[0][2];
                way = way.slice(0);

                if (result == -1) {
                    way.reverse();
                }

                metaslices.unshift(outer[i] * result);
                //удаляем последний элемент
                way.length = way.length - 1;
                hit = true;
                slices.unshift.apply(slices, way);
                skipset[i] = 1;
                passes++;

            }

            if (equals(slices[0], slices[slices.length - 1], 0.0005)) {
                console.log('self closed line in', passes, slices.length, dist(slices[0], slices[slices.length - 1]));
                passes = 0;
                break;
            }


            if (!hit) {
                var wdist = dist(slices[0], slices[slices.length - 1]);
                console.log('break line in', passes, slices.length, wdist);
                passes = 0;
                if ( wdist > 0.05) {
                    console.error('drop way');
                    slices = 0;
                }
                break;
            }
        }
        pushCountor();
    }

    return {
        ways: metaways,
        coordinates: resultSlices
    };
}

exports.combine = build;