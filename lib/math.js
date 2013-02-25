exports.pointInPolygon = function (point, path, nonzero) {
    var intersections = 0,
        i = 0,
        l = path.length;
    // Проверим совпадает ли точка с одной из вершин.
    for (; i < l; i++) {
        if (path[i][0] == point[0] && path[i][1] == point[1]) {
            return 1;
        }
    }

    // Проверяем находится ли точка внутри полигона или на его границе.
    var prev = path[l - 1];
    for (i = 0; i < l; i++) {
        var next = path[i];
        // Check if point is on an horizontal polygon boundary
        if (prev[1] == next[1] && prev[1] == point[1] && point[0] > Math.min(prev[0], next[0]) && point[0] < Math.max(prev[0], next[0])) {
            return 1;
        }
        if (point[1] > Math.min(prev[1], next[1]) && point[1] <= Math.max(prev[1], next[1]) && point[0] <= Math.max(prev[0], next[0]) && prev[1] != next[1]) {
            var xinters = (point[1] - prev[1]) * (next[0] - prev[0]) / (next[1] - prev[1]) + prev[0];
            // Check if point is on the polygon boundary (other than horizontal)
            if (xinters == point[0]) {
                return 1;
            }
            if (prev[0] == next[0] || point[0] <= xinters) {
                if (nonzero) {
                    intersections += (next[1] - prev[1]) < 0 ? -1 : 1;
                } else {
                    intersections += intersections ? -1 : 1;
                }
            }
        }
        prev = next;
    }
    return intersections;
}

exports.findClosestPathPosition = function (path, anchorPosition) {
    if (!path.length) {
        return null;
    }

    var from = path[0],
        minLength = getVectorLength2([
            anchorPosition[0] - from[0],
            anchorPosition[1] - from[1]
        ]),
        result = {
            position:from,
            closestPointIndex:0,
            distance:minLength
        };

    for (var i = 1, l = path.length, to; i < l; i++) {
        to = path[i];
        // Если точки эквивалентны, то alfa получится NaN.
        if (from[0] == to[0] && from[1] == to[1]) {
            continue;
        }

        var avec = [to[0] - from[0], to[1] - from[1]],
            bvec = [anchorPosition[0] - from[0], anchorPosition[1] - from[1]],
        // alfa здесь - отношение проекции вектора bvec на вектор avec к длине вектора avec
            alfa = (avec[0] * bvec[0] + avec[1] * bvec[1]) / (avec[0] * avec[0] + avec[1] * avec[1]),
            newResult;

        if (alfa < 0) {
            newResult = {
                position:from,
                vector:[from[0] - anchorPosition[0], from[1] - anchorPosition[1]],
                closestPointIndex:i - 1
            };
        } else if (alfa > 1) {
            newResult = {
                position:to,
                vector:[to[0] - anchorPosition[0], to[1] - anchorPosition[1]],
                closestPointIndex:i
            };
        } else {
            var cvec = [avec[0] * alfa - bvec[0], avec[1] * alfa - bvec[1]];

            newResult = {
                vector:cvec,
                prevPointIndex:i - 1,
                nextPointIndex:i
            };
        }

        //расчет квадратного растояния
        newResult.distance = newResult.vector[0] * newResult.vector[0] + newResult.vector[1] * newResult.vector[1];
        if (newResult.distance < minLength) {
            minLength = newResult.distance;
            result = newResult;
        }
        from = to;
    }

    //для промежуточных значений часть математики идет отложенно
    //встречается часто, а весит много
    if (result.nextPointIndex) {
        cvec = result.vector;
        from = path[result.prevPointIndex];
        to = path[result.nextPointIndex];
        var position = [anchorPosition[0] + cvec[0], anchorPosition[1] + cvec[1]],
            fromvec = [position[0] - from[0], position[1] - from[1]],
            tovec = [position[0] - to[0], position[1] - to[1]];
        result.position = position;
        result.closestPointIndex = getVectorLength2(fromvec) < getVectorLength2(tovec) ? result.prevPointIndex : result.nextPointIndex;
    } else {
        result.prevPointIndex = result.closestPointIndex;
        result.nextPointIndex = result.closestPointIndex + 1;
        if (result.nextPointIndex >= path.length) {
            result.prevPointIndex = result.closestPointIndex - 1;
            result.nextPointIndex = result.closestPointIndex;
        }
    }

    //так как расчеты производись без корня квадратного
    result.distance = Math.sqrt(result.distance);
    return result;
}

// длина вектора без квадратного корня
function getVectorLength2(vector) {
    return vector[0] * vector[0] + vector[1] * vector[1];
}

function equals(v1, v2) {
	var e = 1e-8;
	return Math.abs(v1[0] - v2[0]) < e && Math.abs(v1[1] - v2[1]) < e;
};

function getShortestPath(countor) {
    var halfWorld = 180;
    var result = [countor[0]], point = countor[0];
    for (var i = 1, l = countor.length; i < l; ++i) {
        var delta = point[1] - countor[i][1];
        if (Math.abs(delta) > halfWorld) {
            if (delta < 0)delta = -360;
            else delta = 360;
        } else {
            delta = 0;
        }

        var nextPoint = [countor[i][0], countor[i][1] + delta]
        result.push(nextPoint);
        point = nextPoint;
    }


	//Для вычисления площади требуется замкнутость контура
	if (!equals(result[0], result[result.length-1])) {
		result.push(result[0]);
	}
    return result;
}

exports.getShortestPath=getShortestPath;

exports.getBounds=function(coordinates){
	var min=[coordinates[0][0],coordinates[0][1]],
		max=[coordinates[0][0],coordinates[0][1]];
	for(var i= 0,l=coordinates.length;i<l;++i){
		min[0]=Math.min(min[0],coordinates[i][0]);
		min[1]=Math.min(min[1],coordinates[i][1]);
		max[0]=Math.max(max[0],coordinates[i][0]);
		max[1]=Math.max(max[1],coordinates[i][1]);
	}
	return [min,max];
}

exports.getSquare = function (countor) {
    //расчет площади методом трапеций
    countor = getShortestPath(countor);
    var ret = 0;
    for (var i = 0, l = countor.length - 1; i < l; ++i) {
        ret += (countor[i][0] - countor[i + 1][0]) * (countor[i][1] + countor[i + 1][1]) * 0.5;
	}
    return ret;
}