/** @type {import("next").NextConfig} */
const config = {
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
