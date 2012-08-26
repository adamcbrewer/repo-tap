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

		var commitStats = this.commitStats || $('#commit-stats'),
			results = data.results,
			connectedUsers = commitStats.find('[data-live="connected-users"]'),
			totalCommits = commitStats.find('[data-live="total-commits"]'),
			timeout = commitStats.find('[data-live="timeout"]');

		if (results.connectedClients) {
			connectedUsers.fadeOut(200, function () {
				this.innerHTML = results.connectedClients;
				connectedUsers.fadeIn(200);
			});
		}

		if (results.totalCommits) {
			totalCommits.fadeOut(200, function () {
				this.innerHTML = results.totalCommits;
				totalCommits.fadeIn(200);
			});
		}

		if (results.timeout) {
			timeout.fadeOut(200, function () {
				this.innerHTML = results.timeout;
				timeout.fadeIn(200);
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


}(App));

$(function () {

	App.commits = $('#commits');
	App.commitStats = $('#commit-stats');

	App.commits.on('click', '[data-action="toggle-details"]', function (evt) {
		evt.preventDefault();
		var details =  $(this).parents('[data-node]').find('[data-result="toggle-details"]');
		details.toggleClass('hidden');
	});




});
