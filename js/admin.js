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
            info.style.cursor = 'pointer';
            info.addEventListener('click', function() {
                showSubmissionDetail(submission);
            });

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

            const btnGroup = document.createElement('div');
            btnGroup.className = 'btn-group';

            const detailBtn = document.createElement('button');
            detailBtn.type = 'button';
            detailBtn.className = 'btn btn-secondary';
            detailBtn.textContent = '詳細';
            detailBtn.addEventListener('click', function() {
                showSubmissionDetail(submission);
            });

            const pdfBtn = document.createElement('button');
            pdfBtn.type = 'button';
            pdfBtn.className = 'btn btn-primary';
            pdfBtn.textContent = 'PDF';
            pdfBtn.addEventListener('click', function() {
                generatePDF(submission);
            });

            btnGroup.appendChild(detailBtn);
            btnGroup.appendChild(pdfBtn);

            item.appendChild(info);
            item.appendChild(btnGroup);
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading submissions:', error);
        container.innerHTML = '<p class="no-data-text">データの読み込みに失敗しました</p>';
    }
}

// Store current submission for PDF download from detail modal
let currentDetailSubmission = null;

/**
 * Show submission detail modal
 */
function showSubmissionDetail(submission) {
    currentDetailSubmission = submission;
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('detail-content');

    // Format inspection time if needed
    let inspectionTimeDisplay = '';
    if (submission.inspectionTime) {
        const timeVal = String(submission.inspectionTime);
        const excelDateMatch = timeVal.match(/^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}\s+(\d{1,2}:\d{2})/);
        if (excelDateMatch) {
            const timeParts = excelDateMatch[1].split(':');
            const hour = parseInt(timeParts[0], 10);
            const minute = timeParts[1];
            inspectionTimeDisplay = `${hour}時${minute}分`;
        } else if (!/^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(timeVal) && timeVal.trim()) {
            inspectionTimeDisplay = timeVal;
        }
    }

    content.innerHTML = `
        <div class="detail-section">
            <h4>貸主・借主情報</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">貸主住所</span>
                    <span class="detail-value">${submission.landlordAddress || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">貸主氏名</span>
                    <span class="detail-value">${submission.landlordName || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">借主住所</span>
                    <span class="detail-value">${submission.tenantAddress || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">借主氏名</span>
                    <span class="detail-value">${submission.tenantName || '-'}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>解約申込物件</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">物件名</span>
                    <span class="detail-value">${submission.propertyName || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">所在地</span>
                    <span class="detail-value">${submission.propertyAddress || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">部屋番号</span>
                    <span class="detail-value">${submission.roomNumber || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">駐車番号</span>
                    <span class="detail-value">${submission.parkingNumber || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">契約者氏名</span>
                    <span class="detail-value">${submission.contractorName || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">解約申込日</span>
                    <span class="detail-value">${submission.applicationDate || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">解約希望日</span>
                    <span class="detail-value">${submission.cancellationDate || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">立会希望日</span>
                    <span class="detail-value">${submission.inspectionDate || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">立会希望時間</span>
                    <span class="detail-value">${inspectionTimeDisplay || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">解約事由</span>
                    <span class="detail-value">${submission.cancelReasonDisplay || '-'}</span>
                </div>
                <div class="detail-item full-width">
                    <span class="detail-label">備考</span>
                    <span class="detail-value">${submission.remarks || '-'}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>精算金振込み口座</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">金融機関名</span>
                    <span class="detail-value">${submission.bankName || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">金融機関種別</span>
                    <span class="detail-value">${submission.bankType || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">支店名</span>
                    <span class="detail-value">${submission.branchName || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">口座種別</span>
                    <span class="detail-value">${submission.accountType || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">口座番号</span>
                    <span class="detail-value">${submission.accountNumber || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">口座名義（カナ）</span>
                    <span class="detail-value">${submission.accountHolderKana || '-'}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>転居先住所</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">郵便番号</span>
                    <span class="detail-value">${submission.newPostalCode || '-'}</span>
                </div>
                <div class="detail-item full-width">
                    <span class="detail-label">住所</span>
                    <span class="detail-value">${submission.newAddress || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">送付先氏名</span>
                    <span class="detail-value">${submission.recipientName || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">電話番号</span>
                    <span class="detail-value">${submission.phoneNumber || '-'} ${submission.phoneTypeDisplay || ''}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">携帯電話</span>
                    <span class="detail-value">${submission.mobileNumber || '-'} ${submission.mobileOwnerDisplay ? '(' + submission.mobileOwnerDisplay + ')' : ''}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <div class="detail-item">
                <span class="detail-label">申込日時</span>
                <span class="detail-value">${submission.submittedAt || '-'}</span>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// Initialize detail modal event listeners
document.addEventListener('DOMContentLoaded', function() {
    const detailModal = document.getElementById('detail-modal');
    const detailPdfBtn = document.getElementById('detail-pdf-btn');

    // Close detail modal buttons
    document.querySelectorAll('.close-detail-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            detailModal.style.display = 'none';
            currentDetailSubmission = null;
        });
    });

    // Close on backdrop click
    detailModal.addEventListener('click', function(e) {
        if (e.target === detailModal) {
            detailModal.style.display = 'none';
            currentDetailSubmission = null;
        }
    });

    // PDF download from detail modal
    detailPdfBtn.addEventListener('click', function() {
        if (currentDetailSubmission) {
            generatePDF(currentDetailSubmission);
        }
    });
});
