// Simple PDF generation using browser print API
// For a more robust solution, you'd use libraries like jsPDF or pdfmake

export const generateMonthlyReportPDF = (transactions, budgets, currency, insights) => {
  // Create a printable HTML report
  const reportHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Monthly Financial Report</title>
        <style>
          body {
            font-family: 'Inter', sans-serif;
            padding: 40px;
            color: #1e293b;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #14b8a6;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #14b8a6;
            margin: 0;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section h2 {
            color: #0f172a;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
          }
          .summary-card {
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            margin: 15px 0;
          }
          .summary-card h3 {
            margin-top: 0;
            color: #14b8a6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f1f5f9;
            font-weight: 600;
            color: #0f172a;
          }
          .insight {
            background: #fef3c7;
            padding: 15px;
            border-left: 4px solid #f59e0b;
            margin: 10px 0;
            border-radius: 8px;
          }
          .positive { color: #10b981; }
          .negative { color: #ef4444; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Monthly Financial Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        ${insights && insights.length > 0 ? `
          <div class="section">
            <h2>AI Insights</h2>
            ${insights.map(insight => `
              <div class="insight">
                <strong>${insight.icon} ${insight.category}:</strong> ${insight.message}
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="section">
          <h2>Summary</h2>
          <div class="summary-card">
            <h3>Total Transactions: ${transactions.length}</h3>
            <p>This report includes all transactions for the current month.</p>
          </div>
        </div>
        
        <div class="section">
          <h2>Budget vs Actual</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Budget (${currency})</th>
                <th>Spent (${currency})</th>
                <th>Remaining (${currency})</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(budgets).map(cat => {
                const spent = transactions
                  .filter(t => t.type === 'expense' && t.category === cat)
                  .reduce((sum, t) => sum + t.amount, 0);
                const remaining = budgets[cat] - spent;
                return `
                  <tr>
                    <td>${cat}</td>
                    <td>${budgets[cat].toFixed(2)}</td>
                    <td>${spent.toFixed(2)}</td>
                    <td class="${remaining >= 0 ? 'positive' : 'negative'}">
                      ${remaining >= 0 ? '+' : ''}${remaining.toFixed(2)}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h2>Recent Transactions</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount (${currency})</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.slice(0, 20).map(t => `
                <tr>
                  <td>${new Date(t.date).toLocaleDateString()}</td>
                  <td>${t.type}</td>
                  <td>${t.category}</td>
                  <td>${t.description || '-'}</td>
                  <td class="${t.type === 'income' ? 'positive' : 'negative'}">
                    ${t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 40px; text-align: center; color: #64748b; font-size: 12px;">
          <p>Generated by Money Tracker - Elegant Finance Management</p>
        </div>
      </body>
    </html>
  `;

  // Open in new window and trigger print
  const printWindow = window.open('', '_blank');
  printWindow.document.write(reportHTML);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
};

