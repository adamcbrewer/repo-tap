(function (App) {

	App = App || {};

	App.socket.on('server msg', function (data) {
		console.info(data.msg);
	});

	App.socket.on('all changesets', function (data) {
		App.writeData(data.results);
	});


	App.writeData = function (data) {
		this.commits.append(data);
	};


}(App));

$(function () {

	App.commits = $('#commits');

});