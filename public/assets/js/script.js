(function (App) {

	App = App || {};


	//
	// SOCKET EVENTS
	//
	// =========================================
	//
	App.socket.on('server msg', function (data) {
		console.info(data.msg);
	});

	App.socket.on('all changesets', function (data) {
		App.showCommits(data.results.commits);
	});

	// Debugging
	App.socket.on('debug', function (data) {
		console.dir(data);
	});

	// Updating server stats
	App.socket.on('update stats', function (data) {

		var commitStats = this.commitStats || $('#stats'),
			results = data.results,

			connectedUsers = commitStats.find('[data-live="connected-users"]'),
			totalCommits = commitStats.find('[data-live="total-commits"]'),
			timeout = commitStats.find('[data-live="timeout"]'),

			repos = commitStats.find('[data-live="repos"]'),
			requests = commitStats.find('[data-live="repo-requests"]'),
			uptime = commitStats.find('[data-live="uptime"]');

		if (results.clients) {
			connectedUsers.fadeOut(200, function () {
				this.innerHTML = results.clients;
				connectedUsers.fadeIn(200);
			});
		}

		if (results.commits) {
			totalCommits.fadeOut(200, function () {
				this.innerHTML = results.commits;
				totalCommits.fadeIn(200);
			});
		}

		if (results.timeout) {
			timeout.fadeOut(200, function () {
				this.innerHTML = results.timeout;
				App.initCountdown(timeout.fadeIn(200));
			});
		}

		if (results.repos) {
			repos.fadeOut(200, function () {
				this.innerHTML = results.repos;
				repos.fadeIn(200);
			});
		}

		if (results.requests) {
			requests.fadeOut(200, function () {
				this.innerHTML = results.requests;
				requests.fadeIn(200);
			});
		}

		if (results.uptime) {
			uptime.fadeOut(200, function () {
				this.innerHTML = results.uptime;
				App.initCountup(uptime.fadeIn(200));
			});
		}

	});


	//
	// SHOW COMMITS ON SCREEN
	//
	// The function called after receiving a socket event
	// from the server with commits to display.
	// =========================================
	//
	App.showCommits = function (commits) {

		commits = commits || [];

		var numCommits = commits.length,
			totalCommits = this.commits.find('.commit').length,
			that = this;

		$.each(commits, function (i, commit) {
			that.commits.prepend(commit);
		});

	};


	App.initCountdown = function (el) {

		if (this._cdTimeout) clearInterval(this._cdTimeout);
		var int = parseInt(el.html(), 10);
		this._cdTimeout = setInterval(function () {
			el.html(--int);
		}, 1000);

	};

	App.initCountup = function (el) {

		if (this._cuTimeout) clearInterval(this._cuTimeout);
		var int = parseInt(el.html(), 10);
		this._cuTimeout = setInterval(function () {
			el.html(++int);
		}, 1000);

	};


}(App));

$(function () {

	App.commits = $('#commits');
	App.commitStats = $('#stats');

	App.commits.on('click', '[data-action="toggle-details"]', function (evt) {
		evt.preventDefault();
		var details =  $(this).parents('[data-node]').find('[data-result="toggle-details"]');
		details.toggleClass('hidden');
	});




});
