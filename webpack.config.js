const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: {
    index: './static/js/index.js',
    game: './static/js/game.js',
    multiplayer: './static/js/multiplayer/multiplayer_game.js',
    leaderboard: './static/js/leaderboard/leaderboard.js',
    admin: './static/js/admin_js_modules/adminMain.js'
  },
  output: {
    path: path.resolve(__dirname, 'static/js/dist'),
    filename: '[name].bundle.js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    })],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        common: {
          name: 'common',
          chunks: 'all',
          minChunks: 2,
          enforce: true
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'static/js')
    }
  },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
};