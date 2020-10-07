const showRoutes = require('./tvmaze');
const path = require('path');

const constructorMethod = (app) => {
  app.use('/shows', showRoutes);
};

module.exports = constructorMethod;