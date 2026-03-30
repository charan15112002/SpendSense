/**
 * ExportService.js
 * 
 * Exports transactions to CSV, Excel, or PDF.
 * Uses:
 *   - react-native-fs (file system)
 *   - react-native-share (sharing)
 * 
 * Install: npm install react-native-fs react-native-share
 */

import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { DatabaseService } from './DatabaseService';

export class ExportService {

  static async exportToCSV() {
    const transactions = await DatabaseService.getAllForExport();

    const headers = [
      'Date', 'Time', 'Amount (₹)', 'Merchant', 'Category',
      'Note', 'Source App', 'Type', 'UPI Ref', 'Account', 'Status',
    ];

    const rows = transactions.map(txn => {
      const date = new Date(txn.timestamp);
      return [
        date.toLocaleDateString('en-IN'),
        date.toLocaleTimeString('en-IN'),
        txn.amount?.toFixed(2) || '',
        this.csvEscape(txn.merchant),
        txn.category,
        this.csvEscape(txn.userNote || ''),
        txn.sourceApp,
        txn.transactionType,
        txn.upiRef || '',
        txn.account || '',
        txn.status,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');

    const filename = `SpendSense_${this.dateStamp()}.csv`;
    const path = `${RNFS.DownloadDirectoryPath}/${filename}`;

    await RNFS.writeFile(path, csvContent, 'utf8');

    await Share.open({
      url: `file://${path}`,
      type: 'text/csv',
      filename,
      title: 'Export SpendSense Transactions',
    });

    return path;
  }

  static async exportToPDF(summary) {
    // Generate a simple HTML report and convert to PDF
    const transactions = await DatabaseService.getAllForExport();

    const total = transactions.reduce((s, t) => s + (t.amount || 0), 0);
    const byCategory = {};
    transactions.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + (t.amount || 0);
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #333; }
    h1 { color: #6C5CE7; }
    .summary { background: #F8F7FF; padding: 16px; border-radius: 8px; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #6C5CE7; color: white; padding: 8px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) { background: #F8F7FF; }
  </style>
</head>
<body>
  <h1>SpendSense Report</h1>
  <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
  
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total Spend:</strong> ₹${total.toFixed(2)}</p>
    <p><strong>Transactions:</strong> ${transactions.length}</p>
    <h3>By Category:</h3>
    ${Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `<p>${cat}: ₹${amt.toFixed(2)}</p>`)
      .join('')}
  </div>

  <h2>All Transactions</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Amount</th><th>Merchant</th><th>Category</th><th>Note</th></tr>
    </thead>
    <tbody>
      ${transactions.slice(0, 500).map(txn => `
        <tr>
          <td>${new Date(txn.timestamp).toLocaleDateString('en-IN')}</td>
          <td>₹${(txn.amount || 0).toFixed(2)}</td>
          <td>${txn.merchant || ''}</td>
          <td>${txn.category || ''}</td>
          <td>${txn.userNote || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;

    const htmlPath = `${RNFS.CachesDirectoryPath}/report.html`;
    const pdfPath = `${RNFS.DownloadDirectoryPath}/SpendSense_${this.dateStamp()}.pdf`;

    await RNFS.writeFile(htmlPath, html, 'utf8');

    // Use react-native-html-to-pdf for actual PDF conversion
    // Install: npm install react-native-html-to-pdf
    // const RNHTMLtoPDF = require('react-native-html-to-pdf').default;
    // const file = await RNHTMLtoPDF.convert({ html, fileName: 'SpendSense', directory: 'Download' });

    await Share.open({
      url: `file://${htmlPath}`,
      type: 'text/html',
      title: 'SpendSense Report',
    });

    return htmlPath;
  }

  static csvEscape(str) {
    if (!str) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  static dateStamp() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  }
}
