const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Add the shared directory to watchFolders
// IMPORTANT: Only include project's node_modules, NOT workspace root's node_modules
// This prevents React version conflicts (app uses React 19, root might have React 18)
config.watchFolders = [
  path.resolve(projectRoot, 'node_modules'), // Only use project's node_modules
  path.resolve(workspaceRoot, 'shared'),
  // DO NOT include workspaceRoot node_modules - it may have different React version
];

// Add shared to resolver sourceExts if needed
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];

// Block resolving React from workspace root's node_modules to prevent version conflicts
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules');
if (fs.existsSync(workspaceNodeModules)) {
  config.resolver.blockList = [
    ...(config.resolver.blockList || []),
    // Block React packages from workspace root's node_modules
    new RegExp(`${workspaceNodeModules.replace(/\\/g, '/')}/react(/.*)?$`),
    new RegExp(`${workspaceNodeModules.replace(/\\/g, '/')}/react-native(/.*)?$`),
  ];
}

// Configure extraNodeModules to ensure dependencies resolve from project's node_modules
// This is critical for files in watchFolders (like shared/) to resolve react, react-native, etc.
// CRITICAL: Force all React-related packages to resolve from project's node_modules only
// This prevents "multiple copies of React" errors when workspace root has different React version
const projectNodeModules = path.resolve(projectRoot, 'node_modules');

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  // Core React dependencies - ALWAYS resolve from project's node_modules ONLY
  'react': path.resolve(projectNodeModules, 'react'),
  'react/jsx-runtime': path.resolve(projectNodeModules, 'react/jsx-runtime'),
  'react/jsx-dev-runtime': path.resolve(projectNodeModules, 'react/jsx-dev-runtime'),
  'react-native': path.resolve(projectNodeModules, 'react-native'),
  '@expo/vector-icons': path.resolve(projectNodeModules, '@expo/vector-icons'),
  '@react-native-async-storage/async-storage': path.resolve(projectNodeModules, '@react-native-async-storage/async-storage'),
};

// Safely resolve shim path - only add shims if file exists
try {
  const emptyShimPath = path.resolve(projectRoot, 'emptyShim.js');
  
  if (fs.existsSync(emptyShimPath)) {
    config.resolver.extraNodeModules = {
      ...config.resolver.extraNodeModules,
      ws: emptyShimPath,
      stream: emptyShimPath,
      events: emptyShimPath,
      http: emptyShimPath,
      https: emptyShimPath,
      crypto: emptyShimPath,
      net: emptyShimPath,
      zlib: emptyShimPath,
      tls: emptyShimPath,
      url: emptyShimPath,
    };
  }
} catch (error) {
  // If shims can't be loaded, continue without them
  // The build should still work on EAS servers with Node.js 20.18.0
}

// Add resolver for invariant package - Android focused
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['android', 'ios', 'native', 'web'];

module.exports = config; 