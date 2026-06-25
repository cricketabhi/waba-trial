const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({ margin: 50 });
const filePath = path.join(__dirname, 'public', 'files', 'receipt001.pdf');

// Ensure the directory exists
const dir = path.dirname(filePath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

doc.pipe(fs.createWriteStream(filePath));

// Add content to PDF
doc.fontSize(25).text('OFFICIAL RECEIPT', { align: 'center' });
doc.moveDown();

doc.fontSize(20).text('PLC Projects', { align: 'center', underline: true });
doc.moveDown(2);

doc.fontSize(14);
doc.text(`Receipt Number: 001`);
doc.text(`Date: ${new Date().toLocaleDateString()}`);
doc.moveDown();

doc.rect(50, 200, 500, 150).stroke();

doc.text(`Plot Purchased by: Ganesh Poloju`, 70, 220);
doc.text(`Advance Paid: Rs 10,000`, 70, 260);
doc.text(`Plot Price: Rs 1,80,000`, 70, 300);

doc.moveDown(5);
doc.fontSize(12).text('Thank you for your business!', { align: 'center' });

doc.end();

console.log('Receipt generated at:', filePath);
