const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../lib/auth');

// prefer global fetch (Node 18+); fall back to dynamic import of node-fetch
let fetchFn = globalThis.fetch && globalThis.fetch.bind(globalThis);
async function dynamicFetch(...args) {
  if (!fetchFn) {
    const mod = await import('node-fetch');
    // node-fetch v3 exports default
    fetchFn = mod.default || mod;
  }
  return fetchFn(...args);
}

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

// OCR.space API Key - Replace with your own key
const OCR_API_KEY = 'helloworld'; // Replace with your actual OCR.space API key

router.post('/', requireAuth, upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const formData = new FormData();
  formData.append('apikey', OCR_API_KEY);
  formData.append('file', fs.createReadStream(req.file.path));

  try {
    const response = await dynamicFetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    const ocrData = await response.json();
    fs.unlinkSync(req.file.path); // Clean up the uploaded file

    if (ocrData.IsErroredOnProcessing) {
      return res.status(500).json({ error: ocrData.ErrorMessage.join(', ') });
    }

    const parsedText = ocrData.ParsedResults[0].ParsedText;

    // Very basic parsing logic (example)
    const amountMatch = parsedText.match(/Total[:\s]+([\d,]+\.\d{2})/i);
    const dateMatch = parsedText.match(/\d{2}\/\d{2}\/\d{4}/);

    const extractedData = {
      amount: amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null,
      date: dateMatch ? dateMatch[0] : null,
      description: parsedText.split('\n')[0],
      fullText: parsedText,
    };

    res.json(extractedData);
  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: 'Failed to process OCR request' });
  }
});

module.exports = router;
