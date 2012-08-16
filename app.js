var	https = require('https'),
	http = require('http'),
	config = require('./config.js'),
	express = require('express'),
	fs = require('fs'),
	handlebars = require('handlebars'),



	server = express(),
	socketServer = http.createServer(server),
	io = require('socket.io').listen(socketServer),


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

		init: function (socket) {
			this.socket = socket;
		},

		output: function (socketEvent, json) {
			
			this.socket.emit(socketEvent, { results: json });

		},

		getChangesets: function () {
			
			var that = this,
				changesets = null;

			https.request(this.opts, function(res) {

			// console.log('STATUS: ' + res.statusCode);
			// console.log('HEADERS: ' + JSON.stringify(res.headers));

				res.setEncoding('utf8');
				
				var jsonString = '',
					json = {};
				res.on('data', function (chunk) {
						jsonString += chunk;
					})
					.on('end', function () {
						json = JSON.parse(jsonString);
						that.latestResults = json;
						that.output('all changesets', json);
					});

			}).end();

		},

		render: function (template, data) {

			return template(data);

		},

		loadTemplate: function (templateFile) {

			
			var source = fs.readFileSync('./view/'+ templateFile, 'utf8', function (err, html) {
				if (err) throw err;
				return html;
			});

			return source;

		}

	};





// This code sets up the HTML server where we want users to visit.
//
// When a user lands on this page, a new http request should be fired
// to retreive the account changeset.
server.listen(8888);
socketServer.listen(8887);


// Sevring up the assets directory
var publicDir = __dirname + '/public',
	assetsDir = publicDir + '/assets';

server.use('/assets', express.static( assetsDir ));
// server.use('/socket.io', express.static( __dirname + '/node_modules/socket.io/lib' ));


// Set up our routes
server.get('/', function (req, res) {

	var debug = false;


	// debug = JSON.stringify(req.query);

	var source = app.loadTemplate('layout.tmpl'),
		template = handlebars.compile(source),
		view = template({
			copy: 's;kdflkjlkj',
			stylesheets: [
				{ href: 'assets/css/reset.css' },
				{ href: 'assets/css/core.css' }
			],
			scripts: [
				{ href: '' }
			],
			debug: debug
		});


	res.send(view);

});

io.sockets.on('connection', function (socket) {
	socket.emit('server msg', { msg: 'Socket open' });

	app.init(socket);
	app.getChangesets();

});