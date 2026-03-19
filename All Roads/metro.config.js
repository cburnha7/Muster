const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.assetExts.push('db');

// Add explicit node_modules resolution for web
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Ensure proper module resolution
config.resolver.resolverMainFields = ['browser', 'module', 'main'];

module.exports = config;