/**
 * Google Apps Script for Lease Cancellation Form
 *
 * Setup Instructions:
 * 1. Create a new Google Spreadsheet
 * 2. Go to Extensions > Apps Script
 * 3. Copy and paste this entire code
 * 4. Save the project
 * 5. Click Deploy > New deployment
 * 6. Select "Web app"
 * 7. Set "Execute as" to "Me"
 * 8. Set "Who has access" to "Anyone"
 * 9. Click Deploy and copy the Web App URL
 * 10. Paste the URL in js/api.js
 */

// Sheet names
const SUBMISSIONS_SHEET = '申込データ';
const SETTINGS_SHEET = '設定';

/**
 * Initialize the spreadsheet with required sheets
 */
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create Submissions sheet if not exists
  let submissionsSheet = ss.getSheetByName(SUBMISSIONS_SHEET);
  if (!submissionsSheet) {
    submissionsSheet = ss.insertSheet(SUBMISSIONS_SHEET);

    // Add headers
    const headers = [
      '申込日時',
      '貸主住所',
      '貸主氏名',
      '借主住所',
      '借主氏名',
      '物件名',
      '所在地',
      '部屋番号',
      '駐車番号',
      '契約者氏名',
      '解約申込日',
      '解約希望日',
      '立会希望日',
      '立会希望時間',
      '解約事由',
      '備考',
      '金融機関名',
      '金融機関種別',
      '支店名',
      '口座種別',
      '口座番号',
      '口座名義',
      '転居先郵便番号',
      '転居先住所',
      '送付先氏名',
      '電話番号',
      '電話種別',
      '携帯電話',
      '携帯所有者'
    ];

    submissionsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    submissionsSheet.setFrozenRows(1);
    submissionsSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  // Create Settings sheet if not exists
  let settingsSheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SETTINGS_SHEET);

    // Add default settings
    const defaultSettings = [
      ['キー', '値'],
      ['password', 'admin123'],
      ['fieldVisibility', JSON.stringify({
        'room-number': true,
        'parking-number': true,
        'inspection-date': true,
        'inspection-hour': true,
        'remarks': true,
        'recipient-name': true,
        'phone-number': true,
        'mobile-number': true
      })],
      ['cancelReasons', JSON.stringify(['帰省', '住替', '転勤', '卒業', 'その他'])],
      ['phoneTypes', JSON.stringify(['自宅', '実家', '会社', 'その他'])],
      ['mobileOwners', JSON.stringify(['本人', '主人', '妻', 'その他'])]
    ];

    settingsSheet.getRange(1, 1, defaultSettings.length, 2).setValues(defaultSettings);
    settingsSheet.setFrozenRows(1);
    settingsSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
  }

  return '初期化が完了しました';
}

/**
 * Handle GET requests
 */
function doGet(e) {
  const action = e.parameter.action;

  let result;

  switch (action) {
    case 'getSettings':
      result = getSettings();
      break;
    default:
      result = { error: 'Unknown action' };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    let result;

    switch (action) {
      case 'submit':
        result = submitForm(payload.data);
        break;
      case 'saveSettings':
        result = saveSettings(payload.data);
        break;
      case 'verifyPassword':
        result = { valid: verifyPassword(payload.password) };
        break;
      case 'changePassword':
        result = changePassword(payload.currentPassword, payload.newPassword);
        break;
      case 'getSubmissions':
        // Require authentication for submissions
        if (!verifyPassword(payload.password)) {
          result = { error: 'Authentication required' };
        } else {
          result = getSubmissionsData();
        }
        break;
      default:
        result = { error: 'Unknown action' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Submit form data to spreadsheet
 */
function submitForm(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SUBMISSIONS_SHEET);

  if (!sheet) {
    throw new Error('Submissions sheet not found. Please run initializeSpreadsheet first.');
  }

  const row = [
    new Date().toLocaleString('ja-JP'),
    data.landlordAddress || '',
    data.landlordName || '',
    data.tenantAddress || '',
    data.tenantName || '',
    data.propertyName || '',
    data.propertyAddress || '',
    data.roomNumber || '',
    data.parkingNumber || '',
    data.contractorName || '',
    data.applicationDate || '',
    data.cancellationDate || '',
    data.inspectionDate || '',
    data.inspectionTime || '',
    data.cancelReasonDisplay || data.cancelReason || '',
    data.remarks || '',
    data.bankName || '',
    data.bankType || '',
    data.branchName || '',
    data.accountType || '',
    data.accountNumber || '',
    data.accountHolderKana || '',
    data.newPostalCode || '',
    data.newAddress || '',
    data.recipientName || '',
    data.phoneNumber || '',
    data.phoneTypeDisplay || data.phoneType || '',
    data.mobileNumber || '',
    data.mobileOwnerDisplay || data.mobileOwner || ''
  ];

  sheet.appendRow(row);

  return { success: true };
}

/**
 * Get settings from spreadsheet
 */
function getSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS_SHEET);

  if (!sheet) {
    return getDefaultSettings();
  }

  const data = sheet.getDataRange().getValues();
  const settings = {};

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    const value = data[i][1];

    if (key && key !== 'password') {
      try {
        settings[key] = JSON.parse(value);
      } catch (e) {
        settings[key] = value;
      }
    }
  }

  return settings;
}

/**
 * Save settings to spreadsheet
 */
function saveSettings(settings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS_SHEET);

  if (!sheet) {
    throw new Error('Settings sheet not found');
  }

  const data = sheet.getDataRange().getValues();

  // Update existing settings
  for (const [key, value] of Object.entries(settings)) {
    if (key === 'password') continue; // Don't update password through this method

    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;
        sheet.getRange(i + 1, 2).setValue(valueStr);
        found = true;
        break;
      }
    }

    // Add new setting if not found
    if (!found) {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;
      sheet.appendRow([key, valueStr]);
    }
  }

  return { success: true };
}

/**
 * Verify admin password
 */
function verifyPassword(password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS_SHEET);

  if (!sheet) {
    return password === 'admin123'; // Default password
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'password') {
      return data[i][1] === password;
    }
  }

  return password === 'admin123'; // Default password
}

/**
 * Change admin password
 */
function changePassword(currentPassword, newPassword) {
  if (!verifyPassword(currentPassword)) {
    return { success: false, error: 'Current password is incorrect' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS_SHEET);

  if (!sheet) {
    throw new Error('Settings sheet not found');
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'password') {
      sheet.getRange(i + 1, 2).setValue(newPassword);
      return { success: true };
    }
  }

  // Add password if not found
  sheet.appendRow(['password', newPassword]);
  return { success: true };
}

/**
 * Get submissions from spreadsheet (internal function)
 */
function getSubmissionsData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SUBMISSIONS_SHEET);

  if (!sheet) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const submissions = [];

  // Skip header row, get last 50 submissions (most recent first)
  const startRow = Math.max(1, data.length - 50);
  for (let i = data.length - 1; i >= startRow; i--) {
    const row = data[i];
    const submission = {};

    headers.forEach((header, index) => {
      // Map Japanese headers to English keys
      const keyMap = {
        '申込日時': 'submittedAt',
        '貸主住所': 'landlordAddress',
        '貸主氏名': 'landlordName',
        '借主住所': 'tenantAddress',
        '借主氏名': 'tenantName',
        '物件名': 'propertyName',
        '所在地': 'propertyAddress',
        '部屋番号': 'roomNumber',
        '駐車番号': 'parkingNumber',
        '契約者氏名': 'contractorName',
        '解約申込日': 'applicationDate',
        '解約希望日': 'cancellationDate',
        '立会希望日': 'inspectionDate',
        '立会希望時間': 'inspectionTime',
        '解約事由': 'cancelReasonDisplay',
        '備考': 'remarks',
        '金融機関名': 'bankName',
        '金融機関種別': 'bankType',
        '支店名': 'branchName',
        '口座種別': 'accountType',
        '口座番号': 'accountNumber',
        '口座名義': 'accountHolderKana',
        '転居先郵便番号': 'newPostalCode',
        '転居先住所': 'newAddress',
        '送付先氏名': 'recipientName',
        '電話番号': 'phoneNumber',
        '電話種別': 'phoneTypeDisplay',
        '携帯電話': 'mobileNumber',
        '携帯所有者': 'mobileOwnerDisplay'
      };

      const key = keyMap[header] || header;
      submission[key] = row[index] || '';
    });

    submissions.push(submission);
  }

  return submissions;
}

/**
 * Get default settings
 */
function getDefaultSettings() {
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

/**
 * Test function to verify setup
 */
function testSetup() {
  const result = initializeSpreadsheet();
  Logger.log(result);

  const settings = getSettings();
  Logger.log('Settings: ' + JSON.stringify(settings));

  const testData = {
    landlordAddress: 'テスト貸主住所',
    landlordName: 'テスト貸主',
    tenantAddress: 'テスト借主住所',
    tenantName: 'テスト借主',
    propertyName: 'テストマンション',
    propertyAddress: '東京都渋谷区',
    roomNumber: '101',
    contractorName: 'テスト太郎',
    applicationDate: '2024-01-01',
    cancellationDate: '2024-02-01',
    cancelReason: '転勤',
    bankName: 'テスト銀行',
    bankType: '銀行',
    branchName: '渋谷',
    accountType: '普通',
    accountNumber: '1234567',
    accountHolderKana: 'テストタロウ',
    newPostalCode: '150-0001',
    newAddress: '東京都渋谷区1-1-1'
  };

  const submitResult = submitForm(testData);
  Logger.log('Submit result: ' + JSON.stringify(submitResult));
}
