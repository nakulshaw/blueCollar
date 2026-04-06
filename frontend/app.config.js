import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android.config,
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || "AIzaSyBw6dGfSLAOeo1UL7IMJRVn0S5T-oZX84E"
        }
      }
    }
  };
};
