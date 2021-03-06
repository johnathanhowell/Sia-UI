'use strict';

// loadingScreen.js: display a loading screen until communication with Siad has been established.
// if an available daemon is not running on the host,
// launch an instance of siad using config.js.

const remote = require('electron').remote;
const dialog = remote.dialog;
const fs = remote.require('fs');
const Path = require('path');
const IPC = require('electron').ipcRenderer;
const Siad = require('sia.js');
const config = IPC.sendSync('config', 'siad');
Siad.configure(config);

const overlay = document.getElementsByClassName('overlay')[0];
const overlayText = overlay.getElementsByClassName('centered')[0].getElementsByTagName('p')[0];
overlayText.textContent = 'Loading Sia...';

const showError = (error) => {
	overlayText.textContent = 'A Sia-UI error has occured: ' + error;
};

// checkSiaPath validates config's Sia path.
// returns a promise that is resolved if the path is a valid directory
const checkSiaPath = () => new Promise((resolve, reject) => {
	fs.stat(config.path, (err, stats) => {
		if (!err) {
			resolve();
		} else {
			reject();
		}
	});
});
// startUI starts a Sia UI instance using the given welcome message.
// calls initUI() after displaying a welcome message.
const startUI = (welcomeMsg, initUI) => {
	// Display a welcome message, then initialize the ui
	overlayText.innerHTML = welcomeMsg;
	initUI();
	overlay.style.display = 'none';
};

// startSiad configures and starts a Siad instance.
// callback is called on successful start.
const startSiad = (callback) => {
	config.detached = false;
	IPC.sendSync('config', 'siad', config);
	Siad.configure(config, (error) => {
		if (error) {
			console.error(error);
			overlay.showError(error);
		} else {
			Siad.start(callback);
		}
	});
};

// Check if Siad is already running on this host.
// If it is, start the UI and display a welcome message to the user.
// Otherwise, start a new instance of Siad using config.js.
module.exports = function(initUI) {
	// Create the Sia data directory if it does not exist
	try {
		fs.statSync(config.datadir);
	} catch (e) {
		fs.mkdirSync(config.datadir);
	}

	checkSiaPath().then(() => {
		Siad.ifRunning(() => {
			config.detached = true;
			IPC.sendSync('config', 'siad', config);
			Siad.configure(config);
			startUI('Welcome back', initUI);
		}, () => {
			startSiad((error) => {
				if (error) {
					showError(error);
				} else {
					startUI('Welcome to Sia', initUI);
				}
			});
		});
	}).catch(() => {
		// config.path doesn't exist.  Prompt the user for siad's location
		dialog.showErrorBox('Siad not found', 'Sia-UI couldn\'t locate siad.  Please navigate to siad.');
		const siadPath = dialog.showOpenDialog({
			title: 'Please locate siad.',
			properties: ['openFile'],
			defaultPath: Path.join('..', config.path),
			filters: [{ name: 'siad', extensions: ['*'] }],
		});
		config.path = siadPath[0];
		startSiad((error) => {
			if (error) {
				showError(error);
			} else {
				startUI('Welcome to Sia', initUI);
			}
		});
	});
};
