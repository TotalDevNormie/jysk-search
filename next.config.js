/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.jysk.lv",
        pathname: "/**",
      },
    ],
  },
};

export default config;
