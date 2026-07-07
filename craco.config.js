module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        path: require.resolve("path-browserify"),
        assert: require.resolve("assert/"),
      };
      // axios's package.json exports map resolves to its ESM entry for
      // require() calls under webpack, giving a namespace object without
      // a top-level `.get`. Force the CJS browser build instead.
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        axios: require.resolve("axios/dist/browser/axios.cjs"),
      };
      // CRA's webpack config has no rule for `.cjs`, so without this it
      // falls through to the asset/resource rule and gets copied as a raw
      // file instead of being bundled as a module.
      webpackConfig.module.rules.push({
        test: /\.cjs$/,
        type: "javascript/auto",
      });
      return webpackConfig;
    },
  },
};
