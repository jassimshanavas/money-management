import { format, subMonths, parseISO, isThisMonth, startOfMonth, endOfMonth } from 'date-fns';
import { getMonthlyTransactions, getCategoryTotals, calculateTotals } from './helpers';

// AI Insights Generator
export const generateAIInsights = (transactions, budgets, categories, currency) => {
  const insights = [];
  const currentMonth = getMonthlyTransactions(transactions);
  const lastMonth = transactions.filter((t) => {
    const date = parseISO(t.date);
    const lastMonthDate = subMonths(new Date(), 1);
    return date >= startOfMonth(lastMonthDate) && date <= endOfMonth(lastMonthDate);
  });

  const currentCategoryTotals = getCategoryTotals(currentMonth);
  const lastMonthCategoryTotals = getCategoryTotals(lastMonth);

  // Category comparison insights
  categories.forEach((cat) => {
    const current = currentCategoryTotals[cat.name] || 0;
    const last = lastMonthCategoryTotals[cat.name] || 0;
    
    if (last > 0 && current > 0) {
      const change = ((current - last) / last) * 100;
      if (Math.abs(change) > 10) {
        insights.push({
          type: change > 0 ? 'warning' : 'success',
          category: cat.name,
          message: change > 0
            ? `You spent ${Math.abs(change).toFixed(0)}% more on ${cat.name} this month.`
            : `Your ${cat.name} expenses decreased by ${Math.abs(change).toFixed(0)}%. Great job!`,
          icon: cat.icon,
          color: cat.color,
        });
      }
    }
  });

  // Budget alerts
  categories.forEach((cat) => {
    const spent = currentCategoryTotals[cat.name] || 0;
    const budget = budgets[cat.name] || 0;
    if (budget > 0) {
      const percentage = (spent / budget) * 100;
      if (percentage >= 90) {
        insights.push({
          type: percentage >= 100 ? 'error' : 'warning',
          category: cat.name,
          message: percentage >= 100
            ? `You've exceeded your ${cat.name} budget by ${((spent - budget) / budget * 100).toFixed(0)}%!`
            : `You've used ${percentage.toFixed(0)}% of your ${cat.name} budget.`,
          icon: cat.icon,
          color: cat.color,
        });
      }
    }
  });

  // Spending trend insights
  const currentTotals = calculateTotals(currentMonth);
  const lastTotals = calculateTotals(lastMonth);
  
  if (lastTotals.expenses > 0) {
    const expenseChange = ((currentTotals.expenses - lastTotals.expenses) / lastTotals.expenses) * 100;
    if (Math.abs(expenseChange) > 5) {
      insights.push({
        type: expenseChange < 0 ? 'success' : 'info',
        category: 'Overall',
        message: expenseChange < 0
          ? `Overall expenses decreased by ${Math.abs(expenseChange).toFixed(0)}% compared to last month!`
          : `Overall expenses increased by ${expenseChange.toFixed(0)}% compared to last month.`,
        icon: '📊',
        color: expenseChange < 0 ? '#10b981' : '#f59e0b',
      });
    }
  }

  return insights.slice(0, 5); // Return top 5 insights
};

// Smart Budget Suggestions
export const generateBudgetSuggestions = (transactions, currentBudgets, categories) => {
  const suggestions = [];
  const monthlyTransactions = getMonthlyTransactions(transactions);
  const categoryTotals = getCategoryTotals(monthlyTransactions);

  // Calculate average spending over last 3 months
  const last3Months = [];
  for (let i = 1; i <= 3; i++) {
    const monthTransactions = transactions.filter((t) => {
      const date = parseISO(t.date);
      const targetMonth = subMonths(new Date(), i);
      return date >= startOfMonth(targetMonth) && date <= endOfMonth(targetMonth);
    });
    last3Months.push(getCategoryTotals(monthTransactions));
  }

  categories.forEach((cat) => {
    const currentBudget = currentBudgets[cat.name] || 0;
    const last3MonthsAvg = last3Months.reduce((sum, totals) => sum + (totals[cat.name] || 0), 0) / 3;
    const currentMonthSpent = categoryTotals[cat.name] || 0;

    // Suggest budget based on average + 10% buffer
    const suggestedBudget = Math.round(last3MonthsAvg * 1.1);

    if (last3MonthsAvg > 0 && Math.abs(suggestedBudget - currentBudget) > currentBudget * 0.1) {
      suggestions.push({
        category: cat.name,
        icon: cat.icon,
        color: cat.color,
        currentBudget,
        suggestedBudget,
        averageSpending: Math.round(last3MonthsAvg),
        currentSpending: currentMonthSpent,
        reason: suggestedBudget > currentBudget
          ? 'Your average spending is higher than your current budget.'
          : 'You can reduce your budget based on your spending patterns.',
      });
    }
  });

  return suggestions;
};

// Expense Forecasting
export const forecastNextMonth = (transactions, currency) => {
  const forecasts = {
    expenses: 0,
    income: 0,
    categories: {},
  };

  // Calculate average over last 3 months
  const last3Months = [];
  for (let i = 1; i <= 3; i++) {
    const monthTransactions = transactions.filter((t) => {
      const date = parseISO(t.date);
      const targetMonth = subMonths(new Date(), i);
      return date >= startOfMonth(targetMonth) && date <= endOfMonth(targetMonth);
    });
    const totals = calculateTotals(monthTransactions);
    const categoryTotals = getCategoryTotals(monthTransactions);
    last3Months.push({ totals, categoryTotals });
  }

  // Average expenses
  const avgExpenses = last3Months.reduce((sum, m) => sum + m.totals.expenses, 0) / 3;
  const avgIncome = last3Months.reduce((sum, m) => sum + m.totals.income, 0) / 3;

  forecasts.expenses = Math.round(avgExpenses);
  forecasts.income = Math.round(avgIncome);

  // Category forecasts
  const categories = {};
  last3Months.forEach((month) => {
    Object.keys(month.categoryTotals).forEach((cat) => {
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(month.categoryTotals[cat]);
    });
  });

  Object.keys(categories).forEach((cat) => {
    const avg = categories[cat].reduce((sum, val) => sum + val, 0) / categories[cat].length;
    forecasts.categories[cat] = Math.round(avg);
  });

  // Trend analysis
  const trends = {
    expenses: last3Months.length >= 2
      ? ((last3Months[0].totals.expenses - last3Months[2].totals.expenses) / last3Months[2].totals.expenses) * 100
      : 0,
    income: last3Months.length >= 2
      ? ((last3Months[0].totals.income - last3Months[2].totals.income) / last3Months[2].totals.income) * 100
      : 0,
  };

  return { ...forecasts, trends };
};

// Detect Recurring Transactions
export const detectRecurringTransactions = (transactions) => {
  const recurring = [];
  const transactionGroups = {};

  // Group by description and amount (similar transactions)
  transactions.forEach((t) => {
    if (t.type === 'expense') {
      const key = `${t.description?.toLowerCase() || t.category}_${t.amount.toFixed(2)}`;
      if (!transactionGroups[key]) {
        transactionGroups[key] = [];
      }
      transactionGroups[key].push(t);
    }
  });

  // Find transactions that occur at least 2 times
  Object.keys(transactionGroups).forEach((key) => {
    const group = transactionGroups[key];
    if (group.length >= 2) {
      // Check if they're roughly monthly (within 25-35 days apart)
      const dates = group.map((t) => parseISO(t.date)).sort((a, b) => b - a);
      let isRecurring = false;
      
      for (let i = 0; i < dates.length - 1; i++) {
        const diffDays = (dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24);
        if (diffDays >= 25 && diffDays <= 35) {
          isRecurring = true;
          break;
        }
      }

      if (isRecurring) {
        recurring.push({
          description: group[0].description || group[0].category,
          category: group[0].category,
          amount: group[0].amount,
          frequency: 'monthly',
          lastTransaction: dates[0],
          count: group.length,
        });
      }
    }
  });

  return recurring;
};

// Tax Estimator
export const estimateTax = (transactions, taxRates = {}) => {
  const defaultRates = {
    income: 0.20, // 20% income tax
    deductions: {
      healthcare: 0.10,
      education: 0.15,
    },
  };

  const rates = { ...defaultRates, ...taxRates };
  
  const monthlyTransactions = getMonthlyTransactions(transactions);
  const { income } = calculateTotals(monthlyTransactions);
  
  // Annual estimates (multiply by 12)
  const annualIncome = income * 12;
  
  // Deductions
  const categoryTotals = getCategoryTotals(monthlyTransactions);
  const healthcareDeduction = (categoryTotals.Healthcare || 0) * 12 * rates.deductions.healthcare;
  const educationDeduction = (categoryTotals.Education || 0) * 12 * rates.deductions.education;
  
  const totalDeductions = healthcareDeduction + educationDeduction;
  const taxableIncome = Math.max(0, annualIncome - totalDeductions);
  const estimatedTax = taxableIncome * rates.income;
  
  return {
    annualIncome,
    totalDeductions,
    taxableIncome,
    estimatedTax,
    effectiveRate: annualIncome > 0 ? (estimatedTax / annualIncome) * 100 : 0,
    deductions: {
      healthcare: healthcareDeduction,
      education: educationDeduction,
    },
  };
};

