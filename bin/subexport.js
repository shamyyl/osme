var kladr_to_osme = [
	[770000000000, 102269],
	[780000000000, 337422],
	[10000000000, 253256],
	[40000000000, 145194],
	[220000000000, 144764],
	[280000000000, 147166],
	[290000000000, 140337],
	[300000000000, 112819],
	[20000000000, 77677],
	[310000000000, 83184],
	[320000000000, 81997],
	[30000000000, 145729],
	[330000000000, 72197],
	[340000000000, 77665],
	[350000000000, 115106],
	[360000000000, 72181],
	[50000000000, 109876],
	[790000000000, 147167],
	[750000000000, 145730],
	[370000000000, 85617],
	[60000000000, 253252],
	[380000000000, 145454],
	[70000000000, 109879],
	[390000000000, 103906],
	[80000000000, 108083],
	[400000000000, 81995],
	[410000000000, 151233],
	[90000000000, 109878],
	[100000000000, 393980],
	[420000000000, 144763],
	[430000000000, 115100],
	[110000000000, 115136],
	[440000000000, 85963],
	[230000000000, 108082],
	[240000000000, 190090],
	[450000000000, 140290],
	[460000000000, 72223],
	[470000000000, 176095],
	[480000000000, 72169],
	[490000000000, 151228],
	[120000000000, 115114],
	[130000000000, 72196],
	[500000000000, 51490],
	[510000000000, 2099216],
	[830000000000, 274048],
	[520000000000, 72195],
	[530000000000, 89331],
	[540000000000, 140294],
	[550000000000, 140292],
	[560000000000, 77669],
	[570000000000, 72224],
	[580000000000, 72182],
	[590000000000, 115135],
	[250000000000, 151225],
	[600000000000, 155262],
	[610000000000, 85606],
	[620000000000, 71950],
	[630000000000, 72194],
	[640000000000, 72193],
	[140000000000, 151234],
	[650000000000, 394235],
	[660000000000, 79379],
	[150000000000, 110032],
	[670000000000, 81996],
	[260000000000, 108081],
	[680000000000, 72180],
	[160000000000, 79374],
	[690000000000, 2095259],
	[700000000000, 140295],
	[710000000000, 81993],
	[170000000000, 145195],
	[720000000000, 140291],
	[180000000000, 115134],
	[730000000000, 72192],
	[270000000000, 151223],
	[190000000000, 190911],
	[860000000000, 140296],
	[740000000000, 77687],
	[200000000000, 109877],
	[210000000000, 80513],
	[870000000000, 151231],
	[890000000000, 191706],
	[760000000000, 81994]
];

var connection = require('./../lib/initConnection.js');
var lib = require('./../lib');
var async = require("async")


async.thread(1, 2).forEach(kladr_to_osme, function (pair, callback) {
	var kdregion = pair[0];
	var code = pair[1];
	var OUTPUTFILE = 'kd.' + kdregion + '.500.jsonp';
	console.log('save ', kdregion, 'as', code);
	lib.export({
		adminLevel: '4,5,6',
		country: [code],
		epsilon: 500,
		file: OUTPUTFILE,
		path: 'kd/',
		language: 'ru',
		withTags: false
	}, callback);
}, function () {
	console.log('done');
	connection.end();
});