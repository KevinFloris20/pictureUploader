const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

//for handling storage ops
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });



//router for semantic
router.get('/semantic.min.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'semantic.min.css'));
});
router.get('/semantic.min.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'semantic.min.js'));
});
router.get('/style.css', (req,res) =>{
    res.sendFile(path.join(__dirname,"public", 'style.css'));
});
router.get('/script.js', (req,res) =>{
    res.sendFile(path.join(__dirname,"public", 'script.js'));
});



//all routers:

router.get('/', (req, res) => {
    res.render('index');
});
router.post('/upload', upload.fields([
    { name: 'beforePic', maxCount: 50 },
    { name: 'afterPic', maxCount: 50 }
]), (req, res) => {
    console.log(req.body);
    console.log(req.files);
    res.send('Files uploaded successfully!');
});


//done
module.exports = router;
