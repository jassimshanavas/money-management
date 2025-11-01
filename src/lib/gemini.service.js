import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment variable
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize Gemini AI
let genAI = null;
if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
}

/**
 * Test Gemini API connection and list available models
 */
export async function testGeminiConnection() {
  if (!API_KEY || !genAI) {
    return { success: false, error: 'API key not configured' };
  }

  try {
    // Try to get model info - this will fail if model doesn't exist
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent('Say "OK"');
    await result.response;
    return { success: true, model: 'gemini-2.5-pro' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Generate AI insights from financial data using Gemini API
 */
export async function generateAIInsightsWithGemini(transactions, budgets, categories, currency, wallets) {
  // Return fallback if API key is not configured
  if (!API_KEY || !genAI) {
    console.warn('Gemini API key not configured. Using fallback insights.');
    return null;
  }

  // Validate API key format
  if (!API_KEY.startsWith('AIza')) {
    console.warn('Invalid API key format. Gemini API keys should start with "AIza"');
    return null;
  }

  try {
    // Use gemini-2.5-pro as it's the most stable and widely available model
    // If this fails, the API key might not have access to Gemini models
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    // Prepare financial summary
    const currentMonth = transactions.filter(t => {
      const date = new Date(t.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const lastMonth = transactions.filter(t => {
      const date = new Date(t.date);
      const now = new Date();
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return date >= lastMonthDate && date < new Date(now.getFullYear(), now.getMonth(), 1);
    });

    // Calculate totals
    const currentIncome = currentMonth.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const currentExpenses = currentMonth.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const lastIncome = lastMonth.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const lastExpenses = lastMonth.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    // Category spending
    const categorySpending = {};
    currentMonth.forEach(t => {
      if (t.type === 'expense') {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
      }
    });

    // Budget analysis
    const budgetStatus = {};
    categories.forEach(cat => {
      const spent = categorySpending[cat.name] || 0;
      const budget = budgets[cat.name] || 0;
      if (budget > 0) {
        budgetStatus[cat.name] = {
          spent,
          budget,
          percentage: (spent / budget) * 100
        };
      }
    });

    // Prepare prompt for Gemini
    const prompt = `You are a financial advisor AI. Analyze the following financial data and provide 3-5 actionable insights.

FINANCIAL DATA:
- Currency: ${currency}
- Current Month:
  * Income: ${currentIncome.toFixed(2)} ${currency}
  * Expenses: ${currentExpenses.toFixed(2)} ${currency}
  * Balance: ${(currentIncome - currentExpenses).toFixed(2)} ${currency}
  
- Last Month:
  * Income: ${lastIncome.toFixed(2)} ${currency}
  * Expenses: ${lastExpenses.toFixed(2)} ${currency}

- Category Spending (Current Month):
${Object.entries(categorySpending).map(([cat, amount]) => `  * ${cat}: ${amount.toFixed(2)} ${currency}`).join('\n')}

- Budget Status:
${Object.entries(budgetStatus).map(([cat, data]) => 
  `  * ${cat}: Spent ${data.spent.toFixed(2)} of ${data.budget.toFixed(2)} ${currency} (${data.percentage.toFixed(1)}%)`
).join('\n')}

- Total Transactions: ${transactions.length}
- Wallets: ${wallets.length} wallet${wallets.length !== 1 ? 's' : ''}

Please provide 3-5 insights in the following JSON format (be concise and actionable):
{
  "insights": [
    {
      "type": "success|warning|error|info",
      "category": "Category name or 'Overall'",
      "message": "Clear, actionable insight (max 100 characters)",
      "icon": "emoji or 📊",
      "priority": 1-5
    }
  ]
}

Focus on:
1. Budget overruns or approaching limits
2. Spending trends (increases/decreases)
3. Category-specific advice
4. Savings opportunities
5. Unusual patterns

Be friendly, concise, and actionable. Return ONLY valid JSON, no markdown formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response (handle markdown code blocks if present)
    let jsonText = text.trim();
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const parsed = JSON.parse(jsonText);
    
    // Format insights to match expected structure
    const insights = parsed.insights
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 5)
      .map(insight => {
        // Find matching category for icon/color
        const category = categories.find(c => c.name === insight.category);
        return {
          type: insight.type || 'info',
          category: insight.category || 'Overall',
          message: insight.message,
          icon: insight.icon || category?.icon || '📊',
          color: category?.color || '#3b82f6'
        };
      });

    return insights;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    
    // Provide helpful error messages
    if (error.message?.includes('404')) {
      console.warn('Model not found. Your API key might not have access to this model, or the model name is incorrect.');
      console.warn('Try checking available models in Google AI Studio or use a different API key.');
    } else if (error.message?.includes('403') || error.message?.includes('API key')) {
      console.warn('API key authentication failed. Please check your VITE_GEMINI_API_KEY in .env file.');
    } else if (error.message?.includes('429')) {
      console.warn('Rate limit exceeded. Please wait a moment and try again.');
    }
    
    // Return null to use fallback
    return null;
  }
}

/**
 * Generate smart budget suggestions using Gemini
 */
export async function generateSmartBudgetSuggestions(transactions, budgets, categories, currency) {
  if (!API_KEY || !genAI) {
    return null;
  }

  try {
    // Use gemini-2.5-pro for budget suggestions (most reliable)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    // Analyze last 3 months
    const now = new Date();
    const monthsData = [];
    for (let i = 1; i <= 3; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date >= monthDate && date <= monthEnd;
      });
      
      const categoryTotals = {};
      monthTransactions.forEach(t => {
        if (t.type === 'expense') {
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        }
      });
      
      monthsData.push(categoryTotals);
    }

    const prompt = `Analyze spending patterns and suggest optimal budgets.

Spending (last 3 months):
${categories.map(cat => {
  const monthlySpending = monthsData.map(m => m[cat.name] || 0);
  const avg = monthlySpending.reduce((a, b) => a + b, 0) / 3;
  return `  ${cat.name}: ${monthlySpending.map(s => s.toFixed(2)).join(', ')} ${currency} (avg: ${avg.toFixed(2)})`;
}).join('\n')}

Current Budgets:
${Object.entries(budgets).map(([cat, amount]) => `  ${cat}: ${amount} ${currency}`).join('\n')}

Suggest optimal budgets for each category based on:
1. Average spending
2. Trends (increasing/decreasing)
3. A 10-15% buffer for unexpected expenses

Return JSON:
{
  "suggestions": [
    {
      "category": "Category name",
      "currentBudget": 500,
      "suggestedBudget": 550,
      "reason": "Brief explanation",
      "confidence": "high|medium|low"
    }
  ]
}

Return ONLY valid JSON, no markdown.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    if (text.includes('```')) {
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const parsed = JSON.parse(text);
    return parsed.suggestions || [];
  } catch (error) {
    console.error('Error generating budget suggestions:', error);
    return null;
  }
}

