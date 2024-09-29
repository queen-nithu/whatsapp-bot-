const path = require('path');
const config = require('./config');
const { connect, getandRequirePlugins, requireJS } = require('./lib');
async function initialize() {
 await requireJS(path.join(__dirname, '/lib/Store/'));
 console.log('Syncing Database');
 await config.DATABASE.sync();
 console.log('⬇  Installing Plugins...');
 await requireJS(path.join(__dirname, '/plugins/'));
 await getandRequirePlugins();
 console.log('✅ Plugins Installed!');
 return await connect();
}

initialize();
