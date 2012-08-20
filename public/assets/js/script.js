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
			totalCommits = this.commits.find('.commit').length,
			that = this;

		console.log(this.commits);

		$.each(commits, function (i, commit) {
			setTimeout(function () {
				that.commits.prepend(commit);
			}, (50 * i) );
		});

		console.log(totalCommits);
		this.commitCount.html(totalCommits);

	};


}(App));

$(function () {

	App.commits = $('#commits');
	App.commitCount = $('#commit-count');

});