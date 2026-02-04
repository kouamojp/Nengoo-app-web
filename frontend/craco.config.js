// Load configuration from environment or config file
const path = require('path');

// Environment variable overrides
const config = {
  disableHotReload: process.env.DISABLE_HOT_RELOAD === 'true',
};

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Fix for ES modules in node_modules (is-plain-obj, unified, etc.)
      const oneOfRule = webpackConfig.module.rules.find(rule => rule.oneOf);
      if (oneOfRule) {
        const babelLoaderRule = oneOfRule.oneOf.find(
          rule => rule.loader && rule.loader.includes('babel-loader')
        );

        if (babelLoaderRule) {
          // Include specific ES modules that need transpilation
          babelLoaderRule.include = [
            babelLoaderRule.include,
            /node_modules\/is-plain-obj/,
            /node_modules\/unified/,
            /node_modules\/bail/,
            /node_modules\/trough/,
            /node_modules\/vfile/,
            /node_modules\/unist-util-stringify-position/,
          ].filter(Boolean);
        }
      }

      // Disable hot reload completely if environment variable is set
      if (config.disableHotReload) {
        // Remove hot reload related plugins
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
        });

        // Disable watch mode
        webpackConfig.watch = false;
        webpackConfig.watchOptions = {
          ignored: /.*/, // Ignore all files
        };
      } else {
        // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
          ],
        };
      }

      return webpackConfig;
    },
  },
};