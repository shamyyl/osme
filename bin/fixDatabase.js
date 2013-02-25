var normalParents=[
[1162549,	176095], //Ленинградская обл, Всеволожский район
[179494,	51490] //Московская обл, Пушкинский район
];

var connection = require('./../lib/initConnection.js');
var lib = require('./../lib');
var async = require("async");
var database = require('./../lib/database.js');

var thread2 = async.thread(2,1);

async.thread(1,1).forEach(normalParents, function (pair, callback) {

	database.query("SELECT id,level FROM regions as r INNER JOIN regionParents as rp ON rp.parent=r.id WHERE rp.region=?",
		[pair[1]],function(perr,otherParents){
			database.query("DELETE FROM regionParents WHERE region=?",[pair[0]],function(){
			   database.query("SELECT level FROM regions WHERE id IN ("+pair.join(',')+") ORDER BY level DESC",[],function(lerr,levels){
				  var myLevel=levels[0].level;
				  var parentLevel=levels[1].level;
				  var parents=[{
					  region:pair[0],
					  parent:pair[1],
					  deltaLevel:parentLevel-myLevel,
					  stage:40
				  }];
				  for(var i in otherParents){
					  parents.push({
						  region:pair[0],
						  parent:otherParents[i].id,
						  deltaLevel:otherParents[i].level-myLevel,
						  stage: 40
					  });
				  }
				   console.log(parents);
				   thread2.forEach(parents,function(fset,callback){
					   database.query("INSERT INTO regionParents SET ?",fset,callback);
				   },callback);
			   });
			});
		});
}, function () {
	console.log('done');
	connection.end();
});