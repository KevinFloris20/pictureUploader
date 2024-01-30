const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const appRoutes = require('./routes');

const app = express();
const port = 3069;

app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));
// app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.use(appRoutes);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;
