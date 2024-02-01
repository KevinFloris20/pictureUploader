document.addEventListener('DOMContentLoaded', () => {
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

        hideError();
        return true;
    }

    function submitForm(e) {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);

        var formData = new FormData();
        formData.append('equipmentId', document.querySelector('[name="equipmentId"]').value.trim());
        fileTracker.beforePic.forEach(file => formData.append('beforePic', file));
        fileTracker.afterPic.forEach(file => formData.append('afterPic', file));

        fetch('/upload', {
            method: 'POST',
            body: formData
        }).then(response => {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                return response.json();
            } else {
                return response.text();
            }
        }).then(data => {
            console.log(data);
            console.log('Images uploaded successfully!');
            setLoading(false);
            window.location.reload(); 
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
