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
    
        // Start the session
        async function uploadFiles(equipmentId, totalImages) {
            try {
                // First we will create a sesshion to communicate with the server and send all appropriate data
                //after that we will send the before pics then the after pics and then we will close our upload session
                const response = await fetch('/start-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ equipmentId, totalImages })
                });
                const data = await response.json();
                const sessionId = data.sessionId;
                console.log('Session ID:', sessionId);
        
                let uploadPromises = [];
        

                // Upload before pics
                fileTracker.beforePic.forEach((file, index) => {
                    const formData = new FormData();
                    formData.append('sessionId', sessionId);
                    formData.append('beforePic', file, file.name);
                    uploadPromises.push(fetch('/upload', {
                        method: 'POST',
                        body: formData
                    }).then(response => response.json()));
                });
        
                // copy and pasted for the after pics
                fileTracker.afterPic.forEach((file, index) => {
                    const formData = new FormData();
                    formData.append('sessionId', sessionId);
                    formData.append('afterPic', file, file.name);
                    uploadPromises.push(fetch('/upload', {
                        method: 'POST',
                        body: formData
                    }).then(response => response.json()));
                });
        
                //make sure it all works
                await Promise.all(uploadPromises);
        
                // Finalize the session
                const finalizeResponse = await fetch('/finalize-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId })
                });
                const finalizeData = await finalizeResponse.json();
                console.log(finalizeData.message);
                setLoading(false);
                //What better way to manage dom state than to reload the page XOXO
                window.location.reload();
            } catch(error){
                console.error('Error:', error);
                setLoading(false);
                if (!navigator.onLine) {
                    showError('You are offline. Please check your internet connection.');
                    return false;
                }else{
                    showError(`An error occurred, please try again. ${error.message}`);
                
                }
            }
        }
        uploadFiles(equipmentId, totalImages);
        
    }
    
    document.getElementById('submitBtn').addEventListener('click', submitForm);
    document.getElementById('beforePic').addEventListener('change', (e) => addFiles('beforePic', e.target.files));
    document.getElementById('afterPic').addEventListener('change', (e) => addFiles('afterPic', e.target.files));
    
});
