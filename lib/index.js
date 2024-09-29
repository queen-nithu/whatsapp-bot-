const fs = require('fs').promises;
const path = require('path');

async function loadModules(directory = __dirname, options = {}) {
  const {
    recursive = false,
    exclude = [],
    fileExtensions = ['.js'],
    silent = false,
  } = options;

  const exportedModules = {};

  async function processDirectory(dir) {
    try {
      const files = await fs.readdir(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);

        if (stats.isDirectory() && recursive) {
          await processDirectory(filePath);
        } else if (stats.isFile() && fileExtensions.includes(path.extname(file)) && !exclude.includes(file)) {
          try {
            const moduleName = path.basename(file, path.extname(file));
            const moduleExports = require(filePath);

            if (typeof moduleExports === 'object') {
              Object.assign(exportedModules, moduleExports);
            } else {
              exportedModules[moduleName] = moduleExports;
            }
          } catch (error) {
            if (!silent) {
              console.error(`Error loading module ${file}:`, error.message);
            }
          }
        }
      }
    } catch (error) {
      if (!silent) {
        console.error(`Error reading directory ${dir}:`, error.message);
      }
    }
  }

  await processDirectory(directory);
  Object.keys(exportedModules).forEach(key => {
    Object.defineProperty(exportedModules, key, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: exportedModules[key]
    });
  });

  return exportedModules;
}

module.exports = loadModules;