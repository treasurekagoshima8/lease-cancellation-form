/**
 * Google Spreadsheet API integration
 *
 * Setup Instructions:
 * 1. Create a Google Spreadsheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste the Apps Script code (provided in gas/main.gs)
 * 4. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 5. Copy the deployment URL and paste below
 */

// Replace with your Google Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbycdM9jRNurYWKWnDJLY-_BHQEIi62MvQ4hbKDxqoPSmAdMlEKGh3PGHZrYP8yP9nrhzQ/exec';

/**
 * Submit form data to Google Spreadsheet
 */
async function submitToSpreadsheet(data) {
    if (!API_URL) {
        console.warn('API_URL is not configured. Data will not be saved to spreadsheet.');
        // For testing without API, simulate success
        return new Promise(resolve => setTimeout(resolve, 1000));
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'submit',
            data: data
        })
    });

    // Note: no-cors mode doesn't allow reading response
    // We assume success if no error is thrown
    return true;
}

/**
 * Get settings from Google Spreadsheet
 */
async function getSettings() {
    if (!API_URL) {
        console.warn('API_URL is not configured. Using default settings.');
        return getDefaultSettings();
    }

    try {
        const response = await fetch(`${API_URL}?action=getSettings`, {
            method: 'GET',
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch settings');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching settings:', error);
        return getDefaultSettings();
    }
}

/**
 * Save settings to Google Spreadsheet
 */
async function saveSettings(settings) {
    if (!API_URL) {
        console.warn('API_URL is not configured. Settings will not be saved.');
        // Save to localStorage as fallback
        localStorage.setItem('cancellation-form-settings', JSON.stringify(settings));
        return true;
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'saveSettings',
            data: settings
        })
    });

    return true;
}

/**
 * Verify admin password
 */
async function verifyPassword(password) {
    if (!API_URL) {
        // For testing, use default password
        return password === 'admin123';
    }

    try {
        // Use POST for security (avoid password in URL)
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'verifyPassword',
                password: password
            })
        });

        if (!response.ok) {
            throw new Error('Failed to verify password');
        }

        const result = await response.json();
        return result.valid;
    } catch (error) {
        console.error('Error verifying password:', error);
        // Fallback to default password for testing
        return password === 'admin123';
    }
}

/**
 * Change admin password
 */
async function changePassword(currentPassword, newPassword) {
    if (!API_URL) {
        console.warn('API_URL is not configured. Password will not be changed.');
        return true;
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'changePassword',
            currentPassword: currentPassword,
            newPassword: newPassword
        })
    });

    return true;
}

/**
 * Get submissions from Google Spreadsheet (requires authentication)
 */
async function getSubmissions(password) {
    if (!API_URL) {
        console.warn('API_URL is not configured. Returning empty submissions.');
        return [];
    }

    try {
        // Use POST with password for authentication
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getSubmissions',
                password: password
            })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch submissions');
        }

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        return result;
    } catch (error) {
        console.error('Error fetching submissions:', error);
        return [];
    }
}

/**
 * Get default settings
 */
function getDefaultSettings() {
    // Try to get from localStorage first
    const stored = localStorage.getItem('cancellation-form-settings');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Error parsing stored settings:', e);
        }
    }

    return {
        fieldVisibility: {
            'room-number': true,
            'parking-number': true,
            'inspection-date': true,
            'inspection-hour': true,
            'remarks': true,
            'recipient-name': true,
            'phone-number': true,
            'mobile-number': true
        },
        cancelReasons: ['帰省', '住替', '転勤', '卒業', 'その他'],
        phoneTypes: ['自宅', '実家', '会社', 'その他'],
        mobileOwners: ['本人', '主人', '妻', 'その他']
    };
}
