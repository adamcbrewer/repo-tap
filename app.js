var	https = require('https'),
	http = require('http'),
	config = require('./config.js'),
	express = require('express'),
	io = require('socket.io'),



	server = express(),
	socketServer = http.createServer(server),
	io = io.listen(socketServer),


	// Our application settings and configs
	app = {

		// options for our HTTP request object
		opts: {
			host: 'api.bitbucket.org',
			port: 443,
			method: 'GET',
			path: '/1.0/repositories/adamcbrewer/tool-miner/changesets?limit=2',
			auth: config.auth,
			headers: {
				'content-type': 'application/json'
			}
		},

		latestResults: null,

		init: function (res) {
			this.response = res;
		},

		output: function (json) {
			this.response.send(json);
		},

		getChangesets: function (res) {
			
			var that = this,
				changesets = null;

			https.request(this.opts, function(res) {

			// console.log('STATUS: ' + res.statusCode);
			// console.log('HEADERS: ' + JSON.stringify(res.headers));

				res.setEncoding('utf8');
				
				var json = '';
				res.on('data', function (chunk) {
						json += chunk;
					})
					.on('end', function () {
						that.latestResults = json;
						that.output(json);
					});

			}).end();

		}

	};





// This code sets up the HTML server where we want users to visit.
//
// When a user lands on this page, a new http request should be fired
// to retreive the account changeset.
server.listen(8888);

// Set up our routes
server.get('/', function (req, res) {

	// TODO: HTML templates
	app.init(res);
	app.getChangesets();

});


// io.sockets.on('connection', function (socket) {
// 	console.log('sockets!');
// 	socket.emit('news', { hello: 'world' });
// 	socket.on('my other event', function (data) {
// 		console.log(data);
// 	});
// });

