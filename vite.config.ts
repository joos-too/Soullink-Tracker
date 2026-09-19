import path from "path";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Load .env and .env.[mode] and expose VITE_* to import.meta.env
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [tailwindcss()],
    build: {
      manifest: true,
      rolldownOptions: {
        output: {
          // Keep initialization order when modules move into shared chunks.
          strictExecutionOrder: true,
          codeSplitting: {
            groups: [
              {
                name: "react-vendor",
                test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
                priority: 30,
              },
              {
                name: "supabase-vendor",
                test: /[\\/]node_modules[\\/](@supabase[\\/]|iceberg-js[\\/])/,
                priority: 20,
              },
              {
                name: "i18n-vendor",
                test: /[\\/]node_modules[\\/](i18next|react-i18next|html-parse-stringify|void-elements)[\\/]/,
                priority: 10,
              },
              {
                name: "pokemon-data",
                test: /[\\/]src[\\/]data[\\/]pokemon\.ts$/,
              },
              { name: "item-data", test: /[\\/]src[\\/]data[\\/]items\.ts$/ },
              {
                name: "location-data",
                test: /[\\/]src[\\/]data[\\/]locations\.ts$/,
              },
            ],
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
