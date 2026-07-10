module.exports = {
  jest: {
    configure: (jestConfig) => {
      // CRA/craco's default jest config only looks under src/. Tests live in
      // a top-level tests/ folder instead, so add it to the search roots.
      jestConfig.roots = [...jestConfig.roots, "<rootDir>/tests"];
      jestConfig.testMatch = [
        ...jestConfig.testMatch,
        "<rootDir>/tests/**/*.{spec,test}.{js,jsx,ts,tsx}",
      ];
      return jestConfig;
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        //fallback for stac-node-validator
        //see: https://www.npmjs.com/package/stac-node-validator?activeTab=dependencies
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
