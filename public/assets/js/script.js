(function (App) {

	App = App || {};

	App.socket.on('server msg', function (data) {
		console.info(data.msg);
	});

	App.socket.on('all changesets', function (data) {
		App.showCommits(data.results.commits);
	});

	App.socket.on('debug', function (data) {
		console.dir(data);
	});


	App.showCommits = function (commits) {

		commits = commits || [];

		var numCommits = commits.length,
			that = this;

		$.each(commits, function (i, commit) {
			setTimeout(function () {
				that.commits.append(commit);
			}, (50 * i) );
		});

	};


}(App));

$(function () {

	App.commits = $('#commits');

});