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
		bbOpts: {
			host: 'api.bitbucket.org',
			port: 443,
			method: 'GET',
			path: '/1.0/repositories/adamcbrewer/tool-miner/changesets',
			auth: config.auth,
			headers: {
				'content-type': 'application/json'
			}
		},

		latestResults: false,

		init: function (socket) {
			this.socket = socket;
		},

		// emits events to the client
		output: function (socketEvent, data) {
			this.socket.emit(socketEvent, { results: data });
		},

		getChangesets: function (limit) {
			
			limit = limit || 10;

			var that = this;

			if (this.latestResults) {

				that.constructTemplate('partials/commit.tmpl', this.latestResults);

			} else {
				this.bbOpts.path += '?limit=' + limit;

				https.request(this.bbOpts, function(res) {

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

							that.constructTemplate('partials/commit.tmpl', json);

						});

				}).end();
			}

		},

		constructTemplate: function (tmpl, data) {

			var source = this.loadTemplate(tmpl);
				template = handlebars.compile(source),
				commits = [],
				numCommits = data.changesets.length,
				i = 0;

			for ( i; i < numCommits; i++ ) {
				commits.push(
					template(data.changesets[i])
				);
			}

			this.output('all changesets', { commits: commits });

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
	app.getChangesets(null);

});