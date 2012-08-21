var	https = require('https'),
	http = require('http'),
	config = require('./config.js'),
	express = require('express'),
	fs = require('fs'),
	handlebars = require('handlebars'),
	crypto = require('crypto'),



	server = express(),
	socketServer = http.createServer(server),
	io = require('socket.io').listen(socketServer),

	md5sum = crypto.createHash('md5'),



	app = {

		//
		// Our application settings and configs
		//

		_loop: false,

		// TODO: These should both be logged at some stage
		totalTimeoutRequests: 0, // how many times the timeout-loop has been called
		totalRepoRequests: 0, // how many times we have called an individual repo

		results: {
			commits: null,
			count: 0 // total commits fetched since the server's been running
		},
		clients: {},
		clientCount: 0,

		init: function () {
			// this.socket = socket;

			this._createTimer();

		},


		// push the connected client to the stack.
		// each one should have it's own socket with which to connect to
		createClient: function (socket) {

			this.clients[socket.id] = socket;

			this.clientCount++;
			console.log('\n-- The connected clients are: ' + this.clientCount + '\n');

			this.checkForCommits(socket);

		},

		destroyClient: function (id) {
			if (this.clients[id]) delete this.clients[id];
			this.clientCount--;
			console.log('\n-- The connected clients are: ' + this.clientCount + '\n');
		},

		// Check the server for the stack of fetched commits
		checkForCommits: function (socket) {

			if (this.results.commits !== null) {

				// TODO:
				// this.sendCommitsToClient(socket);
			}
			

		},

		sendCommitsToClient: function (socket) {



		},

		_timerFetch: function () {
			
			var totalRepos = config.repos.length,
				i = 0;

			this.totalTimeoutRequests++;
			console.log('\n-- Total timeout requests: ' + this.totalTimeoutRequests + '\n');

			for (i; i < totalRepos; i++) {
				console.log('getting: ' + config.repos[i]);
				this.totalRepoRequests++;
				app.getLatest({
					repo: config.repos[i]
				});
			}
			console.log('\n-- Total repository requests: ' + this.totalRepoRequests + '\n');
		},

		_createTimer: function () {

			var delay = 1000 * 10,
				that = this;

			console.log('LOG: Fetching first set of results');
			this._timerFetch();
			

			if (this._loop) {
				setInterval(function () {
					that._timerFetch.call(that);
				}, delay);
			}

		},

		getLatest: function (args) {

			args = args || {};

			var that = this,
				repo = args.repo;

				// options for our HTTP request object
				opts = {
					host: 'api.bitbucket.org',
					port: 443,
					method: 'GET',
					path: '/1.0/repositories/' + args.repo + '/changesets?limit=' + 1,
					auth: config.auth,
					headers: {
						'content-type': 'application/json'
					}
				};

			https.request(opts, function(res) {

				// console.log('STATUS: ' + res.statusCode);
				// console.log('HEADERS: ' + JSON.stringify(res.headers));

				res.setEncoding('utf8');
				
				var jsonString = '',
					json = {};
				res.on('data', function (chunk) {
						jsonString += chunk;
					})
					.on('end', function () {
						that.processResults(jsonString, repo);
					});

			}).end();

		},

		// This function is the router/filter for what happens to data when
		// it return from the remote source
		processResults: function (jsonString, repo) {
			data = JSON.parse(jsonString);
			data.repo = repo || null;

			if (this.results.commits === null) this.results.commits = {}; 

			var commits = this.results.commits[repo];

			if (commits) console.log('Stored Node: ' + commits.node, 'Recent node: ' + data.changesets[0].node);
			
			if (commits && ( commits.node == data.changesets[0].node) ) {
				console.log('we already have the latest');
				// this.constructTemplate('partials/commit.tmpl', data);
			} else {
				// Store the latest commits we have just processed
				this.results.commits[data.repo] = data.changesets[0]; // because we only have one, we store the first
				this.constructTemplate('partials/commit.tmpl', data);
			}
		},

		constructTemplate: function (tmpl, data) {

			var source = this.loadTemplate(tmpl);
				template = handlebars.compile(source),
				commits = [],
				numCommits = data.changesets.length,
				i = 0;

			// Renders a new html element for each changeset
			// and pushed to the stack.
			for ( i; i < numCommits; i++ ) {
				data.changesets[i].repoName = data.repo;
				commits.push(
					template(data.changesets[i])
				);
			}

			this.output('all changesets', { commits: commits.reverse() });

		},

		// emits events to the client
		output: function (socketEvent, data) {
			// this.socket.emit(socketEvent, { results: data });
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
socketServer.listen(8080);


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
			debug: debug
		});


	res.send(view);

});

io.sockets.on('connection', function (socket) {
	socket.emit('server msg', { msg: 'Socket open' });

	app.createClient(socket);

	// So we can remove the client from the server conection stack
	socket.on('disconnect', function () {
		app.destroyClient(socket.id);
	});

});

app.init();