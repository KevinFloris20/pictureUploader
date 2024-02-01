const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const appRoutes = require('./server/routes');

const app = express();
const port = 3069;
const PORT = process.env.PORT || port;

app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.use(appRoutes);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;
