var	https = require('https'),
	http = require('http'),
	express = require('express'),
	fs = require('fs'),
	handlebars = require('handlebars'),


	// My modules
	config = require('./config.js'),
	Client = require('./models/client.js'),

	server = express(),
	serverInstance = http.createServer(server),
	io = require('socket.io').listen(serverInstance),


	Server = {

		//
		// SETTINGS AND CONFIGS
		//
		// =========================================
		//
		_loop: true, // enabel to continuously poll the repositories
		_loopInterval: 1000 * 60, // 1 minute
		totalTimeoutRequests: 0, // how many times the timeout-loop has been called
		totalRepoRequests: 0, // how many times we have called an individual repo
		commits: [],
		clients: [],

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

			this.clients.push(client);
			console.log('\n-- The connected clients are: ' + this.clients.length + '\n');

			this.broadcastStats(
				{
					client: { clients: this.clients.length, commits: this.commits.length },
					all: { clients: this.clients.length }
				},
				client,
				true
			);

			this.checkForCommits(client);

		},


		//
		// DESTROYING CLIENT CONNECTIONS
		//
		// Takes an ID and removes the client from the stack.
		// =========================================
		//
		destroyClient: function (id) {
			var that = this;
			this.clients.forEach(function (client, i) {
				if (id === client._key) {
					that.clients.splice(i, 1);
					console.log('\n-- The connected clients are: ' + that.clients.length + '\n');

					// We still have access to the socket object,
					// which we only need for broadcasting to all other client sockets
					that.broadcastStats( { all: { clients: that.clients.length } }, client );

					return;
				} else {
					console.log('Couldn\'t find client with id: ' + id);
				}
			});

		},


		//
		// BROADCASTING STATS TO CLIENTS
		//
		// =========================================
		//
		broadcastStats: function (data, client, includeOrigin) {

			includeOrigin = includeOrigin || false;
			data = data || {};
			client = client || this.clients[0] || false;

			if (client) {
				// Send to the original client
				if (includeOrigin) {
					// We can send the default 'all' data to eveybody if we don't
					// specify anything specifically for the original client
					var dataClient = data.client || data.all;
					client.socket.emit('update stats', { results: dataClient });
				}

				// Send to everyone
				client.socket.broadcast.emit('update stats', { results: data.all });
			}

		},


		//
		// CHECKING FOR COMMITS
		//
		// =========================================
		//
		checkForCommits: function (client) {

			if (this.commits.length) this.render('partials/commit.tmpl', this.commits, client);

		},


		//
		// RENDERING TEMPLATES
		//
		// Takes a template file and a data object
		// =========================================
		//
		render: function (tmpl, data, client) {

			var source = this.loadTemplate(tmpl); // loads template
				template = handlebars.compile(source), // compiles with data
				commits = [],
				numCommits = data.length,
				i = 0,
				that = this;

			// Renders a new html element for each changeset
			// and pushed to the stack.
			for ( i; i < numCommits; i++ ) {
				commits.push(
					template(data[i])
				);
			}

			if (client) {
				this.sendCommitsToClient({ commits: commits.reverse() }, client);
			} else {
				this.clients.forEach(function (client, i) {
					that.sendCommitsToClient({ commits: commits.reverse() }, client);
				});
			}

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
		// SENDING COMMITS THROUGH CLIENT SOCKET
		//
		// Emits events to the specified client.
		// =========================================
		//
		sendCommitsToClient: function (data, client) {
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
				that = this,
				exists = null;

			commits.forEach(function (changeset, i) {
				exists = that.checkIfChangesetExists(changeset);
				if (exists === false) {
					changeset._key = repo;
					that.commits.push(changeset);

					that.broadcastStats( { all: { commits: that.commits.length } }, null, true );

					that.render('partials/commit.tmpl', [changeset]); // will push the new data to all clients
				}
			});

		},


		checkIfChangesetExists: function (changeset) {

			var exists = false;
			this.commits.forEach(function (c, i) {
				console.log('Checking changeset ' + c.node + ' against ' + changeset.node + ' || ' + c._key);
				if (c.node == changeset.node) {
					exists = true;
					console.log('Changeset "'+c.node+'" already exists for ' + c._key);
					return exists;
				}
			});
			return exists;

		},


		//
		// REPO FOREACH FETCH LOOP
		//
		// Loops through all the repos contained in the config file
		// and does a 'fetch' for each one.
		// =========================================
		//
		_timerFetch: function () {

			var totalRepos = config.repos.length,
				i = 0;

			this.totalTimeoutRequests++;
			console.log('\n-- Total timeout requests: ' + this.totalTimeoutRequests + '\n');

			for (i; i < totalRepos; i++) {
				console.log('getting: ' + config.repos[i]);
				this.totalRepoRequests++;
				this.fetch({
					repo: config.repos[i]
				});
			}
			this.broadcastStats( { all: { requests: this.totalRepoRequests } }, null, true);
			console.log('\n-- Total repository requests: ' + this.totalRepoRequests + '\n');
		},


		//
		// TIMER LOOP
		//
		// Initializes the interval in which we recurse all the repos
		// for their latest commits.
		// =========================================
		//
		_createTimer: function () {

			var delay = this._loopInterval,
				that = this;

			console.log('LOG: Fetching first set of results');
			this._timerFetch();


			if (this._loop) {
				setInterval(function () {
					that._timerFetch.call(that);
					that.broadcastStats({ all: { timeout: that._loopInterval/1000, repos: config.repos.length } }, null, true);
				}, delay);
			}

		}

	};





// This code sets up the HTML server where we want users to visit.
//
// When a user lands on this page, a new http request should be fired
// to retreive the account changeset.
serverInstance.listen(config.serverPort);


// Sevring up the assets directory
var publicDir = __dirname + '/public',
	assetsDir = publicDir + '/assets';

server.use('/assets', express.static( assetsDir ));


// Set up our routes
server.get('/*', function (req, res) {

	var debug = false;


	// debug = JSON.stringify(req.query);

	var source = Server.loadTemplate('layout.tmpl'),
		template = handlebars.compile(source),
		view = template({
			basePath: config.basePath,
			repos: config.repos.length,
			requests: Server.totalRepoRequests || '-',
			debug: debug
		});

	res.send(view);


});


//
// SOCKET IO SETUP
//
io.sockets.on('connection', function (socket) {
	socket.emit('server msg', { msg: 'Socket open' });

	// Adding a client to the connected stack
	Server.createClient(new Client({ socket: socket}));

	// Remove the client from the server conection stack
	socket.on('disconnect', function () {
		Server.destroyClient(socket.id);
	});

});


Server.init();
