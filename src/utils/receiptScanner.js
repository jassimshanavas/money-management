// Mock OCR functionality - In a real app, you'd integrate with Tesseract.js or a cloud OCR API

export const scanReceipt = async (file) => {
  // Simulate OCR processing delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock extracted data based on common receipt patterns
  const mockExtractions = [
    {
      merchant: 'SuperMart',
      date: new Date().toISOString(),
      total: 45.67,
      items: [
        { name: 'Groceries', amount: 35.20 },
        { name: 'Dairy Products', amount: 10.47 },
      ],
      category: 'Food',
      confidence: 0.92,
    },
    {
      merchant: 'Coffee Shop',
      date: new Date().toISOString(),
      total: 12.50,
      items: [
        { name: 'Coffee & Pastries', amount: 12.50 },
      ],
      category: 'Food',
      confidence: 0.88,
    },
    {
      merchant: 'Gas Station',
      date: new Date().toISOString(),
      total: 55.00,
      items: [
        { name: 'Fuel', amount: 55.00 },
      ],
      category: 'Travel',
      confidence: 0.85,
    },
  ];

  // Return random mock extraction (in real app, this would be actual OCR result)
  const extraction = mockExtractions[Math.floor(Math.random() * mockExtractions.length)];
  
  // Add slight randomization to make it feel more realistic
  const variance = (Math.random() - 0.5) * 5; // ±2.5
  extraction.total = Math.max(1, extraction.total + variance);
  extraction.date = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(); // Random date in last week

  return {
    success: true,
    data: extraction,
    rawText: `Receipt from ${extraction.merchant}\nTotal: ${extraction.total}\nDate: ${new Date(extraction.date).toLocaleDateString()}`,
  };
};

export const extractTransactionData = (ocrResult) => {
  if (!ocrResult || !ocrResult.success) {
    return null;
  }

  const { data } = ocrResult;
  
  return {
    type: 'expense',
    amount: data.total,
    category: data.category,
    description: data.merchant,
    date: data.date,
    source: 'receipt',
    confidence: data.confidence,
  };
};

