const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { processAndUploadImages, makeFirstFolder } = require('./models/sendToDB.js');
const bodyParser = require('body-parser');
const maxFileSize = 200 * 1024 * 1024;


//setup for file size and storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: maxFileSize },
});
router.use(bodyParser.json({ limit: `${maxFileSize}mb` }));
router.use(bodyParser.urlencoded({ limit: `${maxFileSize}mb`, extended: true }));


//router for front end statics
router.get('/semantic.min.css', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'semantic.min.css'));
});
router.get('/semantic.min.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'semantic.min.js'));
});
router.get('/style.css', (req,res) =>{
    res.sendFile(path.join(__dirname,"../public", 'style.css'));
});
router.get('/script.js', (req,res) =>{
    res.sendFile(path.join(__dirname,"../public", 'script.js'));
});


count = 10000;
const logMemoryUsage = (event) => {
    const used = process.memoryUsage();
    console.log(`${event} -- Memory Usage: heapTotal ${Math.round(used.heapTotal / 1024 / 1024)} MB, heapUsed ${Math.round(used.heapUsed / 1024 / 1024)} MB, RSS ${Math.round(used.rss / 1024 / 1024)} MB, count: ${count++}`);
};
logMemoryUsage("Start of server")

//all other routers:
router.get('/', (req, res) => {
    res.render('index');
});

let uploadSessions = {};
router.post('/start-session', async (req, res) => {
    logMemoryUsage("Start of /start-session")
    const { equipmentId } = req.body;
    if (!equipmentId) {
        return res.status(400).json({ error: 'Equipment ID is required' });
    }

    try {
        const sessionId = await makeFirstFolder(equipmentId); 
        uploadSessions[sessionId] = { images: [], equipmentId: equipmentId };
        res.json({ sessionId });
    } catch (error) {
        console.error('Error starting upload session:', error);
        res.status(500).json({ error: "Failed to start upload session, please retry." });
    }
});

router.post('/upload', upload.fields([
    { name: 'beforePic', maxCount: 100 },
    { name: 'afterPic', maxCount: 100 }
]), async (req, res) => {
    logMemoryUsage("Start of /upload")
    const { sessionId } = req.body;
    if (!sessionId || !uploadSessions[sessionId]) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }
    if (req.files.beforePic) {
        req.files.beforePic.forEach(file => {
            uploadSessions[sessionId].images.push({ ...file, fieldname: 'beforePic' });
        });
    }
    if (req.files.afterPic) {
        req.files.afterPic.forEach(file => {
            uploadSessions[sessionId].images.push({ ...file, fieldname: 'afterPic' });
        });
    }
    res.json({ message: "Images received successfully." });
    logMemoryUsage("End of /upload")
});

router.post('/finalize-session', async (req, res) => {
    logMemoryUsage("Start of /finalize-session")
    const { sessionId } = req.body;
    if (!sessionId || !uploadSessions[sessionId]) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }
    try {
        logMemoryUsage("Before processAndUploadImages")
        const session = uploadSessions[sessionId];
        if (session.images.length < (session.expectedBeforePicCount + session.expectedAfterPicCount)) {
            return res.status(400).json({ error: 'Not all images received yet.' });
        }
        // const imageIds = await processAndUploadImages(sessionId, session.images);
        delete uploadSessions[sessionId]; 
        logMemoryUsage("After processAndUploadImages")
        res.json({ message: "All images processed successfully." });
    } catch (error) {
        console.error('Error processing images:', error);
        res.status(500).json({ error: "Failed to process images, please retry." });
    }
    logMemoryUsage("End of /finalize-session")
});

router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

//done
module.exports = router;
