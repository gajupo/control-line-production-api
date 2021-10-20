const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './www.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'api.bundle.js',
  },
  externalsPresets: { node: true },
  externals: [nodeExternals()],
  // externals: ['pg', 'sqlite3', 'pg-hstore'],
};
