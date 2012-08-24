var	https = require('https'),
	http = require('http'),
	express = require('express'),
	fs = require('fs'),
	handlebars = require('handlebars'),
	crypto = require('crypto'),


	// My modules
	config = require('./config.js'),
	Client = require('./models/client.js'),


	server = express(),
	socketServer = http.createServer(server),
	io = require('socket.io').listen(socketServer),

	md5sum = crypto.createHash('md5'),



	App = {

		//
		// SETTINGS AND CONFIGS
		//
		// =========================================
		//
		_loop: false, // enabel to continuously poll the repositories
		// TODO: These should both be logged at some stage
		totalTimeoutRequests: 0, // how many times the timeout-loop has been called
		totalRepoRequests: 0, // how many times we have called an individual repo
		commits: [],
		clients: {},
		clientCount: 0,


		init: function () {
			this._createTimer();
		},


		//
		// CREATING CLIENT CONNECTIONS
		//
		// Push the connected client to the stack.
		// Each one should have it's own socket with which to connect to.
		// =========================================
		//
		createClient: function (client) {
			this.clients[client.socket.id] = client;
			this.clientCount++;
			console.log('\n-- The connected clients are: ' + this.clientCount + '\n');
			this.checkForCommits(client);
		},


		//
		// DESTROYING CLIENT CONNECTIONS
		//
		// Takes an ID and removes the client from the stack.
		// =========================================
		//
		destroyClient: function (id) {
			if (this.clients[id]) delete this.clients[id];
			this.clientCount--;
			console.log('\n-- The connected clients are: ' + this.clientCount + '\n');
		},


		//
		// CHECKING FOR COMMITS
		//
		// =========================================
		//
		checkForCommits: function (client) {

			if (this.commits.length) this.sendCommitsToClient(client);

		},


		//
		// SENDING COMMITS TO CLIENT
		//
		// =========================================
		//
		sendCommitsToClient: function (client) {

			this.renderTemplate('partials/commit.tmpl', this.commits, client);

		},


		//
		// RENDERING TEMPLATES
		//
		// Takes a template file and a data object
		// =========================================
		//
		renderTemplate: function (tmpl, data, client) {

			var source = this.loadTemplate(tmpl); // loads template
				template = handlebars.compile(source), // compiles with data
				commits = [],
				numCommits = data.length,
				i = 0;

			// Renders a new html element for each changeset
			// and pushed to the stack.
			for ( i; i < numCommits; i++ ) {
				commits.push(
					template(data[i])
				);
			}

			this.sendCommits({ commits: commits.reverse() }, client);

		},


		//
		// RUNTIME TEMPLATE LOADING
		//
		// Will read any template file when requested.
		// =========================================
		//
		loadTemplate: function (templateFile) {

			var source = fs.readFileSync('./view/'+ templateFile, 'utf8', function (err, html) {
				if (err) throw err;
				return html;
			});

			return source;

		},


		//
		// GETTING ALL COMMITS
		//
		// Returns all the rendered commits in the stack.
		// =========================================
		//
		getAll: function () {

			// console.log(this.commits);

		},

		//
		// SENDING COMMITS THROUGH CLIENT SOCKET
		//
		// Emits events to the specified client.
		// =========================================
		//
		sendCommits: function (data, client) {
			client.socket.emit('all changesets', { results: data });
		},


		//
		// FETCHING COMMITS FROM REPOS
		//
		// This function fetches from the remote source
		// and usually from a timeout function.
		// =========================================
		//
		fetch: function (args) {

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
						that.stackCommits(jsonString, repo);
					});

			}).end();

		},


		//
		// PUSHING NEW COMMITS TO THE STACK
		//
		// This funtion parses the requested data and
		// pushes any commits to the app stack
		// =========================================
		//
		stackCommits: function (jsonString, repo) {
			var data = JSON.parse(jsonString),
				commits = data.changesets,
				that = this;

			commits.forEach(function (r, i) {
				r._key = repo;
				that.commits.push(r);
			});

		},


		_timerFetch: function () {

			var totalRepos = config.repos.length,
				i = 0;

			this.totalTimeoutRequests++;
			console.log('\n-- Total timeout requests: ' + this.totalTimeoutRequests + '\n');

			for (i; i < totalRepos; i++) {
				console.log('getting: ' + config.repos[i]);
				this.totalRepoRequests++;
				App.fetch({
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

	var source = App.loadTemplate('layout.tmpl'),
		template = handlebars.compile(source),
		view = template({
			stylesheets: [
				{ href: 'assets/css/reset.css' },
				{ href: 'assets/css/core.css' }
			],
			debug: debug
		});

	App.getAll();

	res.send(view);


});

io.sockets.on('connection', function (socket) {
	socket.emit('server msg', { msg: 'Socket open' });

	App.createClient(new Client({ socket: socket}));

	// So we can remove the client from the server conection stack
	socket.on('disconnect', function () {
		App.destroyClient(socket.id);
	});

});

App.init();
