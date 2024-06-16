const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { processAndUploadImages, makeFirstFolder } = require('./models/sendToDB.js');
const bodyParser = require('body-parser');
const maxFileSize = 200 * 1024 * 1024;

/* These are the routes for the whole app:

How this app works is that it automates the uploading
proccess of photos from a client to google drive. 

Photos will be uploaded to drive in a folder named by
the client, and then in that folder there will be two
before and after folder with both sets of pictures in
each and then a updated folder in each of those two
folders for the converted pictures, which will be reduced
in size, converted to jpg, and then also uploaded to drive.
This site should be able to handle 50 before and 50 after
pictures while sequentially uploading them to drive and or
transforming them.

This router will handle the front end statics, and the
session to handle the stream of photo information from
the client. 
*/

//setup for file size and storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: maxFileSize },
});
router.use(bodyParser.json({ limit: `${maxFileSize}mb` }));
router.use(bodyParser.urlencoded({ limit: `${maxFileSize}mb`, extended: true }));


//router for front end statics
router.get('/other/site.webmanifest', (req, res) => {
    res.type('application/manifest+json');
    res.sendFile(path.join(__dirname, '..', 'public', 'other', 'site.webmanifest'));
});

router.use(express.static(path.join(__dirname, '..', 'public/other')));

router.get('/style.css', (req,res) =>{
    res.sendFile(path.join(__dirname,"../public", 'style.css'));
});
router.get('/script.js', (req,res) =>{
    res.sendFile(path.join(__dirname,"../public", 'script.js'));
});



//all other routers:
router.get('/', (req, res) => {
    res.render('index');
});

let uploadSessions = {};
router.post('/start-session', async (req, res) => {
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
});

router.post('/finalize-session', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId || !uploadSessions[sessionId]) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }
    try {
        const session = uploadSessions[sessionId];
        if (session.images.length < (session.expectedBeforePicCount + session.expectedAfterPicCount)) {
            return res.status(400).json({ error: 'Not all images received yet.' });
        }
        processAndUploadImages(sessionId, session.images);
        delete uploadSessions[sessionId]; 
        res.json({ message: "All images processed successfully." });
    } catch (error) {
        console.error('Error processing images:', error);
        res.status(500).json({ error: "Failed to process images, please retry." });
    }
});

router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

//done
module.exports = router;
