const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { processAndUploadImages } = require('./models/sendToDB.js');
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



//all other routers:
router.get('/', (req, res) => {
    res.render('index');
});

let uploadSessions = {};
router.post('/upload', upload.fields([
    { name: 'beforePic', maxCount: 100 },
    { name: 'afterPic', maxCount: 100 }
]), async (req, res) => {
    const { equipmentId, totalImages, imageIndex } = req.body;
    
    if (!equipmentId) {
        return res.status(400).json({ error: 'Equipment ID is required' });
    }
    if (!req.files || (!req.files.beforePic && !req.files.afterPic)) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    if (!uploadSessions[equipmentId]) {
        uploadSessions[equipmentId] = {
            files: [],
            totalExpected: parseInt(totalImages, 10),
            received: 0
        };
    }

    const session = uploadSessions[equipmentId];
    const uploadedFiles = [...(req.files.beforePic || []), ...(req.files.afterPic || [])];
    session.files.push(...uploadedFiles);
    session.received += uploadedFiles.length;

    if (session.received === session.totalExpected) {
        try {
            await processAndUploadImages(equipmentId, session.files);
            delete uploadSessions[equipmentId];
            res.json({ message: "All images received and processed successfully." });
        } catch (error) {
            console.error('Error processing files:', error);
            delete uploadSessions[equipmentId];
            res.status(500).json({ error: "Failed to process files, please retry." });
        }
    } else {
        res.json({ message: "Image received, awaiting more." });
    }
});




//done
module.exports = router;
