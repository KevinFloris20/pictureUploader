const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { processAndUploadImages } = require('./models/sendToDB.js');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



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

router.post('/upload', upload.fields([
    { name: 'beforePic', maxCount: 100 },
    { name: 'afterPic', maxCount: 100 }
]), async (req, res) => {
    try {
        if (req.body.equipmentId == '') {
            return res.status(400).send('Equipment ID is required');
        }
        const equipmentId = req.body.equipmentId;
        const images = [...(req.files.beforePic || []), ...(req.files.afterPic || [])];
        await processAndUploadImages(equipmentId, images);
        res.json({ message: "Images processed and uploaded successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error uploading images" });
    }
});



//done
module.exports = router;
