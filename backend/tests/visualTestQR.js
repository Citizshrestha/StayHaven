/**
 * QR Code Visual Test
 * 
 * This script generates QR codes and saves them as HTML for visual verification.
 * Run with: node tests/visualTestQR.js
 * Then open the generated HTML file in a browser
 */

import { generateTableQRCode, generateRoomQRCode } from '../utils/qrGenerator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateVisualTest() {
  console.log('Generating QR codes for visual testing...\n');

  // Generate test QR codes
  const tableQR1 = await generateTableQRCode('TBL-TESTVISUAL001');
  const tableQR2 = await generateTableQRCode('TBL-TESTVISUAL002');
  const roomQR1 = await generateRoomQRCode('RM-TESTVISUAL001');
  const roomQR2 = await generateRoomQRCode('RM-TESTVISUAL002');

  // Create HTML content
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Code Visual Test</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f5f5f5;
      padding: 40px;
    }
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 40px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      color: #555;
      border-bottom: 2px solid #ddd;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .qr-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
    }
    .qr-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 24px;
      text-align: center;
    }
    .qr-card img {
      width: 200px;
      height: 200px;
      margin-bottom: 16px;
    }
    .qr-card h3 {
      color: #333;
      margin-bottom: 8px;
    }
    .qr-card .token {
      font-family: monospace;
      background: #f0f0f0;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      color: #666;
      display: inline-block;
      margin-bottom: 12px;
    }
    .qr-card .url {
      font-size: 11px;
      color: #888;
      word-break: break-all;
      background: #fafafa;
      padding: 8px;
      border-radius: 4px;
    }
    .instructions {
      background: #e8f4fc;
      border-left: 4px solid #2196F3;
      padding: 16px;
      margin-bottom: 30px;
      border-radius: 0 8px 8px 0;
    }
    .instructions h3 {
      color: #1976D2;
      margin-bottom: 8px;
    }
    .instructions p {
      color: #555;
      line-height: 1.6;
    }
    .success {
      background: #e8f5e9;
      border-left-color: #4CAF50;
    }
    .success h3 {
      color: #388E3C;
    }
    .download-btn {
      background: #2196F3;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 12px;
    }
    .download-btn:hover {
      background: #1976D2;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔳 QR Code Visual Verification Test</h1>
    
    <div class="instructions success">
      <h3>✅ QR Codes Generated Successfully!</h3>
      <p>
        Scan these QR codes with your phone camera to verify they work correctly.
        Each QR code should open the corresponding URL in your browser.
      </p>
    </div>

    <div class="section">
      <h2>🍽️ Restaurant Table QR Codes</h2>
      <div class="qr-grid">
        <div class="qr-card">
          <img src="${tableQR1.qrCodeImage}" alt="Table 1 QR Code">
          <h3>Table 1</h3>
          <div class="token">${'TBL-TESTVISUAL001'}</div>
          <div class="url">${tableQR1.qrCodeData}</div>
          <button class="download-btn" onclick="downloadQR('${tableQR1.qrCodeImage}', 'table-1-qr.png')">
            Download QR
          </button>
        </div>
        <div class="qr-card">
          <img src="${tableQR2.qrCodeImage}" alt="Table 2 QR Code">
          <h3>Table 2</h3>
          <div class="token">${'TBL-TESTVISUAL002'}</div>
          <div class="url">${tableQR2.qrCodeData}</div>
          <button class="download-btn" onclick="downloadQR('${tableQR2.qrCodeImage}', 'table-2-qr.png')">
            Download QR
          </button>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🛏️ Hotel Room QR Codes</h2>
      <div class="qr-grid">
        <div class="qr-card">
          <img src="${roomQR1.qrCodeImage}" alt="Room 101 QR Code">
          <h3>Room 101</h3>
          <div class="token">${'RM-TESTVISUAL001'}</div>
          <div class="url">${roomQR1.qrCodeData}</div>
          <button class="download-btn" onclick="downloadQR('${roomQR1.qrCodeImage}', 'room-101-qr.png')">
            Download QR
          </button>
        </div>
        <div class="qr-card">
          <img src="${roomQR2.qrCodeImage}" alt="Room 102 QR Code">
          <h3>Room 102</h3>
          <div class="token">${'RM-TESTVISUAL002'}</div>
          <div class="url">${roomQR2.qrCodeData}</div>
          <button class="download-btn" onclick="downloadQR('${roomQR2.qrCodeImage}', 'room-102-qr.png')">
            Download QR
          </button>
        </div>
      </div>
    </div>

    <div class="instructions">
      <h3>📱 How to Test</h3>
      <p>
        1. Open your phone's camera app<br>
        2. Point it at any QR code above<br>
        3. Tap the notification/link that appears<br>
        4. It should open the URL shown below the QR code<br><br>
        <strong>Note:</strong> For the URLs to work, your frontend must be running on localhost:5173
      </p>
    </div>
  </div>

  <script>
    function downloadQR(dataUrl, filename) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  </script>
</body>
</html>
`;

  // Save HTML file
  const outputPath = path.join(__dirname, 'qr-visual-test.html');
  fs.writeFileSync(outputPath, html);
  
  console.log('✅ Visual test HTML generated successfully!');
  console.log(`📄 File saved to: ${outputPath}`);
  console.log('\n📌 Open this file in a browser to see and scan the QR codes.');
  console.log('\n Generated QR Codes:');
  console.log(`   - Table 1: ${tableQR1.qrCodeData}`);
  console.log(`   - Table 2: ${tableQR2.qrCodeData}`);
  console.log(`   - Room 101: ${roomQR1.qrCodeData}`);
  console.log(`   - Room 102: ${roomQR2.qrCodeData}`);
}

generateVisualTest().catch(console.error);
