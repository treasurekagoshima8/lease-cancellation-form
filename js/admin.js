/**
 * Admin page functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    const loginScreen = document.getElementById('login-screen');
    const adminScreen = document.getElementById('admin-screen');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const settingsForm = document.getElementById('settings-form');
    const passwordForm = document.getElementById('password-form');
    const loadingOverlay = document.getElementById('loading-overlay');
    const successModal = document.getElementById('success-modal');
    const successMessage = document.getElementById('success-message');
    const closeModalBtn = document.getElementById('close-modal');

    // Check if already logged in
    if (sessionStorage.getItem('admin-logged-in') === 'true') {
        showAdminScreen();
    }

    // Login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const password = document.getElementById('password').value;
        loginError.style.display = 'none';

        loadingOverlay.style.display = 'flex';

        try {
            const isValid = await verifyPassword(password);

            if (isValid) {
                sessionStorage.setItem('admin-logged-in', 'true');
                sessionStorage.setItem('admin-password', password);
                showAdminScreen();
            } else {
                loginError.textContent = 'パスワードが正しくありません';
                loginError.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = 'ログインに失敗しました';
            loginError.style.display = 'block';
        } finally {
            loadingOverlay.style.display = 'none';
        }
    });

    // Logout button
    logoutBtn.addEventListener('click', function() {
        sessionStorage.removeItem('admin-logged-in');
        sessionStorage.removeItem('admin-password');
        loginScreen.style.display = 'block';
        adminScreen.style.display = 'none';
        document.getElementById('password').value = '';
    });

    // Settings form submission
    settingsForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const settings = collectSettings();

        loadingOverlay.style.display = 'flex';

        try {
            await saveSettings(settings);

            // Also save to localStorage as backup
            localStorage.setItem('cancellation-form-settings', JSON.stringify(settings));

            successMessage.textContent = '設定を保存しました。';
            successModal.style.display = 'flex';
        } catch (error) {
            console.error('Save error:', error);
            alert('保存に失敗しました。もう一度お試しください。');
        } finally {
            loadingOverlay.style.display = 'none';
        }
    });

    // Password form submission
    passwordForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const passwordError = document.getElementById('password-error');

        passwordError.style.display = 'none';

        if (newPassword !== confirmPassword) {
            passwordError.textContent = '新しいパスワードが一致しません';
            passwordError.style.display = 'block';
            return;
        }

        if (newPassword.length < 4) {
            passwordError.textContent = 'パスワードは4文字以上で入力してください';
            passwordError.style.display = 'block';
            return;
        }

        loadingOverlay.style.display = 'flex';

        try {
            await changePassword(currentPassword, newPassword);

            successMessage.textContent = 'パスワードを変更しました。';
            successModal.style.display = 'flex';

            passwordForm.reset();
        } catch (error) {
            console.error('Password change error:', error);
            passwordError.textContent = 'パスワード変更に失敗しました';
            passwordError.style.display = 'block';
        } finally {
            loadingOverlay.style.display = 'none';
        }
    });

    // Close modal
    closeModalBtn.addEventListener('click', function() {
        successModal.style.display = 'none';
    });

    successModal.addEventListener('click', function(e) {
        if (e.target === successModal) {
            successModal.style.display = 'none';
        }
    });

    // Add buttons for editable lists
    document.getElementById('add-cancel-reason').addEventListener('click', function() {
        addListItem('cancel-reasons-list', '');
    });

    document.getElementById('add-phone-type').addEventListener('click', function() {
        addListItem('phone-types-list', '');
    });

    document.getElementById('add-mobile-owner').addEventListener('click', function() {
        addListItem('mobile-owners-list', '');
    });

    // Refresh submissions button
    document.getElementById('refresh-submissions').addEventListener('click', loadSubmissions);

    /**
     * Show admin screen and load settings
     */
    async function showAdminScreen() {
        loginScreen.style.display = 'none';
        adminScreen.style.display = 'block';

        // Load settings
        try {
            const settings = await getSettings();
            applySettingsToForm(settings);
        } catch (error) {
            console.error('Error loading settings:', error);
            // Use defaults
            applySettingsToForm(getDefaultSettings());
        }

        // Load submissions
        loadSubmissions();
    }

    /**
     * Apply settings to form controls
     */
    function applySettingsToForm(settings) {
        // Field visibility
        if (settings.fieldVisibility) {
            for (const [fieldId, isVisible] of Object.entries(settings.fieldVisibility)) {
                const checkbox = document.querySelector(`input[name="field-${fieldId}"]`);
                if (checkbox) {
                    checkbox.checked = isVisible;
                }
            }
        }

        // Cancel reasons
        const cancelReasonsList = document.getElementById('cancel-reasons-list');
        cancelReasonsList.innerHTML = '';
        const cancelReasons = settings.cancelReasons || ['帰省', '住替', '転勤', '卒業', 'その他'];
        cancelReasons.forEach(reason => {
            addListItem('cancel-reasons-list', reason);
        });

        // Phone types
        const phoneTypesList = document.getElementById('phone-types-list');
        phoneTypesList.innerHTML = '';
        const phoneTypes = settings.phoneTypes || ['自宅', '実家', '会社', 'その他'];
        phoneTypes.forEach(type => {
            addListItem('phone-types-list', type);
        });

        // Mobile owners
        const mobileOwnersList = document.getElementById('mobile-owners-list');
        mobileOwnersList.innerHTML = '';
        const mobileOwners = settings.mobileOwners || ['本人', '主人', '妻', 'その他'];
        mobileOwners.forEach(owner => {
            addListItem('mobile-owners-list', owner);
        });
    }

    /**
     * Collect settings from form
     */
    function collectSettings() {
        const settings = {
            fieldVisibility: {},
            cancelReasons: [],
            phoneTypes: [],
            mobileOwners: []
        };

        // Field visibility
        const fieldCheckboxes = document.querySelectorAll('#field-visibility-list input[type="checkbox"]');
        fieldCheckboxes.forEach(checkbox => {
            const fieldId = checkbox.name.replace('field-', '');
            settings.fieldVisibility[fieldId] = checkbox.checked;
        });

        // Cancel reasons
        document.querySelectorAll('#cancel-reasons-list input').forEach(input => {
            if (input.value.trim()) {
                settings.cancelReasons.push(input.value.trim());
            }
        });

        // Phone types
        document.querySelectorAll('#phone-types-list input').forEach(input => {
            if (input.value.trim()) {
                settings.phoneTypes.push(input.value.trim());
            }
        });

        // Mobile owners
        document.querySelectorAll('#mobile-owners-list input').forEach(input => {
            if (input.value.trim()) {
                settings.mobileOwners.push(input.value.trim());
            }
        });

        return settings;
    }
});

/**
 * Add an item to an editable list
 */
function addListItem(listId, value) {
    const list = document.getElementById(listId);
    const item = document.createElement('div');
    item.className = 'editable-item';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.placeholder = '入力してください';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger btn-icon';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', function() {
        item.remove();
    });

    item.appendChild(input);
    item.appendChild(deleteBtn);
    list.appendChild(item);
}

/**
 * Load and display submissions
 */
async function loadSubmissions() {
    const container = document.getElementById('submissions-list');
    container.innerHTML = '<p class="loading-text">読み込み中...</p>';

    try {
        // Get stored password for authentication
        const password = sessionStorage.getItem('admin-password') || '';
        const submissions = await getSubmissions(password);

        if (submissions.length === 0) {
            container.innerHTML = '<p class="no-data-text">申込データがありません</p>';
            return;
        }

        container.innerHTML = '';

        submissions.forEach(submission => {
            const item = document.createElement('div');
            item.className = 'submission-item';

            const info = document.createElement('div');
            info.className = 'submission-info';

            const name = document.createElement('div');
            name.className = 'name';
            name.textContent = submission.contractorName || '名前なし';

            const details = document.createElement('div');
            details.className = 'details';
            const date = submission.submittedAt || '';
            const property = submission.propertyName || '';
            details.textContent = `${date} / ${property}`;

            info.appendChild(name);
            info.appendChild(details);

            const pdfBtn = document.createElement('button');
            pdfBtn.type = 'button';
            pdfBtn.className = 'btn btn-primary';
            pdfBtn.textContent = 'PDF';
            pdfBtn.addEventListener('click', function() {
                generatePDF(submission);
            });

            item.appendChild(info);
            item.appendChild(pdfBtn);
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading submissions:', error);
        container.innerHTML = '<p class="no-data-text">データの読み込みに失敗しました</p>';
    }
}
