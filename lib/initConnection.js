var connection = require("./database.js");

function init () {
	connection.init({
		host: 'localhost',
		user: 'root',
		password: '',
		connectionCount: 10,

		database: 'osme'
	});
}

exports.init = init;

exports.end = function () {
	connection.close();
}

init();