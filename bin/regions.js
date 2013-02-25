var regions = {

	/**
	 * Устанавливает связь модуля регионов и ymaps API
	 * @param {Object} yandexapi
	 */
	assignApi: function (yandexapi) {
		this.ymaps = yandexapi;
	},

	/**
	 * Загружает файл данных
	 * @param {String} file Имя файла.
	 * @param {String} path Путь до файла.
	 * @param {Function} callback Функция обработчик.
	 */
	load: function (file, path, callback) {
		this.ymaps.load(['util.coordinates.decode', 'util.script'], function () {
			this.coordinateDecode = this.ymaps.util.coordinates.decode;

			var callbackName = '__osme__callback_' + file;
			window[callbackName] = function (data) {
				callback(data);
				setTimeout(function () {
					script.parentNode.removeChild(script);
					delete window[callbackName];
				}, 1);
			}
			var script = this.ymaps.util.script.create(path + file);
		}, this);
	},

	/**
	 * @ignore
	 * Декодирование данных пути
	 * @param way
	 * @param wayId
	 * @param osmeData
	 * @return {*}
	 */
	decodeWay: function (way, wayId, osmeData) {
		if (osmeData.wayCache[wayId]) {
			return osmeData.wayCache[wayId];
		}
		osmeData.wayCache[wayId] = this.coordinateDecode(way);
		return osmeData.wayCache[wayId];
	},

	/**
	 *
	 * @param {Number} regionId Номер региона
	 * @param osmeData Данные
	 * @return {Object} данные геометрии
	 */
	getGeometry: function (regionId, osmeData) {
		var coordinates = [],
			meta = [],
			paths = osmeData.paths[regionId],
			osmeWays = osmeData.ways;

		osmeData.wayCache = osmeData.wayCache || {};

		if (!paths) {
			return false;
		}
		for (var pathId = 0, pathLength = paths.length; pathId < pathLength; ++pathId) {
			var path = paths[pathId];
			var pathCoordinates = [],
				ways = [];
			if (typeof path == 'number') {
				path = [path];
			}
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

		var getSquare = function (countor,check) {
			//расчет площади методом трапеций
			var ret = 0;
			var lastPoint = countor[countor.length - 1];

			var equals = function (v1, v2) {
				var e = 1e-8;
				return Math.abs(v1[0] - v2[0]) < e && Math.abs(v1[1] - v2[1]) < e;
			};

			if (check && !equals(countor[0], lastPoint)) {
				countor.push(countor[0]);
			}
			for (var i = 0, l = countor.length - 1; i < l; ++i) {
				ret += (countor[i][0] - countor[i + 1][0]) * (countor[i][1] + countor[i + 1][1]) / 2;
			}
			return ret;
		}

		for (var i in coordinates) {
			var sq1=getSquare(coordinates[i]);
			console.log(regionId, i, coordinates[i].length,sq1);

		}


		return {
			type: 'Polygon',
			fillRule: 'nonZero',
			coordinates: coordinates,
			ways: meta
		}
	}
};

