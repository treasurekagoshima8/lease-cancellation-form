/**
 * Form handling and validation
 */

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('cancellation-form');
    const submitBtn = document.getElementById('submit-btn');
    const pdfBtn = document.getElementById('pdf-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const successModal = document.getElementById('success-modal');
    const closeModalBtn = document.getElementById('close-modal');

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('application-date').value = today;

    // Handle "Other" reason visibility
    const cancelReasonRadios = document.querySelectorAll('input[name="cancelReason"]');
    const otherReasonGroup = document.getElementById('other-reason-group');

    cancelReasonRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            otherReasonGroup.style.display = this.value === 'その他' ? 'block' : 'none';
        });
    });

    // Handle phone type "Other" visibility
    const phoneTypeSelect = document.getElementById('phone-type');
    const phoneOtherGroup = document.getElementById('phone-other-group');

    phoneTypeSelect.addEventListener('change', function() {
        phoneOtherGroup.style.display = this.value === 'その他' ? 'block' : 'none';
    });

    // Handle mobile owner "Other" visibility
    const mobileOwnerSelect = document.getElementById('mobile-owner');
    const mobileOtherGroup = document.getElementById('mobile-other-group');

    mobileOwnerSelect.addEventListener('change', function() {
        mobileOtherGroup.style.display = this.value === 'その他' ? 'block' : 'none';
    });

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const formData = collectFormData();

        // Show loading
        loadingOverlay.style.display = 'flex';
        submitBtn.disabled = true;

        try {
            await submitToSpreadsheet(formData);

            // Hide loading, show success
            loadingOverlay.style.display = 'none';
            successModal.style.display = 'flex';
        } catch (error) {
            console.error('Submit error:', error);
            loadingOverlay.style.display = 'none';
            alert('送信に失敗しました。もう一度お試しください。');
        } finally {
            submitBtn.disabled = false;
        }
    });

    // PDF download
    pdfBtn.addEventListener('click', function() {
        if (!validateForm()) {
            return;
        }

        const formData = collectFormData();
        generatePDF(formData);
    });

    // Close modal
    closeModalBtn.addEventListener('click', function() {
        successModal.style.display = 'none';
        form.reset();
        document.getElementById('application-date').value = today;
    });

    // Close modal on backdrop click
    successModal.addEventListener('click', function(e) {
        if (e.target === successModal) {
            successModal.style.display = 'none';
            form.reset();
            document.getElementById('application-date').value = today;
        }
    });

    // Load settings and apply visibility
    loadSettings();
});

/**
 * Validate form inputs
 */
function validateForm() {
    const form = document.getElementById('cancellation-form');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    let firstInvalidField = null;

    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    requiredFields.forEach(field => {
        if (field.type === 'radio') {
            const radioGroup = form.querySelectorAll(`input[name="${field.name}"]`);
            const isChecked = Array.from(radioGroup).some(r => r.checked);
            if (!isChecked) {
                isValid = false;
                if (!firstInvalidField) {
                    firstInvalidField = field;
                }
                showError(field.closest('.form-group'), '選択してください');
            }
        } else if (!field.value.trim()) {
            isValid = false;
            if (!firstInvalidField) {
                firstInvalidField = field;
            }
            field.classList.add('input-error');
            showError(field, '入力してください');
        }
    });

    // Validate account number (numeric only)
    const accountNumber = document.getElementById('account-number');
    if (accountNumber.value && !/^\d+$/.test(accountNumber.value)) {
        isValid = false;
        if (!firstInvalidField) {
            firstInvalidField = accountNumber;
        }
        showError(accountNumber, '数字のみ入力してください');
    }

    // Validate postal code format (000-0000 or 0000000)
    const postalCode = document.getElementById('new-postal-code');
    if (postalCode.value && !/^\d{3}-?\d{4}$/.test(postalCode.value)) {
        isValid = false;
        if (!firstInvalidField) {
            firstInvalidField = postalCode;
        }
        postalCode.classList.add('input-error');
        showError(postalCode, '正しい郵便番号を入力してください（例: 123-4567）');
    }

    // Validate phone number format
    const phoneNumber = document.getElementById('phone-number');
    if (phoneNumber.value && !/^[\d\-()]+$/.test(phoneNumber.value)) {
        isValid = false;
        if (!firstInvalidField) {
            firstInvalidField = phoneNumber;
        }
        phoneNumber.classList.add('input-error');
        showError(phoneNumber, '正しい電話番号を入力してください');
    }

    // Validate mobile number format
    const mobileNumber = document.getElementById('mobile-number');
    if (mobileNumber.value && !/^[\d\-()]+$/.test(mobileNumber.value)) {
        isValid = false;
        if (!firstInvalidField) {
            firstInvalidField = mobileNumber;
        }
        mobileNumber.classList.add('input-error');
        showError(mobileNumber, '正しい携帯番号を入力してください');
    }

    // Scroll to first error
    if (firstInvalidField) {
        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return isValid;
}

/**
 * Show error message below a field
 */
function showError(field, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    if (field.classList.contains('form-group')) {
        field.appendChild(errorDiv);
    } else {
        field.parentNode.appendChild(errorDiv);
    }
}

/**
 * Collect all form data into an object
 */
function collectFormData() {
    const form = document.getElementById('cancellation-form');
    const formData = new FormData(form);
    const data = {};

    // Convert FormData to object
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }

    // Handle cancel reason with "other"
    if (data.cancelReason === 'その他' && data.otherReason) {
        data.cancelReasonDisplay = `その他（${data.otherReason}）`;
    } else {
        data.cancelReasonDisplay = data.cancelReason;
    }

    // Handle phone type with "other"
    if (data.phoneType === 'その他' && data.phoneOther) {
        data.phoneTypeDisplay = data.phoneOther;
    } else {
        data.phoneTypeDisplay = data.phoneType;
    }

    // Handle mobile owner with "other"
    if (data.mobileOwner === 'その他' && data.mobileOther) {
        data.mobileOwnerDisplay = data.mobileOther;
    } else {
        data.mobileOwnerDisplay = data.mobileOwner;
    }

    // Format inspection time
    if (data.inspectionHour && data.inspectionMinute) {
        data.inspectionTime = `${data.inspectionHour}時${data.inspectionMinute}分`;
    } else if (data.inspectionHour) {
        data.inspectionTime = `${data.inspectionHour}時`;
    } else {
        data.inspectionTime = '';
    }

    // Add timestamp
    data.submittedAt = new Date().toISOString();

    return data;
}

/**
 * Load settings and apply field visibility
 */
async function loadSettings() {
    try {
        const settings = await getSettings();
        if (settings && settings.fieldVisibility) {
            applyFieldVisibility(settings.fieldVisibility);
        }
        if (settings && settings.cancelReasons) {
            updateCancelReasons(settings.cancelReasons);
        }
        if (settings && settings.phoneTypes) {
            updateSelectOptions('phone-type', settings.phoneTypes);
        }
        if (settings && settings.mobileOwners) {
            updateSelectOptions('mobile-owner', settings.mobileOwners);
        }
    } catch (error) {
        console.log('Using default settings');
    }
}

/**
 * Apply field visibility settings
 */
function applyFieldVisibility(visibility) {
    for (const [fieldId, isVisible] of Object.entries(visibility)) {
        const field = document.getElementById(fieldId);
        if (field) {
            const formGroup = field.closest('.form-group');
            if (formGroup) {
                formGroup.style.display = isVisible ? '' : 'none';
                // Remove required if hidden
                if (!isVisible) {
                    field.removeAttribute('required');
                }
            }
        }
    }
}

/**
 * Update cancel reason options
 */
function updateCancelReasons(reasons) {
    const container = document.getElementById('cancel-reason-group');
    if (!container || !reasons || reasons.length === 0) return;

    container.innerHTML = '';

    reasons.forEach((reason, index) => {
        const label = document.createElement('label');
        label.className = 'radio-label';

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'cancelReason';
        input.value = reason;
        if (index === 0) input.required = true;

        const span = document.createElement('span');
        span.textContent = reason;

        label.appendChild(input);
        label.appendChild(span);
        container.appendChild(label);
    });

    // Re-attach event listener for "Other"
    const cancelReasonRadios = container.querySelectorAll('input[name="cancelReason"]');
    const otherReasonGroup = document.getElementById('other-reason-group');

    cancelReasonRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            otherReasonGroup.style.display = this.value === 'その他' ? 'block' : 'none';
        });
    });
}

/**
 * Update select element options
 */
function updateSelectOptions(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select || !options || options.length === 0) return;

    const currentValue = select.value;
    select.innerHTML = '';

    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
    });

    // Restore previous value if it exists in new options
    if (options.includes(currentValue)) {
        select.value = currentValue;
    }
}
