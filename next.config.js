/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    // pdfjs-dist optionally requires the 'canvas' Node.js module, which includes
    // a native .node binary that webpack can't parse. We only use pdfjs in the
    // browser, so we ignore the canvas module entirely during bundling.
    config.plugins = config.plugins || [];
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^canvas$/,
      })
    );
    return config;
  },
};

module.exports = nextConfig;
