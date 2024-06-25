const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const appRoutes = require('./server/routes');
require('http').globalAgent.maxSockets = require('https').globalAgent.maxSockets = 100;


const app = express();
const port = 3069;
const PORT = process.env.PORT || port;

//if on local keep going if not check for https
function checkHttps(req, res, next) {
    if (req.secure) {
        return next();
    } else if (req.get('x-forwarded-proto') === 'https') {
        return next();
    } else {
        res.redirect('https://' + req.hostname + req.url);
    }
}
if (PORT != port) {
    app.use(checkHttps);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.use(appRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});



module.exports = app;
