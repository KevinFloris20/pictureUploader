

document.addEventListener('DOMContentLoaded', () => {

    //for the file management
    var fileTracker = {
        beforePic: [],
        afterPic: []
    };
    function addFiles(inputId, fileList) {
        for (var file of fileList) {
            fileTracker[inputId].push(file);
        }
        updateThumbnails(inputId);
    }
    function updateThumbnails(inputId) {
        var thumbnailsContainer = document.getElementById(inputId + 'Thumbnails');
        thumbnailsContainer.innerHTML = '';
        fileTracker[inputId].forEach((file, index) => {
            var reader = new FileReader();
            reader.onload = function(e) {
                var div = document.createElement('div');
                div.className = 'thumbnail';
                div.style.backgroundImage = 'url(' + e.target.result + ')';
                var deleteBtn = document.createElement('div');
                deleteBtn.classList.add('delete-btn');
                deleteBtn.textContent = 'x';
                deleteBtn.onclick = function() {
                    fileTracker[inputId].splice(index, 1);
                    updateThumbnails(inputId);
                };
                div.appendChild(deleteBtn);
                thumbnailsContainer.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }
    document.getElementById('beforePic').addEventListener('change', function(e) {
        addFiles('beforePic', e.target.files);
    });
    document.getElementById('afterPic').addEventListener('change', function(e) {
        addFiles('afterPic', e.target.files);
    });

    //submit btn functions
    function clearFormAndImages() {
        document.querySelector('[name="equipmentId"]').value = '';
        document.getElementById('beforePic').value = '';
        document.getElementById('afterPic').value = '';
        fileTracker.beforePic = [];
        fileTracker.afterPic = [];
        document.getElementById('beforePicThumbnails').innerHTML = '';
        document.getElementById('afterPicThumbnails').innerHTML = '';
    }
    function submit(e) {
        e.preventDefault();
        var formData = new FormData();
        formData.append('equipmentId', document.querySelector('[name="equipmentId"]').value);
        fileTracker.beforePic.forEach(file => {
            formData.append('beforePic', file);
        });
        fileTracker.afterPic.forEach(file => {
            formData.append('afterPic', file);
        });
        fetch('/upload', {
            method: 'POST',
            body: formData
        }).then(
            response => response.text()
        ).then(data => {
            console.log(data);
            clearFormAndImages();
        }).catch(error => {
            console.error(error); 
        });
    }
    document.querySelector('.ui.form').addEventListener('submit', submit);
});