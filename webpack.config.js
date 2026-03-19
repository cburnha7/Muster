const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['generator-function']
      }
    },
    argv
  );

  // Polyfill Node built-ins that some dependencies expect in the browser
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    url: require.resolve('url/'),
    crypto: false,
    stream: false,
    buffer: false,
  };

  return config;
};
