const fs = require('fs');
const path = require('path');

function traverseDir(dir, result = {}) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      traverseDir(filePath, result);
    } else if (stat.isFile() && path.extname(file) === '.js') {
      try {
        const moduleName = path.basename(file, '.js');
        const moduleExports = require(filePath);

        if (typeof moduleExports === 'object') {
          Object.assign(result, moduleExports);
        } else {
          result[moduleName] = moduleExports;
        }
      } catch (error) {
        console.error(`Error loading module ${file}:`, error.message);
      }
    }
  }

  return result;
}

function loadModules(directory = __dirname) {
  const exportedModules = traverseDir(directory);
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