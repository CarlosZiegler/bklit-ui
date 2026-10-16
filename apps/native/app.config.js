module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.BKLIT_DOCS_PREVIEW === "1"
      ? { baseUrl: "/native-preview" }
      : {}),
  },
});
