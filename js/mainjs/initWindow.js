'use strict';

// Electron main process libraries
const Electron = require('electron');
const Menu = Electron.Menu;
const BrowserWindow = Electron.BrowserWindow;
const GlobalShortcut = Electron.globalShortcut;
const appMenu = require('./appMenu.js');
// Node libraries
const Path = require('path');
const Siad = require('sia.js');
// Main process logic partitioned to other files
// Creates the window and loads index.html
module.exports = function(config) {
	// Create the browser
	var iconPath = Path.join(__dirname, '../..', 'assets', 'icon.png');
	var mainWindow = new BrowserWindow({
		icon:   iconPath,
		title:  'Sia-UI-beta',
	});
	// Set mainWindow's closeToTray flag from config.
	// This should be used in the renderer to cancel close() events using window.onbeforeunload
	mainWindow.closeToTray = config.closeToTray;

	// Add hotkey shortcut to view plugin devtools
	var shortcut;
	if (process.platform ==='darwin') {
		shortcut = 'Alt+Command+P';
	} else {
		shortcut = 'Ctrl+Shift+P';
	}

	GlobalShortcut.register(shortcut, function() {
		mainWindow.webContents.executeJavaScript('ui.plugins.current.toggleDevTools();');
	});

	// Load the window's size and position
	mainWindow.setBounds(config);

	// Emitted when the window is closing.
	mainWindow.on('close', function() {
		// Save the window's size and position
		var bounds = mainWindow.getBounds();
		for (var k in bounds) {
			if (bounds.hasOwnProperty(k)) {
				config[k] = bounds[k];
			}
		}
	});
	// Unregister all shortcuts when mainWindow is closed.
	// Stop Siad if it is not running detached.
	mainWindow.on('closed', function() {
		GlobalShortcut.unregisterAll();
		if (!config.siad.detached) {
			Siad.stop();
		}
	});

	// Load the index.html of the app.
	mainWindow.loadURL('file://' + __dirname + '/../../index.html');
	// Choose not to show the menubar
	if (process.platform !== 'darwin') {
		mainWindow.setMenuBarVisibility(false);
	} else {
		// Create the Application's main menu - OSX version might feel weird without a menubar
		Menu.setApplicationMenu(appMenu(mainWindow));
	}
	return mainWindow;
};
