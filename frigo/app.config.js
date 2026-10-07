// Permet de publier la version web dans un sous-dossier (GitHub Pages) : EXPO_BASE_URL=/jeuxenigme/app
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL ?? '' },
});
