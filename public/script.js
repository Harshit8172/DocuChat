document.addEventListener('DOMContentLoaded', () => {
    // API Configuration
    const API_BASE_URL = 'https://docuchat-backend-gs7c.onrender.com';

    let authToken = localStorage.getItem('authToken');
    let userName = localStorage.getItem('userName');

    // UI Elements
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authToggleBtn = document.getElementById('authToggleBtn');
    const authToggleText = document.getElementById('authToggleText');
    const authError = document.getElementById('authError');
    const logoutBtn = document.getElementById('logoutBtn');

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsContent = document.getElementById('settingsContent');
    const closeSettings = document.getElementById('closeSettings');
    const saveSettings = document.getElementById('saveSettings');

    const rootUploadArea = document.getElementById('rootUploadArea');
    const rootFileInput = document.getElementById('rootFileInput');
    const folderFileInput = document.getElementById('folderFileInput');

    const uploadStatus = document.getElementById('uploadStatus');
    const uploadStatusText = document.getElementById('uploadStatusText');
    const uploadSpinner = document.getElementById('uploadSpinner');

    const fileTree = document.getElementById('fileTree');
    const newFolderBtn = document.getElementById('newFolderBtn');
    const folderModal = document.getElementById('folderModal');
    const folderNameInput = document.getElementById('folderNameInput');
    const cancelFolderBtn = document.getElementById('cancelFolderBtn');
    const createFolderSubmit = document.getElementById('createFolderSubmit');

    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const contextIndicator = document.getElementById('contextIndicator');
    const userNameDisplay = document.getElementById('userNameDisplay');

    const authNameFields = document.getElementById('authNameFields');
    const authFirstName = document.getElementById('authFirstName');
    const authLastName = document.getElementById('authLastName');

    // Mobile Sidebar Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    let isLogin = true;
    let currentUploadFolderId = null;

    // --- Authentication ---
    if (!authToken) {
        authModal.classList.remove('hidden');
    } else {
        loadAppData();
        displayUserName();
    }

    authToggleBtn.addEventListener('click', () => {
        isLogin = !isLogin;
        authTitle.textContent = isLogin ? 'Login' : 'Sign Up';
        authToggleText.textContent = isLogin ? "Don't have an account?" : "Already have an account?";
        authToggleBtn.textContent = isLogin ? 'Sign Up' : 'Login';
        authError.classList.add('hidden');

        if (isLogin) {
            authNameFields.classList.add('hidden');
            authFirstName.removeAttribute('required');
            authLastName.removeAttribute('required');
            document.querySelector('#authForm button[type="submit"]').textContent = 'Login';
        } else {
            authNameFields.classList.remove('hidden');
            authFirstName.setAttribute('required', 'true');
            authLastName.setAttribute('required', 'true');
            document.querySelector('#authForm button[type="submit"]').textContent = 'Sign Up';
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const first_name = authFirstName.value;
        const last_name = authLastName.value;

        const endpoint = isLogin ? `${API_BASE_URL}/api/login` : `${API_BASE_URL}/api/signup`;
        const payload = isLogin ? { email, password } : { email, password, first_name, last_name };

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                let errorMsg = 'Authentication failed';
                try {
                    // Clone response before reading to avoid stream exhaustion
                    const contentType = res.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await res.json();
                        errorMsg = data.detail || errorMsg;
                    }
                } catch (err) {
                    console.error('[AUTH] Error parsing error response:', err);
                }
                throw new Error(errorMsg);
            }

            const data = await res.json();
            authToken = data.token;
            userName = data.name;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('userName', userName);
            authModal.classList.add('hidden');
            loadAppData();
            displayUserName();
        } catch (err) {
            authError.textContent = err.message;
            authError.classList.remove('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        location.reload();
    });

    // --- Mobile Sidebar Logic ---
    function toggleSidebar() {
        const isClosed = sidebar.classList.contains('-translate-x-full');
        if (isClosed) {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
            // small delay to allow display:block to apply before animating opacity
            setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10);
        } else {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('opacity-0');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300); // Wait for transition
        }
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    // --- API Helpers ---
    async function apiFetch(url, options = {}) {
        if (!options.headers) options.headers = {};
        options.headers['Authorization'] = `Bearer ${authToken}`;
        // Prepend API_BASE_URL if url is relative
        const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
        const res = await fetch(fullUrl, options);
        // Only auto-logout on 401 for critical endpoints like /api/data or /api/chat
        // Don't auto-logout for settings as it may fail due to other reasons
        if (res.status === 401 && (fullUrl.includes('/api/data') || fullUrl.includes('/api/chat') || fullUrl.includes('/api/upload'))) {
            console.error('[AUTH] 401 on critical endpoint:', url);
            localStorage.removeItem('authToken');
            location.reload();
        }
        return res;
    }

    // --- Load Data ---
    async function loadAppData() {
        await fetchSettings();
        await renderTree();
    }

    // --- Display User Name ---
    function displayUserName() {
        if (userName) {
            userNameDisplay.innerHTML = `<i class="fa-solid fa-user text-primary mr-2"></i><span class="font-medium">${userName}</span>`;
        }
    }

    // --- Settings ---
    async function fetchSettings() {
        try {
            const res = await apiFetch('/api/settings');
            if (res.status === 401) {
                console.error('[SETTINGS] 401 Unauthorized - Token may be invalid');
                localStorage.removeItem('authToken');
                location.reload();
                return;
            }
            if (!res.ok) {
                console.error('[SETTINGS] Error:', res.status, res.statusText);
                return;
            }

            // Safely parse JSON only if response is ok and has content
            let data;
            try {
                const text = await res.text();
                if (text) {
                    data = JSON.parse(text);
                } else {
                    console.error('[SETTINGS] Empty response body');
                    return;
                }
            } catch (parseErr) {
                console.error('[SETTINGS] Failed to parse response:', parseErr);
                return;
            }

            document.getElementById('openrouterKey').value = data.openrouter_key || '';
            document.getElementById('openrouterModel').value = data.openrouter_model || 'openai/gpt-4o';
            document.getElementById('hfKey').value = data.hf_key || '';
            document.getElementById('pineconeKey').value = data.pinecone_key || '';
            document.getElementById('pineconeIndex').value = data.pinecone_index || '';

            if (!data.pinecone_key || !data.hf_key) {
                setTimeout(openSettings, 1000);
            }
        } catch (e) { console.error('[SETTINGS] Exception:', e); }
    }

    function openSettings() {
        settingsModal.classList.remove('hidden');
        setTimeout(() => {
            settingsContent.classList.remove('scale-95', 'opacity-0');
            settingsContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    }

    function closeSettingsModal() {
        settingsContent.classList.remove('scale-100', 'opacity-100');
        settingsContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { settingsModal.classList.add('hidden'); }, 200);
    }

    settingsBtn.addEventListener('click', openSettings);
    closeSettings.addEventListener('click', closeSettingsModal);

    saveSettings.addEventListener('click', async () => {
        const payload = {
            openrouter_key: document.getElementById('openrouterKey').value,
            openrouter_model: document.getElementById('openrouterModel').value,
            hf_key: document.getElementById('hfKey').value,
            pinecone_key: document.getElementById('pineconeKey').value,
            pinecone_index: document.getElementById('pineconeIndex').value
        };
        try {
            const res = await apiFetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) closeSettingsModal();
            else alert('Failed to save settings');
        } catch (e) { alert(e.message); }
    });

    // --- File Explorer & Checkboxes ---
    async function renderTree() {
        try {
            const res = await apiFetch('/api/data');
            const data = await res.json();
            if (!res.ok) return;

            fileTree.innerHTML = '';

            // Render Folders
            data.folders.forEach(folder => {
                const folderDiv = document.createElement('div');
                folderDiv.className = 'mb-2';

                // Folder Header
                const header = document.createElement('div');
                header.className = 'flex items-center justify-between py-1 px-2 hover:bg-gray-700/50 rounded-lg group';

                const leftPart = document.createElement('div');
                leftPart.className = 'flex items-center gap-2';
                leftPart.innerHTML = `
                    <input type="checkbox" class="folder-check w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-gray-800" data-id="${folder.id}">
                    <i class="fa-solid fa-folder text-yellow-500"></i>
                    <span class="font-medium">${folder.name}</span>
                `;

                const rightPart = document.createElement('div');
                rightPart.className = 'flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity';

                const uploadBtn = document.createElement('button');
                uploadBtn.className = 'text-gray-500 hover:text-primary';
                uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i>';
                uploadBtn.title = "Upload file to folder";
                uploadBtn.onclick = () => {
                    currentUploadFolderId = folder.id;
                    folderFileInput.click();
                };

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'text-gray-500 hover:text-red-500';
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                deleteBtn.title = "Delete folder";
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete folder "${folder.name}"?`)) {
                        deleteFolder(folder.id);
                    }
                };

                rightPart.appendChild(uploadBtn);
                rightPart.appendChild(deleteBtn);

                header.appendChild(leftPart);
                header.appendChild(rightPart);
                folderDiv.appendChild(header);

                // Folder Files
                const folderFiles = data.files.filter(f => f.folder_id === folder.id);
                if (folderFiles.length > 0) {
                    const filesContainer = document.createElement('div');
                    filesContainer.className = 'pl-6 space-y-1 mt-1 border-l border-gray-700 ml-3';
                    folderFiles.forEach(file => {
                        const fileDiv = document.createElement('div');
                        fileDiv.className = 'flex items-center justify-between gap-2 py-1 px-2 hover:bg-gray-700/50 rounded-lg group';

                        const leftPart = document.createElement('div');
                        leftPart.className = 'flex items-center gap-2 flex-1';
                        leftPart.innerHTML = `
                            <input type="checkbox" class="file-check w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-gray-800" data-id="${file.id}" data-folder-id="${folder.id}">
                            <i class="fa-solid fa-file-lines text-gray-400"></i>
                            <span class="truncate text-xs text-gray-300">${file.filename}</span>
                        `;

                        const deleteFileBtn = document.createElement('button');
                        deleteFileBtn.className = 'text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto';
                        deleteFileBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                        deleteFileBtn.title = "Delete file";
                        deleteFileBtn.onclick = (e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${file.filename}"?`)) {
                                deleteFile(file.id);
                            }
                        };

                        fileDiv.appendChild(leftPart);
                        fileDiv.appendChild(deleteFileBtn);
                        filesContainer.appendChild(fileDiv);
                    });
                    folderDiv.appendChild(filesContainer);
                }

                fileTree.appendChild(folderDiv);
            });

            // Render Root Files
            const rootFiles = data.files.filter(f => !f.folder_id);
            if (rootFiles.length > 0) {
                const rootDiv = document.createElement('div');
                rootDiv.className = 'mt-4 pt-2 border-t border-gray-700 space-y-1';
                rootFiles.forEach(file => {
                    const fileDiv = document.createElement('div');
                    fileDiv.className = 'flex items-center justify-between gap-2 py-1 px-2 hover:bg-gray-700/50 rounded-lg group';

                    const leftPart = document.createElement('div');
                    leftPart.className = 'flex items-center gap-2 flex-1';
                    leftPart.innerHTML = `
                        <input type="checkbox" class="file-check w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-gray-800" data-id="${file.id}">
                        <i class="fa-solid fa-file-lines text-gray-400"></i>
                        <span class="truncate text-xs text-gray-300">${file.filename}</span>
                    `;

                    const deleteFileBtn = document.createElement('button');
                    deleteFileBtn.className = 'text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto';
                    deleteFileBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                    deleteFileBtn.title = "Delete file";
                    deleteFileBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${file.filename}"?`)) {
                            deleteFile(file.id);
                        }
                    };

                    fileDiv.appendChild(leftPart);
                    fileDiv.appendChild(deleteFileBtn);
                    rootDiv.appendChild(fileDiv);
                });
                fileTree.appendChild(rootDiv);
            }

            attachCheckboxLogic();

        } catch (e) { console.error(e); }
    }

    // --- Delete Functions ---
    async function deleteFile(fileId) {
        try {
            const res = await apiFetch(`/api/files/${fileId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                renderTree();
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.detail || 'Failed to delete file'}`);
            }
        } catch (e) {
            alert(`Error deleting file: ${e.message}`);
        }
    }

    async function deleteFolder(folderId) {
        try {
            const res = await apiFetch(`/api/folders/${folderId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                renderTree();
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.detail || 'Failed to delete folder'}`);
            }
        } catch (e) {
            alert(`Error deleting folder: ${e.message}`);
        }
    }

    function attachCheckboxLogic() {
        const folderChecks = document.querySelectorAll('.folder-check');
        const fileChecks = document.querySelectorAll('.file-check');

        // When folder checked -> check all its files
        folderChecks.forEach(fc => {
            fc.addEventListener('change', (e) => {
                const folderId = e.target.getAttribute('data-id');
                const isChecked = e.target.checked;
                document.querySelectorAll(`.file-check[data-folder-id="${folderId}"]`).forEach(cb => {
                    cb.checked = isChecked;
                });
                updateContextIndicator();
            });
        });

        // When file checked -> update context
        fileChecks.forEach(fc => {
            fc.addEventListener('change', (e) => {
                const folderId = e.target.getAttribute('data-folder-id');
                if (folderId) {
                    const folderCheck = document.querySelector(`.folder-check[data-id="${folderId}"]`);
                    const allFolderFiles = document.querySelectorAll(`.file-check[data-folder-id="${folderId}"]`);
                    const allChecked = Array.from(allFolderFiles).every(cb => cb.checked);
                    if (folderCheck) folderCheck.checked = allChecked;
                }
                updateContextIndicator();
            });
        });
    }

    function getSelectedContext() {
        const selectedFolders = [];
        const selectedFiles = [];

        document.querySelectorAll('.folder-check:checked').forEach(cb => {
            selectedFolders.push(parseInt(cb.getAttribute('data-id')));
        });

        document.querySelectorAll('.file-check:checked').forEach(cb => {
            const folderId = cb.getAttribute('data-folder-id');
            // Only add file specifically if its parent folder is NOT checked
            if (!folderId || !document.querySelector(`.folder-check[data-id="${folderId}"]`).checked) {
                selectedFiles.push(parseInt(cb.getAttribute('data-id')));
            }
        });

        return { selectedFolders, selectedFiles };
    }

    function updateContextIndicator() {
        const ctx = getSelectedContext();
        let total = ctx.selectedFolders.length + ctx.selectedFiles.length;
        if (total === 0) {
            contextIndicator.textContent = "Global Context";
            contextIndicator.className = "text-xs text-primary font-medium px-3 py-1 bg-primary/10 rounded-full border border-primary/20";
        } else {
            contextIndicator.textContent = `${total} Filter(s) Active`;
            contextIndicator.className = "text-xs text-yellow-400 font-medium px-3 py-1 bg-yellow-400/10 rounded-full border border-yellow-400/20";
        }
    }

    // --- Folder Creation ---
    newFolderBtn.addEventListener('click', () => {
        folderModal.classList.remove('hidden');
        folderNameInput.focus();
    });

    cancelFolderBtn.addEventListener('click', () => {
        folderModal.classList.add('hidden');
        folderNameInput.value = '';
    });

    createFolderSubmit.addEventListener('click', async () => {
        const name = folderNameInput.value.trim();
        if (!name) return;

        try {
            const res = await apiFetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                folderModal.classList.add('hidden');
                folderNameInput.value = '';
                renderTree();
            }
        } catch (e) { alert(e.message); }
    });

    // --- File Upload Logic ---
    rootUploadArea.addEventListener('click', () => {
        currentUploadFolderId = null;
        rootFileInput.click();
    });

    rootFileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFileUpload(e.target.files[0], null);
    });

    folderFileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFileUpload(e.target.files[0], currentUploadFolderId);
    });

    async function handleFileUpload(file, folderId) {
        if (!document.getElementById('pineconeKey').value || !document.getElementById('hfKey').value) {
            alert('Please configure API keys in settings first.');
            openSettings();
            return;
        }

        const maxSizeBytes = 4.5 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            alert('File is too large. Maximum size is 4.5MB.');
            return;
        }

        uploadStatus.classList.remove('hidden');
        uploadSpinner.className = 'fa-solid fa-circle-notch fa-spin text-primary';
        uploadStatusText.textContent = `Uploading ${file.name}...`;

        const formData = new FormData();
        formData.append('file', file);
        if (folderId) formData.append('folder_id', folderId);

        try {
            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: formData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Upload failed');

            uploadSpinner.className = 'fa-solid fa-check text-green-500';
            uploadStatusText.textContent = 'Embedded successfully!';

            renderTree();
            setTimeout(() => { uploadStatus.classList.add('hidden'); }, 3000);

        } catch (error) {
            uploadSpinner.className = 'fa-solid fa-xmark text-red-500';
            uploadStatusText.textContent = `Error: ${error.message}`;
            setTimeout(() => { uploadStatus.classList.add('hidden'); }, 4000);
        }
    }

    // --- Chat Logic ---
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim() !== '') sendBtn.removeAttribute('disabled');
        else sendBtn.setAttribute('disabled', 'true');
    });

    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex gap-4 max-w-3xl mx-auto w-full message-enter';

        if (isUser) {
            messageDiv.innerHTML = `
                <div class="flex-1 bg-primary/10 rounded-2xl p-5 shadow-sm border border-primary/20 text-gray-200 ml-10">
                    <p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                </div>
                <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shrink-0 shadow-lg">
                    <i class="fa-solid fa-user text-gray-300"></i>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg">
                    <i class="fa-solid fa-robot text-white"></i>
                </div>
                <div class="flex-1 bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-700 text-gray-200 prose prose-invert">
                    ${marked.parse(text)}
                </div>
            `;
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addTypingIndicator() {
        const id = 'typing-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = id;
        messageDiv.className = 'flex gap-4 max-w-3xl mx-auto w-full message-enter';
        messageDiv.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg">
                <i class="fa-solid fa-robot text-white"></i>
            </div>
            <div class="bg-gray-800 rounded-2xl py-3 px-5 shadow-sm border border-gray-700 flex items-center gap-1">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    }

    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        addMessage(text, true);
        const typingId = addTypingIndicator();

        const ctx = getSelectedContext();

        try {
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    message: text,
                    selected_folders: ctx.selectedFolders,
                    selected_files: ctx.selectedFiles
                })
            });

            const data = await response.json();
            const el = document.getElementById(typingId);
            if (el) el.remove();

            if (!response.ok) throw new Error(data.detail || 'Chat request failed');

            let answerText = data.answer;
            if (data.sources && data.sources.length > 0) {
                const uniqueSources = data.sources.filter(s => s !== "Unknown");
                if (uniqueSources.length > 0) {
                    answerText += `\n\n*Sources: ${uniqueSources.join(', ')}*`;
                }
            }

            addMessage(answerText, false);

        } catch (error) {
            const el = document.getElementById(typingId);
            if (el) el.remove();
            addMessage(`**Error:** ${error.message}`, false);
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});



document.addEventListener('DOMContentLoaded', () => {
    let authToken = localStorage.getItem('authToken');
    let userName = localStorage.getItem('userName');

    // UI Elements
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authToggleBtn = document.getElementById('authToggleBtn');
    const authToggleText = document.getElementById('authToggleText');
    const authError = document.getElementById('authError');
    const logoutBtn = document.getElementById('logoutBtn');

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsContent = document.getElementById('settingsContent');
    const closeSettings = document.getElementById('closeSettings');
    const saveSettings = document.getElementById('saveSettings');

    const rootUploadArea = document.getElementById('rootUploadArea');
    const rootFileInput = document.getElementById('rootFileInput');
    const folderFileInput = document.getElementById('folderFileInput');

    const uploadStatus = document.getElementById('uploadStatus');
    const uploadStatusText = document.getElementById('uploadStatusText');
    const uploadSpinner = document.getElementById('uploadSpinner');

    const fileTree = document.getElementById('fileTree');
    const newFolderBtn = document.getElementById('newFolderBtn');
    const folderModal = document.getElementById('folderModal');
    const folderNameInput = document.getElementById('folderNameInput');
    const cancelFolderBtn = document.getElementById('cancelFolderBtn');
    const createFolderSubmit = document.getElementById('createFolderSubmit');

    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const contextIndicator = document.getElementById('contextIndicator');
    const userNameDisplay = document.getElementById('userNameDisplay');

    const authNameFields = document.getElementById('authNameFields');
    const authFirstName = document.getElementById('authFirstName');
    const authLastName = document.getElementById('authLastName');

    // Mobile Sidebar Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    let isLogin = true;
    let currentUploadFolderId = null;

    // --- Authentication ---
    if (!authToken) {
        authModal.classList.remove('hidden');
    } else {
        loadAppData();
        displayUserName();
    }

    authToggleBtn.addEventListener('click', () => {
        isLogin = !isLogin;
        authTitle.textContent = isLogin ? 'Login' : 'Sign Up';
        authToggleText.textContent = isLogin ? "Don't have an account?" : "Already have an account?";
        authToggleBtn.textContent = isLogin ? 'Sign Up' : 'Login';
        authError.classList.add('hidden');

        if (isLogin) {
            authNameFields.classList.add('hidden');
            authFirstName.removeAttribute('required');
            authLastName.removeAttribute('required');
            document.querySelector('#authForm button[type="submit"]').textContent = 'Login';
        } else {
            authNameFields.classList.remove('hidden');
            authFirstName.setAttribute('required', 'true');
            authLastName.setAttribute('required', 'true');
            document.querySelector('#authForm button[type="submit"]').textContent = 'Sign Up';
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const first_name = authFirstName.value;
        const last_name = authLastName.value;

        const endpoint = isLogin ? '/api/login' : '/api/signup';
        const payload = isLogin ? { email, password } : { email, password, first_name, last_name };

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                let errorMsg = 'Authentication failed';
                try {
                    // Clone response before reading to avoid stream exhaustion
                    const contentType = res.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await res.json();
                        errorMsg = data.detail || errorMsg;
                    }
                } catch (err) {
                    console.error('[AUTH] Error parsing error response:', err);
                }
                throw new Error(errorMsg);
            }

            const data = await res.json();
            authToken = data.token;
            userName = data.name;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('userName', userName);
            authModal.classList.add('hidden');
            loadAppData();
            displayUserName();
        } catch (err) {
            authError.textContent = err.message;
            authError.classList.remove('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        location.reload();
    });

    // --- API Helpers ---
    async function apiFetch(url, options = {}) {
        if (!options.headers) options.headers = {};
        options.headers['Authorization'] = `Bearer ${authToken}`;
        const res = await fetch(url, options);
        // Only auto-logout on 401 for critical endpoints like /api/data or /api/chat
        // Don't auto-logout for settings as it may fail due to other reasons
        if (res.status === 401 && (url.includes('/api/data') || url.includes('/api/chat') || url.includes('/api/upload'))) {
            console.error('[AUTH] 401 on critical endpoint:', url);
            localStorage.removeItem('authToken');
            location.reload();
        }
        return res;
    }

    // --- Load Data ---
    async function loadAppData() {
        await fetchSettings();
        await renderTree();
    }

    // --- Display User Name ---
    function displayUserName() {
        if (userName) {
            userNameDisplay.innerHTML = `<i class="fa-solid fa-user text-primary mr-2"></i><span class="font-medium">${userName}</span>`;
        }
    }

    // --- Settings ---
    async function fetchSettings() {
        try {
            const res = await apiFetch('/api/settings');
            if (res.status === 401) {
                console.error('[SETTINGS] 401 Unauthorized - Token may be invalid');
                localStorage.removeItem('authToken');
                location.reload();
                return;
            }
            if (!res.ok) {
                console.error('[SETTINGS] Error:', res.status, res.statusText);
                return;
            }

            // Safely parse JSON only if response is ok and has content
            let data;
            try {
                const text = await res.text();
                if (text) {
                    data = JSON.parse(text);
                } else {
                    console.error('[SETTINGS] Empty response body');
                    return;
                }
            } catch (parseErr) {
                console.error('[SETTINGS] Failed to parse response:', parseErr);
                return;
            }

            document.getElementById('openrouterKey').value = data.openrouter_key || '';
            document.getElementById('openrouterModel').value = data.openrouter_model || 'openai/gpt-4o';
            document.getElementById('hfKey').value = data.hf_key || '';
            document.getElementById('pineconeKey').value = data.pinecone_key || '';
            document.getElementById('pineconeIndex').value = data.pinecone_index || '';

            if (!data.pinecone_key || !data.hf_key) {
                setTimeout(openSettings, 1000);
            }
        } catch (e) { console.error('[SETTINGS] Exception:', e); }
    }

    function openSettings() {
        settingsModal.classList.remove('hidden');
        setTimeout(() => {
            settingsContent.classList.remove('scale-95', 'opacity-0');
            settingsContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    }

    function closeSettingsModal() {
        settingsContent.classList.remove('scale-100', 'opacity-100');
        settingsContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { settingsModal.classList.add('hidden'); }, 200);
    }

    settingsBtn.addEventListener('click', openSettings);
    closeSettings.addEventListener('click', closeSettingsModal);

    saveSettings.addEventListener('click', async () => {
        const payload = {
            openrouter_key: document.getElementById('openrouterKey').value,
            openrouter_model: document.getElementById('openrouterModel').value,
            hf_key: document.getElementById('hfKey').value,
            pinecone_key: document.getElementById('pineconeKey').value,
            pinecone_index: document.getElementById('pineconeIndex').value
        };
        try {
            const res = await apiFetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) closeSettingsModal();
            else alert('Failed to save settings');
        } catch (e) { alert(e.message); }
    });

    // --- File Explorer & Checkboxes ---
    async function renderTree() {
        try {
            const res = await apiFetch('/api/data');
            const data = await res.json();
            if (!res.ok) return;

            fileTree.innerHTML = '';

            // Render Folders
            data.folders.forEach(folder => {
                const folderDiv = document.createElement('div');
                folderDiv.className = 'mb-2';

                // Folder Header
                const header = document.createElement('div');
                header.className = 'flex items-center justify-between py-1 px-2 hover:bg-gray-700/50 rounded-lg group';

                const leftPart = document.createElement('div');
                leftPart.className = 'flex items-center gap-2';
                leftPart.innerHTML = `
                    <input type="checkbox" class="folder-check w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-gray-800" data-id="${folder.id}">
                    <i class="fa-solid fa-folder text-yellow-500"></i>
                    <span class="font-medium">${folder.name}</span>
                `;

                const rightPart = document.createElement('div');
                rightPart.className = 'flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity';

                const uploadBtn = document.createElement('button');
                uploadBtn.className = 'text-gray-500 hover:text-primary';
                uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i>';
                uploadBtn.title = "Upload file to folder";
                uploadBtn.onclick = () => {
                    currentUploadFolderId = folder.id;
                    folderFileInput.click();
                };

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'text-gray-500 hover:text-red-500';
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                deleteBtn.title = "Delete folder";
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete folder "${folder.name}"?`)) {
                        deleteFolder(folder.id);
                    }
                };

                rightPart.appendChild(uploadBtn);
                rightPart.appendChild(deleteBtn);

                header.appendChild(leftPart);
                header.appendChild(rightPart);
                folderDiv.appendChild(header);

                // Folder Files
                const folderFiles = data.files.filter(f => f.folder_id === folder.id);
                if (folderFiles.length > 0) {
                    const filesContainer = document.createElement('div');
                    filesContainer.className = 'pl-6 space-y-1 mt-1 border-l border-gray-700 ml-3';
                    folderFiles.forEach(file => {
                        const fileDiv = document.createElement('div');
                        fileDiv.className = 'flex items-center justify-between gap-2 py-1 px-2 hover:bg-gray-700/50 rounded-lg group';

                        const leftPart = document.createElement('div');
                        leftPart.className = 'flex items-center gap-2 flex-1';
                        leftPart.innerHTML = `
                            <input type="checkbox" class="file-check w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-gray-800" data-id="${file.id}" data-folder-id="${folder.id}">
                            <i class="fa-solid fa-file-lines text-gray-400"></i>
                            <span class="truncate text-xs text-gray-300">${file.filename}</span>
                        `;

                        const deleteFileBtn = document.createElement('button');
                        deleteFileBtn.className = 'text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto';
                        deleteFileBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                        deleteFileBtn.title = "Delete file";
                        deleteFileBtn.onclick = (e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${file.filename}"?`)) {
                                deleteFile(file.id);
                            }
                        };

                        fileDiv.appendChild(leftPart);
                        fileDiv.appendChild(deleteFileBtn);
                        filesContainer.appendChild(fileDiv);
                    });
                    folderDiv.appendChild(filesContainer);
                }

                fileTree.appendChild(folderDiv);
            });

            // Render Root Files
            const rootFiles = data.files.filter(f => !f.folder_id);
            if (rootFiles.length > 0) {
                const rootDiv = document.createElement('div');
                rootDiv.className = 'mt-4 pt-2 border-t border-gray-700 space-y-1';
                rootFiles.forEach(file => {
                    const fileDiv = document.createElement('div');
                    fileDiv.className = 'flex items-center justify-between gap-2 py-1 px-2 hover:bg-gray-700/50 rounded-lg group';

                    const leftPart = document.createElement('div');
                    leftPart.className = 'flex items-center gap-2 flex-1';
                    leftPart.innerHTML = `
                        <input type="checkbox" class="file-check w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-gray-800" data-id="${file.id}">
                        <i class="fa-solid fa-file-lines text-gray-400"></i>
                        <span class="truncate text-xs text-gray-300">${file.filename}</span>
                    `;

                    const deleteFileBtn = document.createElement('button');
                    deleteFileBtn.className = 'text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto';
                    deleteFileBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                    deleteFileBtn.title = "Delete file";
                    deleteFileBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${file.filename}"?`)) {
                            deleteFile(file.id);
                        }
                    };

                    fileDiv.appendChild(leftPart);
                    fileDiv.appendChild(deleteFileBtn);
                    rootDiv.appendChild(fileDiv);
                });
                fileTree.appendChild(rootDiv);
            }

            attachCheckboxLogic();

        } catch (e) { console.error(e); }
    }

    // --- Delete Functions ---
    async function deleteFile(fileId) {
        try {
            const res = await apiFetch(`/api/files/${fileId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                renderTree();
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.detail || 'Failed to delete file'}`);
            }
        } catch (e) {
            alert(`Error deleting file: ${e.message}`);
        }
    }

    async function deleteFolder(folderId) {
        try {
            const res = await apiFetch(`/api/folders/${folderId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                renderTree();
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.detail || 'Failed to delete folder'}`);
            }
        } catch (e) {
            alert(`Error deleting folder: ${e.message}`);
        }
    }

    function attachCheckboxLogic() {
        const folderChecks = document.querySelectorAll('.folder-check');
        const fileChecks = document.querySelectorAll('.file-check');

        // When folder checked -> check all its files
        folderChecks.forEach(fc => {
            fc.addEventListener('change', (e) => {
                const folderId = e.target.getAttribute('data-id');
                const isChecked = e.target.checked;
                document.querySelectorAll(`.file-check[data-folder-id="${folderId}"]`).forEach(cb => {
                    cb.checked = isChecked;
                });
                updateContextIndicator();
            });
        });

        // When file checked -> update context
        fileChecks.forEach(fc => {
            fc.addEventListener('change', (e) => {
                const folderId = e.target.getAttribute('data-folder-id');
                if (folderId) {
                    const folderCheck = document.querySelector(`.folder-check[data-id="${folderId}"]`);
                    const allFolderFiles = document.querySelectorAll(`.file-check[data-folder-id="${folderId}"]`);
                    const allChecked = Array.from(allFolderFiles).every(cb => cb.checked);
                    if (folderCheck) folderCheck.checked = allChecked;
                }
                updateContextIndicator();
            });
        });
    }

    function getSelectedContext() {
        const selectedFolders = [];
        const selectedFiles = [];

        document.querySelectorAll('.folder-check:checked').forEach(cb => {
            selectedFolders.push(parseInt(cb.getAttribute('data-id')));
        });

        document.querySelectorAll('.file-check:checked').forEach(cb => {
            const folderId = cb.getAttribute('data-folder-id');
            // Only add file specifically if its parent folder is NOT checked
            if (!folderId || !document.querySelector(`.folder-check[data-id="${folderId}"]`).checked) {
                selectedFiles.push(parseInt(cb.getAttribute('data-id')));
            }
        });

        return { selectedFolders, selectedFiles };
    }

    function updateContextIndicator() {
        const ctx = getSelectedContext();
        let total = ctx.selectedFolders.length + ctx.selectedFiles.length;
        if (total === 0) {
            contextIndicator.textContent = "Global Context";
            contextIndicator.className = "text-xs text-primary font-medium px-3 py-1 bg-primary/10 rounded-full border border-primary/20";
        } else {
            contextIndicator.textContent = `${total} Filter(s) Active`;
            contextIndicator.className = "text-xs text-yellow-400 font-medium px-3 py-1 bg-yellow-400/10 rounded-full border border-yellow-400/20";
        }
    }

    // --- Folder Creation ---
    newFolderBtn.addEventListener('click', () => {
        folderModal.classList.remove('hidden');
        folderNameInput.focus();
    });

    cancelFolderBtn.addEventListener('click', () => {
        folderModal.classList.add('hidden');
        folderNameInput.value = '';
    });

    createFolderSubmit.addEventListener('click', async () => {
        const name = folderNameInput.value.trim();
        if (!name) return;

        try {
            const res = await apiFetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                folderModal.classList.add('hidden');
                folderNameInput.value = '';
                renderTree();
            }
        } catch (e) { alert(e.message); }
    });

    // --- File Upload Logic ---
    rootUploadArea.addEventListener('click', () => {
        currentUploadFolderId = null;
        rootFileInput.click();
    });

    rootFileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFileUpload(e.target.files[0], null);
    });

    folderFileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFileUpload(e.target.files[0], currentUploadFolderId);
    });

    async function handleFileUpload(file, folderId) {
        if (!document.getElementById('pineconeKey').value || !document.getElementById('hfKey').value) {
            alert('Please configure API keys in settings first.');
            openSettings();
            return;
        }

        const maxSizeBytes = 4.5 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            alert('File is too large. Maximum size is 4.5MB.');
            return;
        }

        uploadStatus.classList.remove('hidden');
        uploadSpinner.className = 'fa-solid fa-circle-notch fa-spin text-primary';
        uploadStatusText.textContent = `Uploading ${file.name}...`;

        const formData = new FormData();
        formData.append('file', file);
        if (folderId) formData.append('folder_id', folderId);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: formData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Upload failed');

            uploadSpinner.className = 'fa-solid fa-check text-green-500';
            uploadStatusText.textContent = 'Embedded successfully!';

            renderTree();
            setTimeout(() => { uploadStatus.classList.add('hidden'); }, 3000);

        } catch (error) {
            uploadSpinner.className = 'fa-solid fa-xmark text-red-500';
            uploadStatusText.textContent = `Error: ${error.message}`;
            setTimeout(() => { uploadStatus.classList.add('hidden'); }, 4000);
        }
    }

    // --- Chat Logic ---
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim() !== '') sendBtn.removeAttribute('disabled');
        else sendBtn.setAttribute('disabled', 'true');
    });

    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex gap-4 max-w-3xl mx-auto w-full message-enter';

        if (isUser) {
            messageDiv.innerHTML = `
                <div class="flex-1 bg-primary/10 rounded-2xl p-5 shadow-sm border border-primary/20 text-gray-200 ml-10">
                    <p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                </div>
                <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shrink-0 shadow-lg">
                    <i class="fa-solid fa-user text-gray-300"></i>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg">
                    <i class="fa-solid fa-robot text-white"></i>
                </div>
                <div class="flex-1 bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-700 text-gray-200 prose prose-invert">
                    ${marked.parse(text)}
                </div>
            `;
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addTypingIndicator() {
        const id = 'typing-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = id;
        messageDiv.className = 'flex gap-4 max-w-3xl mx-auto w-full message-enter';
        messageDiv.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg">
                <i class="fa-solid fa-robot text-white"></i>
            </div>
            <div class="bg-gray-800 rounded-2xl py-3 px-5 shadow-sm border border-gray-700 flex items-center gap-1">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    }

    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        addMessage(text, true);
        const typingId = addTypingIndicator();

        const ctx = getSelectedContext();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    message: text,
                    selected_folders: ctx.selectedFolders,
                    selected_files: ctx.selectedFiles
                })
            });

            const data = await response.json();
            const el = document.getElementById(typingId);
            if (el) el.remove();

            if (!response.ok) throw new Error(data.detail || 'Chat request failed');

            let answerText = data.answer;
            if (data.sources && data.sources.length > 0) {
                const uniqueSources = data.sources.filter(s => s !== "Unknown");
                if (uniqueSources.length > 0) {
                    answerText += `\n\n*Sources: ${uniqueSources.join(', ')}*`;
                }
            }

            addMessage(answerText, false);

        } catch (error) {
            const el = document.getElementById(typingId);
            if (el) el.remove();
            addMessage(`**Error:** ${error.message}`, false);
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});