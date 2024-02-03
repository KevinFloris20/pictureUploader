document.addEventListener('DOMContentLoaded', () => {
    var fileTracker = {
        beforePic: [],
        afterPic: []
    };
    let totalFileSize = 0;

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

    function showError(message) {
        const errorMessageDiv = document.getElementById('errorMessage');
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
    }

    function hideError() {
        document.getElementById('errorMessage').style.display = 'none';
    }

    function setLoading(loading) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        loadingIndicator.style.display = loading ? 'block' : 'none';
    }

    function validateForm() {
        //check if internet is on
        if (!navigator.onLine) {
            showError('You are offline. Please check your internet connection.');
            return false;
        }

        const equipmentId = document.querySelector('[name="equipmentId"]').value.trim();
        const hasBeforePic = fileTracker.beforePic.length > 0;
        const hasAfterPic = fileTracker.afterPic.length > 0;

        if (!equipmentId) {
            showError('Equipment ID is required.');
            return false;
        }

        if (!hasBeforePic && !hasAfterPic) {
            showError('At least one picture is required.');
            return false;
        }

        //check if total file size is less than 200MB
        totalFileSize = fileTracker.beforePic.concat(fileTracker.afterPic).reduce((total, file) => total + file.size, 0);
        if (totalFileSize > 200 * 1024 * 1024) {
            showError('Too many pictures, Total size must be under 200MB');
            return false;
        }

        hideError();
        return true;
    }

    function submitForm(e) {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);
    
        const equipmentId = document.querySelector('[name="equipmentId"]').value.trim();
        const totalImages = fileTracker.beforePic.length + fileTracker.afterPic.length;
    
        const uploadImage = (file, type, index) => {
            const formData = new FormData();
            formData.append('equipmentId', equipmentId);
            formData.append('totalImages', totalImages);
            formData.append('imageIndex', index);
            formData.append(type, file);
            return fetch('/upload', {
                method: 'POST',
                body: formData
            }).then(response => response.json());
        };
    
        const promises = [];
        fileTracker.beforePic.forEach((file, index) => promises.push(uploadImage(file, 'beforePic', index)));
        fileTracker.afterPic.forEach((file, index) => promises.push(uploadImage(file, 'afterPic', index + fileTracker.beforePic.length)));
    
        Promise.allSettled(promises).then(results => {
            const failedUpload = results.some(result => result.status === 'rejected' || result.value.error);
            if (failedUpload) {
                showError('Some pictures failed to load. Please try again.');
                setLoading(false);
            } else {
                console.log('All images uploaded successfully!');
                setLoading(false);
                window.location.reload();
            }
        }).catch(error => {
            console.error(error);
            setLoading(false);
            showError('An error occurred while uploading. Please try again.');
        });
    }
    
    document.getElementById('submitBtn').addEventListener('click', submitForm);
    document.getElementById('beforePic').addEventListener('change', (e) => addFiles('beforePic', e.target.files));
    document.getElementById('afterPic').addEventListener('change', (e) => addFiles('afterPic', e.target.files));
});
