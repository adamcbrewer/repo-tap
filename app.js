var	https = require('https'),
	config = require('./config.js'),
	
	// options for our HTTP request object
	opts = {
		host: 'api.bitbucket.org',
		port: 443,
		method: 'GET',
		path: '/1.0/repositories/adamcbrewer/tool-miner/changesets?limit=2',
		auth: config.auth,
		headers: {
			'content-type': 'application/json'
		}
	};

https.request(opts, function(res) {

	console.log('STATUS: ' + res.statusCode);
	console.log('HEADERS: ' + JSON.stringify(res.headers));

	res.setEncoding('utf8');
	
	var json = '';
	res.on('data', function (chunk) {
			json += chunk;
		})
		.on('end', function () {
			console.log(json);
		});

}).end();