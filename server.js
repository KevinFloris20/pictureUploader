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

// var count = 0;
// function trackMemoryUsage() {
//     var x = 2000; // ms
//     var lastRSS = 0;
//     var secondToLastRss = 0;
//     setInterval(() => {
//         const memoryUsage = process.memoryUsage();
//         if(Math.round(memoryUsage.rss / 1024 / 1024) === Math.round(lastRSS / 1024 / 1024) && Math.round(memoryUsage.rss / 1024 / 1024) === Math.round(secondToLastRss / 1024 / 1024)){
//             x = 2000;
//         }else{
//             x = 100;
//             secondToLastRss = lastRSS;
//             lastRSS = memoryUsage.rss;
//         }
//         console.log(`Memory Usage - RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB, Heap Used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB,, count: ${count++}, speed: ${x}ms`);
//     }, x);
// }
// trackMemoryUsage();

let lastRSS = 0;
let secondToLastRSS = 0;
let count = 0;

function dynamicMemoryTracker() {
    const memoryUsage = process.memoryUsage();
    const rss = parseFloat((memoryUsage.rss / 1024 / 1024).toFixed(2));
    const heapUsed = parseFloat((memoryUsage.heapUsed / 1024 / 1024).toFixed(2));

    console.log(`Memory Usage - RSS: ${rss} MB, Heap Used: ${heapUsed} MB, Count: ${count++}`);

    let interval = 2000;

    if (rss === lastRSS && rss === secondToLastRSS) {
        interval = 2000; 
    } else {
        interval = 100;
    }

    secondToLastRSS = lastRSS;
    lastRSS = rss;

    setTimeout(dynamicMemoryTracker, interval);
}

dynamicMemoryTracker();


module.exports = app;
