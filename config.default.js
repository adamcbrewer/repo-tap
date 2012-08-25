/*
* config.js
*
* Hosts all the app config settings
*
**/
module.exports = {
	auth: 'username:password',

	// array of repositiories we want commit data from
	repos: [
		'username/repo'
	],

	// server config
	serverPort: 8888,
	basePath: 'http://localhost'
};
