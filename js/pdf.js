/**
 * PDF Generation using jsPDF
 * Recreates the original lease cancellation form layout
 */

// Load Japanese font (TTF format required for jsPDF)
// Using IPAex Gothic font from jsDelivr CDN
const FONT_URL = 'https://cdn.jsdelivr.net/gh/nicolo-ribaudo/noto-fonts-subset@v1/NotoSansJP-Regular.ttf';

let fontLoaded = false;
let fontBase64 = null;

/**
 * Load Japanese font
 */
async function loadJapaneseFont() {
    if (fontLoaded) return;

    try {
        const response = await fetch(FONT_URL);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function() {
                fontBase64 = reader.result.split(',')[1];
                fontLoaded = true;
                resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error loading font:', error);
        throw error;
    }
}

/**
 * Generate PDF from form data
 */
async function generatePDF(data) {
    try {
        const { jsPDF } = window.jspdf;

        if (!jsPDF) {
            alert('PDFライブラリが読み込まれていません。ページを再読み込みしてください。');
            return;
        }

        // Load font first
        try {
            await loadJapaneseFont();
        } catch (error) {
            console.error('Font loading error:', error);
            alert('フォントの読み込みに失敗しました。');
            return;
        }

        // Create PDF (A4 size)
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

    // Add Japanese font
    doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64);
    doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
    doc.setFont('NotoSansJP');

    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Title
    doc.setFontSize(18);
    doc.text('【賃貸借契約解約申込書】', pageWidth / 2, y + 10, { align: 'center' });
    y += 25;

    // Landlord info (top left)
    doc.setFontSize(10);
    doc.text(`（貸主住所）　${data.landlordAddress || ''}`, margin, y);
    y += 6;
    doc.text(`（氏名）　　　${data.landlordName || ''}`, margin, y);
    y += 12;

    // Tenant info (right side)
    doc.text('（借主住所）', pageWidth - margin - 60, y - 6);
    doc.text(`${data.tenantAddress || ''}`, pageWidth - margin - 45, y - 6);
    y += 6;
    doc.text(`（氏名）　　　${data.tenantName || ''}`, pageWidth - margin - 60, y - 6);
    doc.text('印', pageWidth - margin - 5, y - 6);
    y += 10;

    // Agreement text
    doc.setFontSize(9);
    const agreementText = '下記物件について賃貸借契約書の条項に基づき解除を申し入れます。\nつきましては公共料金等の精算の上、家財一切の搬出を終了させ、鍵と本物件の明渡し・建物占有権放棄を下記明渡日までに行います。\n万一、明渡しの遅延する事があれば理由の如何を問わず所有者の指示通りに行い、鍵の返還後に本物件内に残置した物品が存在した場合は、その所有権を放棄したものとし、賃貸人により搬出、処分されても一切異議申し立ては行わないこととします。（別途処分費が請求されます。）\n又、上記事項により発生した損害は賠償致します。';
    const splitAgreement = doc.splitTextToSize(agreementText, contentWidth);
    doc.text(splitAgreement, margin, y);
    y += splitAgreement.length * 4 + 8;

    // Section 1: Property Information
    doc.setFontSize(11);
    doc.text('（１）　解約申込物件', margin, y);
    y += 6;

    // Draw table
    const rowHeight = 8;

    doc.setFontSize(9);
    doc.setLineWidth(0.3);

    // Row 1: Property name and Room number
    drawTableRow(doc, margin, y, [
        { text: '物　件　名', width: 25 },
        { text: data.propertyName || '', width: 75 },
        { text: '部屋番号', width: 20 },
        { text: data.roomNumber || '', width: 60 }
    ], rowHeight);
    y += rowHeight;

    // Row 2: Address and Parking number
    drawTableRow(doc, margin, y, [
        { text: '所　在　地', width: 25 },
        { text: data.propertyAddress || '', width: 75 },
        { text: '駐車番号', width: 20 },
        { text: data.parkingNumber || '', width: 60 }
    ], rowHeight);
    y += rowHeight;

    // Row 3: Contractor name
    drawTableRow(doc, margin, y, [
        { text: '契約者氏名', width: 25 },
        { text: data.contractorName || '', width: 155 }
    ], rowHeight);
    y += rowHeight;

    // Row 4: Application date and Cancellation date
    drawTableRow(doc, margin, y, [
        { text: '解約申込日', width: 25 },
        { text: formatDate(data.applicationDate), width: 55 },
        { text: '解約希望日', width: 25 },
        { text: formatDate(data.cancellationDate), width: 75 }
    ], rowHeight);
    y += rowHeight;

    // Row 5: Inspection date and time
    const inspectionDateStr = data.inspectionDate ? formatDate(data.inspectionDate) : '';
    const inspectionTimeStr = data.inspectionTime || '';
    drawTableRow(doc, margin, y, [
        { text: '立会希望日', width: 25 },
        { text: inspectionDateStr, width: 35 },
        { text: inspectionTimeStr, width: 30 },
        { text: `（備考：${data.remarks || ''}）`, width: 90 }
    ], rowHeight);
    y += rowHeight;

    // Row 6: Cancel reason
    drawTableRow(doc, margin, y, [
        { text: '解約事由', width: 25 },
        { text: data.cancelReasonDisplay || '', width: 155 }
    ], rowHeight);
    y += rowHeight + 8;

    // Section 2: Bank Account
    doc.setFontSize(11);
    doc.text('（２）　精算金振込み口座', margin, y);
    doc.setFontSize(8);
    doc.text('（※時期により１ヶ月程度掛かる場合が御座います。）', margin + 50, y);
    y += 6;

    doc.setFontSize(9);

    // Row 1: Bank name
    const bankTypeStr = data.bankType || '銀行';
    drawTableRow(doc, margin, y, [
        { text: '銀　行　名', width: 25 },
        { text: data.bankName || '', width: 75 },
        { text: bankTypeStr, width: 30 },
        { text: `${data.branchName || ''}支店`, width: 50 }
    ], rowHeight);
    y += rowHeight;

    // Row 2: Account number
    const accountTypeStr = data.accountType || '普通';
    drawTableRow(doc, margin, y, [
        { text: '口座番号', width: 25 },
        { text: accountTypeStr, width: 20 },
        { text: data.accountNumber || '', width: 135 }
    ], rowHeight);
    y += rowHeight;

    // Row 3: Account holder
    drawTableRow(doc, margin, y, [
        { text: '（カナ）', width: 25 },
        { text: '', width: 0 }
    ], rowHeight);
    // Draw the kana text separately
    doc.text(data.accountHolderKana || '', margin + 30, y + 5);
    y += rowHeight;

    drawTableRow(doc, margin, y, [
        { text: '口座名義', width: 25 },
        { text: '', width: 155 }
    ], rowHeight);
    y += rowHeight + 8;

    // Section 3: New Address
    doc.setFontSize(11);
    doc.text('（３）　転居先ご住所', margin, y);
    doc.setFontSize(8);
    doc.text('（精算書送付先）', margin + 40, y);
    y += 6;

    doc.setFontSize(9);

    // Row 1: Address
    drawTableRow(doc, margin, y, [
        { text: '住　　　所', width: 25 },
        { text: `〒${data.newPostalCode || ''}`, width: 30 }
    ], rowHeight);
    y += rowHeight;

    drawTableRow(doc, margin, y, [
        { text: '', width: 25 },
        { text: data.newAddress || '', width: 155 }
    ], rowHeight);
    y += rowHeight;

    // Row 2: Recipient name
    const recipientNote = data.recipientName ? '' : '※上記記載の契約者名と違う場合。';
    drawTableRow(doc, margin, y, [
        { text: '送付先氏名', width: 25 },
        { text: data.recipientName || '', width: 80 },
        { text: recipientNote, width: 75 }
    ], rowHeight);
    y += rowHeight;

    // Row 3: Phone number
    const phoneDisplay = data.phoneNumber ? `${data.phoneNumber}` : '';
    const phoneTypeDisplay = data.phoneTypeDisplay || '';
    drawTableRow(doc, margin, y, [
        { text: '電話番号', width: 25 },
        { text: phoneDisplay, width: 60 },
        { text: phoneTypeDisplay, width: 30 },
        { text: '宅内', width: 65 }
    ], rowHeight);
    y += rowHeight;

    // Row 4: Mobile number
    const mobileDisplay = data.mobileNumber ? `${data.mobileNumber}` : '';
    const mobileOwnerDisplay = data.mobileOwnerDisplay ? `所有者：${data.mobileOwnerDisplay}` : '';
    drawTableRow(doc, margin, y, [
        { text: '携帯電話', width: 25 },
        { text: mobileDisplay, width: 60 },
        { text: mobileOwnerDisplay, width: 95 }
    ], rowHeight);
    y += rowHeight + 10;

    // Notes section
    doc.setFontSize(10);
    doc.text('解約時の注意事項', margin, y);
    y += 6;

    doc.setFontSize(9);
    const notes = [
        '①　退去立会日までに公共料金の精算、新聞・電話等の停止手続きをお願い致します。',
        '　　公共料金等未精算分がありますと敷金の返却が遅れる原因となります。',
        '②　荷物やゴミ等残置物がある場合はその処分費用を請求させていただくことになりますのでご注意下さい。'
    ];

    notes.forEach(note => {
        doc.text(note, margin, y);
        y += 5;
    });

    // Save PDF
    const fileName = `解約申込書_${data.contractorName || '名前未入力'}_${formatDateForFileName(new Date())}.pdf`;
    doc.save(fileName);
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('PDFの生成に失敗しました: ' + error.message);
    }
}

/**
 * Draw a table row with cells
 */
function drawTableRow(doc, x, y, cells, height) {
    let currentX = x;
    const totalWidth = cells.reduce((sum, cell) => sum + cell.width, 0);

    // Draw outer border
    doc.rect(x, y, totalWidth, height);

    // Draw cells
    cells.forEach((cell, index) => {
        if (index > 0) {
            // Draw vertical line
            doc.line(currentX, y, currentX, y + height);
        }

        // Draw text
        if (cell.text) {
            const textY = y + height / 2 + 1;
            doc.text(cell.text, currentX + 2, textY);
        }

        currentX += cell.width;
    });
}

/**
 * Format date string (YYYY-MM-DD to YYYY年MM月DD日)
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
}

/**
 * Format date for filename
 */
function formatDateForFileName(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}
