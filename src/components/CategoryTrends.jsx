import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import TransactionCalendar from './TransactionCalendar';
import MonthRangePicker from './MonthRangePicker';
import { AreaChart, Area, BarChart, Bar, ComposedChart, LineChart, Line, ReferenceArea, ReferenceLine, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight, Activity, X, BarChart2, LineChart as LineChartIcon, Sparkles, Target } from 'lucide-react';
import {
    parseISO,
    subDays,
    subMonths,
    addMonths,
    startOfDay,
    endOfDay,
    startOfMonth,
    endOfMonth,
    differenceInDays,
    format as formatDateFns,
    eachDayOfInterval,
    eachWeekOfInterval,
    eachMonthOfInterval,
    isSameDay,
    isAfter,
    isBefore,
    addDays
} from 'date-fns';

export default function CategoryTrends() {
    const { transactions, currency, categories, wallets, filterWallet, setFilterWallet } = useApp();

    const [transactionType, setTransactionType] = useState('expense'); // 'expense' or 'income'
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [activePreset, setActivePreset] = useState('30days');
    const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
    const [selectedDataPoint, setSelectedDataPoint] = useState(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [chartType, setChartType] = useState('area'); // 'area' or 'bar'
    const [compareMode, setCompareMode] = useState(false);
    const [compareCategories, setCompareCategories] = useState([]);

    const categoryScrollRef = useRef(null);

    // Filter transactions by wallet
    const walletTransactions = useMemo(() => {
        if (filterWallet === 'All') return transactions;
        return transactions.filter(t => String(t.walletId) === String(filterWallet));
    }, [transactions, filterWallet]);

    // Determine which categories are valid for the selected type
    const availableCategories = useMemo(() => {
        // Get all categories used in transactions of this type, plus standard categories that match the type
        const typeFiltered = walletTransactions.filter(t => {
            if (!t) return false;
            if (transactionType === 'expense') {
                return t.type === 'expense' || (t.isTransfer && t.transferType === 'interest');
            } else {
                return t.type === 'income' && !t.isTransfer;
            }
        });

        // Extract unique category names from transactions and map them to category objects
        const usedCategoryNames = new Set(typeFiltered.map(t => {
            if (!t) return 'Other';
            const isTransfer = t.isTransfer || t.type === 'transfer';
            return isTransfer ? (t.transferType === 'interest' ? 'Interest' : 'Transfer') : (t.category || 'Other');
        }));

        const result = categories.filter(c => usedCategoryNames.has(c.name));

        // Sort by name or some importance
        return result;
    }, [walletTransactions, transactionType, categories]);

    // Set default selected category when type changes or on load
    useEffect(() => {
        if (availableCategories.length > 0 && (!selectedCategory || !availableCategories.find(c => c.name === selectedCategory.name))) {
            setSelectedCategory(availableCategories[0]);
        }
    }, [availableCategories, transactionType, selectedCategory]);

    const categoryScopedTransactions = useMemo(() => {
        if (!selectedCategory) return [];

        return walletTransactions.filter(t => {
            if (!t) return false;
            const isTransfer = t.isTransfer || t.type === 'transfer';
            const displayCategory = isTransfer ? (t.transferType === 'interest' ? 'Interest' : 'Transfer') : (t.category || 'Other');

            const isCorrectType = transactionType === 'expense'
                ? (t.type === 'expense' || (isTransfer && t.transferType === 'interest'))
                : (t.type === 'income' && !t.isTransfer);

            return displayCategory === selectedCategory.name && isCorrectType;
        });
    }, [walletTransactions, selectedCategory, transactionType]);

    // --- Compare mode helpers ---
    const toggleCompareCategory = (cat) => {
        setCompareCategories(prev => {
            const exists = prev.find(c => c.name === cat.name);
            if (exists) return prev.filter(c => c.name !== cat.name);
            if (prev.length >= 5) return prev; // max 5
            return [...prev, cat];
        });
    };

    // Build time-series data for all compare categories over the current date range
    const compareChartData = useMemo(() => {
        if (!compareMode || compareCategories.length === 0) return [];

        const days = differenceInDays(dateRange.to, dateRange.from);
        let intervals = [];
        let formatStr = '';
        if (days <= 35) {
            intervals = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
            formatStr = 'MMM dd';
        } else if (days <= 180) {
            intervals = eachWeekOfInterval({ start: dateRange.from, end: dateRange.to });
            formatStr = "'Wk' MMM dd";
        } else {
            intervals = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
            formatStr = 'MMM yyyy';
        }

        const isCorrectType = (t) => {
            if (!t) return false;
            const isTransfer = t.isTransfer || t.type === 'transfer';
            return transactionType === 'expense'
                ? (t.type === 'expense' || (isTransfer && t.transferType === 'interest'))
                : (t.type === 'income' && !t.isTransfer);
        };

        const getCategoryName = (t) => {
            const isTransfer = t.isTransfer || t.type === 'transfer';
            return isTransfer ? (t.transferType === 'interest' ? 'Interest' : 'Transfer') : (t.category || 'Other');
        };

        return intervals.map(intervalDate => {
            const point = { 
                date: intervalDate, 
                label: formatDateFns(intervalDate, formatStr)
            };
            compareCategories.forEach(cat => {
                let amount = 0;
                walletTransactions.forEach(t => {
                    if (!isCorrectType(t)) return;
                    if (getCategoryName(t) !== cat.name) return;
                    const d = parseISO(t.date);
                    let matches = false;
                    if (days <= 35) {
                        matches = isSameDay(d, intervalDate);
                    } else if (days <= 180) {
                        const nextWeek = addDays(intervalDate, 7);
                        matches = (isAfter(d, intervalDate) || isSameDay(d, intervalDate)) && isBefore(d, nextWeek);
                    } else {
                        matches = d?.getMonth?.() === intervalDate.getMonth() && d?.getFullYear?.() === intervalDate.getFullYear();
                    }
                    if (matches) amount += (t.amount || 0);
                });
                
                point[cat.name] = amount || null;
            });
            return point;
        });
    }, [compareMode, compareCategories, walletTransactions, dateRange, transactionType]);

    // Totals per compare category over the period
    const compareTotals = useMemo(() => {
        if (!compareMode || compareCategories.length === 0) return {};
        const totals = {};
        compareCategories.forEach(cat => {
            totals[cat.name] = compareChartData.reduce((sum, p) => sum + (p[cat.name] || 0), 0);
        });
        return totals;
    }, [compareMode, compareCategories, compareChartData]);


    const handlePresetSelect = (preset) => {
        setActivePreset(preset);
        setSelectedDataPoint(null); // Clear active point on range change
        setShowCalendar(false);     // Hide calendar if shown
        const end = new Date();
        let start;

        switch (preset) {
            case '7days': start = subDays(end, 7); break;
            case '30days': start = subDays(end, 30); break;
            case '3months': start = subMonths(end, 3); break;
            case '6months': start = subMonths(end, 6); break;
            case '1year': start = subMonths(end, 12); break;
            case 'thisYear':
                start = new Date(end.getFullYear(), 0, 1);
                break;
            case 'lastYear':
                start = new Date(end.getFullYear() - 1, 0, 1);
                end.setFullYear(end.getFullYear() - 1, 11, 31);
                break;
            case 'all':
                if (walletTransactions.length === 0) {
                    start = subDays(end, 30);
                } else {
                    const oldest = [...walletTransactions].sort((a, b) => new Date(a.date) - new Date(b.date))[0];
                    start = parseISO(oldest.date);
                }
                break;
            default: start = subDays(end, 30);
        }
        setDateRange({ from: startOfDay(start), to: endOfDay(end) });
    };

    // Get current period transactions
    const { currentPeriodTransactions, previousPeriodTransactions } = useMemo(() => {
        if (!selectedCategory) return { currentPeriodTransactions: [], previousPeriodTransactions: [] };

        const currentPeriod = categoryScopedTransactions.filter(t => {
            const d = parseISO(t.date);
            return (isAfter(d, startOfDay(dateRange.from)) || isSameDay(d, dateRange.from)) &&
                (isBefore(d, endOfDay(dateRange.to)) || isSameDay(d, dateRange.to));
        });

        // Calculate previous period for trend comparison
        const daysDiff = differenceInDays(dateRange.to, dateRange.from) || 1;
        const prevTo = subDays(dateRange.from, 1);
        const prevFrom = subDays(prevTo, daysDiff);

        const previousPeriod = categoryScopedTransactions.filter(t => {
            const d = parseISO(t.date);
            return (isAfter(d, startOfDay(prevFrom)) || isSameDay(d, prevFrom)) &&
                (isBefore(d, endOfDay(prevTo)) || isSameDay(d, prevTo));
        });

        return {
            currentPeriodTransactions: currentPeriod.sort((a, b) => new Date(b.date) - new Date(a.date)),
            previousPeriodTransactions: previousPeriod
        };
    }, [categoryScopedTransactions, selectedCategory, dateRange]);

    const activeIntervalType = useMemo(() => {
        if (chartType === 'bar') return 'month';
        const days = differenceInDays(dateRange.to, dateRange.from);
        if (days <= 35) return 'day';
        if (days <= 180) return 'week';
        return 'month';
    }, [dateRange, chartType]);

    // Generate chart data grouped dynamically
    const chartData = useMemo(() => {
        if (!selectedCategory || !dateRange.from) return [];

        const days = differenceInDays(dateRange.to, dateRange.from);
        let intervals = [];
        let formatStr = '';

        if (activeIntervalType === 'day') {
            intervals = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
            formatStr = 'MMM dd';
        } else if (activeIntervalType === 'week') {
            intervals = eachWeekOfInterval({ start: dateRange.from, end: dateRange.to });
            formatStr = "'Week of' MMM dd";
        } else {
            intervals = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
            formatStr = 'MMM yyyy';
        }

        const dataPoints = intervals.map(intervalDate => {
            let amount = 0;

            currentPeriodTransactions.forEach(t => {
                const d = parseISO(t.date);

                let matches = false;
                if (activeIntervalType === 'day') {
                    matches = isSameDay(d, intervalDate);
                } else if (activeIntervalType === 'week') {
                    const nextWeek = addDays(intervalDate, 7);
                    matches = (isAfter(d, intervalDate) || isSameDay(d, intervalDate)) && isBefore(d, nextWeek);
                } else {
                    matches = d?.getMonth?.() === intervalDate.getMonth() && d?.getFullYear?.() === intervalDate.getFullYear();
                }

                if (matches) amount += (t.amount || 0);
            });

            return {
                date: intervalDate,
                label: formatDateFns(intervalDate, formatStr),
                amount,
            };
        });

        return dataPoints;
    }, [dateRange, currentPeriodTransactions, selectedCategory, activeIntervalType]);

    // Filter displayed transactions if a point is clicked
    const displayedTransactions = useMemo(() => {
        if (!selectedDataPoint) return currentPeriodTransactions;

        return currentPeriodTransactions.filter(t => {
            if (!t) return false;
            const d = parseISO(t.date);
            if (activeIntervalType === 'day') {
                return isSameDay(d, selectedDataPoint.date);
            } else if (activeIntervalType === 'week') {
                const nextWeek = addDays(selectedDataPoint.date, 7);
                return (isAfter(d, selectedDataPoint.date) || isSameDay(d, selectedDataPoint.date)) && isBefore(d, nextWeek);
            } else {
                return d?.getMonth?.() === selectedDataPoint.date.getMonth() && d?.getFullYear?.() === selectedDataPoint.date.getFullYear();
            }
        });
    }, [currentPeriodTransactions, selectedDataPoint, activeIntervalType]);

    // Metrics calculations
    const totalCurrent = currentPeriodTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalPrevious = previousPeriodTransactions.reduce((sum, t) => sum + t.amount, 0);

    const intervalsCount = chartData.length || 1;
    const averageVelocity = totalCurrent / intervalsCount;

    let trendPercentage = 0;
    if (totalPrevious > 0) {
        trendPercentage = ((totalCurrent - totalPrevious) / totalPrevious) * 100;
    } else if (totalCurrent > 0) {
        trendPercentage = 100; // Infinity, effectively
    }

    const isTrendGood = transactionType === 'expense' ? trendPercentage <= 0 : trendPercentage >= 0;

    const predictor = useMemo(() => {
        if (!selectedCategory || categoryScopedTransactions.length === 0) return null;

        const today = new Date();
        // Use up to 6 months of history for the ML signals
        const historyMonths = eachMonthOfInterval({
            start: startOfMonth(subMonths(today, 6)),
            end: startOfMonth(today)
        });

        const monthlyHistory = historyMonths.map(monthDate => {
            const monthStart = startOfMonth(monthDate);
            const monthEnd = endOfMonth(monthDate);
            const txns = categoryScopedTransactions.filter(t => {
                const d = parseISO(t.date);
                return d >= monthStart && d <= monthEnd;
            });
            const rawAmount = txns.reduce((sum, t) => sum + (t.amount || 0), 0);
            const isCurrentMonth = monthDate.getMonth() === today.getMonth() && monthDate.getFullYear() === today.getFullYear();
            const daysInMonth = monthEnd.getDate();
            const daysElapsed = isCurrentMonth ? Math.max(1, today.getDate()) : daysInMonth;
            // Weighted run-rate: weight observed days heavier later in month; interpolate linearly
            const completionRatio = daysElapsed / daysInMonth;
            const runRate = isCurrentMonth && completionRatio > 0
                ? rawAmount / completionRatio
                : rawAmount;
            // Blend observed + projected; later in month trust observed more
            const signalAmount = isCurrentMonth
                ? (runRate * (1 - completionRatio * 0.5)) + (rawAmount * (completionRatio * 0.5))
                : rawAmount;
            return { date: monthDate, label: formatDateFns(monthDate, 'MMM'), rawAmount, signalAmount, txnCount: txns.length, isCurrentMonth, completionRatio };
        });

        const currentMonthData = monthlyHistory[monthlyHistory.length - 1];

        // --- Signal 1: Exponential Weighted Moving Average (EWMA) ---
        // Lambda 0.75 → recent months get ~3x weight of oldest
        const lambda = 0.75;
        const historicalMonths = monthlyHistory.filter(m => !m.isCurrentMonth);
        let ewma = historicalMonths[0]?.signalAmount || 0;
        for (let i = 1; i < historicalMonths.length; i++) {
            ewma = lambda * historicalMonths[i].signalAmount + (1 - lambda) * ewma;
        }
        // Incorporate current month signal with completion-ratio weighting
        const currentSignal = currentMonthData.signalAmount;
        ewma = lambda * currentSignal + (1 - lambda) * ewma;

        // --- Signal 2: Ordinary Least Squares linear trend on signal series ---
        const signals = monthlyHistory.map(m => m.signalAmount);
        const n = signals.length;
        const xMean = (n - 1) / 2;
        const yMean = signals.reduce((s, v) => s + v, 0) / n;
        let ssxy = 0, ssxx = 0;
        signals.forEach((v, i) => { ssxy += (i - xMean) * (v - yMean); ssxx += (i - xMean) ** 2; });
        const slope = ssxx > 0 ? ssxy / ssxx : 0;  // $/month trend
        const intercept = yMean - slope * xMean;
        const linearForecast = intercept + slope * n; // predict index=n (next month)

        // --- Signal 3: Outlier-resistant median of last 3 non-current months ---
        const last3 = historicalMonths.slice(-3).map(m => m.signalAmount);
        const sorted3 = [...last3].sort((a, b) => a - b);
        const median3 = sorted3[Math.floor(sorted3.length / 2)] || ewma;

        // --- Ensemble: blend EWMA + trend + median ---
        // Give more weight to trend if slope is consistent, less if noisy
        const trendStrength = Math.min(1, Math.abs(slope) / (Math.max(yMean, 1) * 0.15));
        const rawPrediction = (ewma * 0.45) + (linearForecast * (0.3 + trendStrength * 0.15)) + (median3 * (0.25 - trendStrength * 0.10));

        // Cap wild overshoots: never exceed 2× max observed
        const maxObserved = Math.max(...signals.filter(v => v > 0), 1);
        const predictedAmount = Math.max(0, Math.round(Math.min(rawPrediction, maxObserved * 2.0)));

        // --- Confidence & corridor ---
        const mean = yMean;
        const variance = signals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n || 1);
        const stdDev = Math.sqrt(variance);
        const cv = mean > 0 ? stdDev / mean : 1; // coefficient of variation
        const sampleDepth = Math.min(1, categoryScopedTransactions.length / 8);
        const trendConsistency = n >= 2 ? Math.min(1, 1 - Math.min(1, Math.abs(slope) / (Math.max(stdDev, 1)))) : 0.5;
        const confidenceScore = Math.round(Math.max(38, Math.min(94,
            55 * (1 - Math.min(cv, 1)) +
            22 * sampleDepth +
            17 * trendConsistency
        )));

        // Use 1-sigma corridor, widened for high volatility
        const corridorSigma = 0.85 + cv * 0.6;
        const corridor = corridorSigma * stdDev;
        const lowerBound = Math.max(0, Math.round(predictedAmount - corridor));
        const upperBound = Math.round(predictedAmount + corridor);

        // --- Current month projection ---
        const projectedCurrentMonth = Math.max(
            currentMonthData.rawAmount,
            Math.round(currentMonthData.signalAmount)
        );
        const currentMonthGap = Math.max(0, projectedCurrentMonth - currentMonthData.rawAmount);

        // --- Direction & delta ---
        const anchorAmount = projectedCurrentMonth || currentMonthData.rawAmount || ewma;
        const delta = predictedAmount - anchorAmount;
        const deadband = Math.max(predictedAmount * 0.05, corridor * 0.2);
        const direction = Math.abs(delta) < deadband ? 'steady' : (delta > 0 ? 'up' : 'down');
        const deltaPercent = anchorAmount > 0 ? (delta / anchorAmount) * 100 : 0;

        // --- Trend label for human display ---
        const trendLabel = slope > stdDev * 0.1 ? 'Rising' : slope < -stdDev * 0.1 ? 'Falling' : 'Stable';
        const sliceLabel = slope > 0 ? `+${formatCurrency(Math.round(slope), currency)}/mo` : `${formatCurrency(Math.round(slope), currency)}/mo`;

        // --- Forecast chart data ---
        const nextMonth = startOfMonth(addMonths(today, 1));

        const forecastData = monthlyHistory.map((month) => ({
            label: month.label,
            actual: month.rawAmount || null,
            runRate: month.isCurrentMonth && month.rawAmount < projectedCurrentMonth ? projectedCurrentMonth : null,
            // forecastLine runs across ALL months with data, so the dotted curve starts
            // from the very first actual data point and extends through to the forecast —
            // the solid actual line sits on top for confirmed history, dotted continues beyond
            forecastLine: month.isCurrentMonth
                ? (projectedCurrentMonth || month.rawAmount || null)
                : (month.rawAmount > 0 ? month.rawAmount : null),
            lowerBound: null,
            upperBound: null,
            isForecast: false,
            isCurrentMonth: month.isCurrentMonth,
        }));
        forecastData.push({
            label: formatDateFns(nextMonth, 'MMM'),
            actual: null,
            runRate: null,
            forecastLine: predictedAmount,
            lowerBound,
            upperBound,
            predicted: predictedAmount,
            isForecast: true,
            isCurrentMonth: false,
        });

        // --- Smart insight text ---
        const insightPhrases = {
            up: [
                `${selectedCategory.name} is on a ${trendLabel.toLowerCase()} trajectory — next month could climb ${Math.abs(deltaPercent).toFixed(0)}% above where this month lands.`,
                `Momentum in ${selectedCategory.name} is building. The model expects a ${formatCurrency(Math.abs(delta), currency)} lift heading into ${formatDateFns(nextMonth, 'MMMM')}.`,
            ],
            down: [
                `${selectedCategory.name} looks set to cool down next month — the model projects a ${formatCurrency(Math.abs(delta), currency)} drop from this month's run-rate.`,
                `A ${trendLabel.toLowerCase()} signal in ${selectedCategory.name} suggests you may spend less in ${formatDateFns(nextMonth, 'MMMM')}. Nice.`,
            ],
            steady: [
                `${selectedCategory.name} is holding a steady pace. Next month should look very similar to this month's landed total.`,
                `No major momentum detected in ${selectedCategory.name}. Forecasting a largely flat ${formatDateFns(nextMonth, 'MMMM')}.`,
            ],
        };
        const pick = insightPhrases[direction];
        const insight = pick[Math.floor((categoryScopedTransactions.length % pick.length))];

        return {
            predictedAmount, projectedCurrentMonth, currentMonthGap,
            confidenceScore, lowerBound, upperBound, delta, deltaPercent,
            direction, trendLabel, sliceLabel,
            chartData: forecastData,
            currentLabel: currentMonthData?.label || formatDateFns(today, 'MMM'),
            nextLabel: formatDateFns(nextMonth, 'MMMM'),
            insight,
            cv: Math.round(cv * 100),
        };
    }, [selectedCategory, categoryScopedTransactions, currency]);

    const handleChartClick = (data) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const clickedPoint = data.activePayload[0].payload;
            if (selectedDataPoint && selectedDataPoint.label === clickedPoint.label) {
                setSelectedDataPoint(null); // Click again to toggle off
            } else {
                setSelectedDataPoint(clickedPoint);
            }
        }
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-card p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">{label}</p>
                    <p className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: selectedCategory?.color || '#14b8a6' }}
                        />
                        {formatCurrency(payload[0].value, currency)}
                    </p>
                </div>
            );
        }
        return null;
    };

    const PredictorTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;
        const entries = payload.filter(item => item.value !== null && item.value !== undefined && item.value !== 0);
        if (!entries.length) return null;

        const getLabel = (key) => {
            if (key === 'actual') return 'Actual';
            if (key === 'runRate') return 'Run-rate projection';
            if (key === 'predicted') return '★ Forecast';
            if (key === 'lowerBound') return 'Low estimate';
            if (key === 'upperBound') return 'High estimate';
            return key;
        };

        return (
            <div className="glass-card p-3 border border-slate-200 dark:border-slate-700 min-w-[190px] shadow-xl">
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
                {entries.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 py-0.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{getLabel(item.dataKey)}</span>
                        <span className={`text-sm font-bold ${
                            item.dataKey === 'predicted' ? 'text-slate-800 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                        }`}>{formatCurrency(item.value, currency)}</span>
                    </div>
                ))}
            </div>
        );
    };

    const CompareTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;
        const entries = payload.filter(p => p.value !== null && p.value !== undefined && p.value > 0);
        if (!entries.length) return null;
        return (
            <div className="glass-card p-3 border border-slate-200 dark:border-slate-700 min-w-[210px] shadow-xl">
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
                {entries.map((entry, i) => {
                    const cat = compareCategories.find(c => c.name === entry.dataKey);
                    return (
                        <div key={i} className="flex items-center justify-between gap-3 py-1">
                            <span className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat?.color || entry.color }} />
                                {cat?.icon} {entry.dataKey}
                            </span>
                            <span className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(entry.value, currency)}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Guard: selectedCategory may be null on first render before useEffect fires
    if (!selectedCategory && !compareMode && availableCategories.length === 0) {
        return (
            <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-5xl mb-4">📊</div>
                    <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No category data yet</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Add some transactions to see trends.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
            <div className="mb-4 sm:mb-8 animate-fade-in">
                <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 text-slate-800 dark:text-white">Category Trends</h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">Analyze how your spending and income categories evolve over time.</p>
            </div>

            {/* Top Controls: Type, Compare & Wallet */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                {/* Expense/Income Toggle + Compare Mode */}
                <div className="glass-card p-1 sm:p-2 animate-slide-up flex sm:inline-flex w-full sm:w-auto">
                    <div className="flex gap-1 w-full sm:w-auto">
                        {[
                            { id: 'expense', label: 'Expenses', icon: <TrendingDown size={18} />, color: '#ef4444' },
                            { id: 'income', label: 'Income', icon: <TrendingUp size={18} />, color: '#22c55e' }
                        ].map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => { setTransactionType(preset.id); setSelectedCategory(null); setCompareCategories([]); }}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all ${transactionType === preset.id
                                    ? 'text-white shadow-lg scale-105 z-10'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                style={{
                                    backgroundColor: transactionType === preset.id ? preset.color : undefined,
                                    boxShadow: transactionType === preset.id ? `0 4px 15px ${preset.color}40` : undefined
                                }}
                            >
                                {preset.icon}
                                <span className="hidden sm:inline">{preset.label}</span>
                                <span className="sm:hidden w-full text-center">{preset.id === 'expense' ? 'Exp' : 'Inc'}</span>
                            </button>
                        ))}
                        {/* Compare Mode Toggle */}
                        <button
                            onClick={() => {
                                setCompareMode(m => !m);
                                setCompareCategories([]);
                                setSelectedDataPoint(null);
                            }}
                            className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                                compareMode
                                    ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200 dark:shadow-violet-900/40'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400'
                            }`}
                        >
                            <BarChart2 size={15} />
                            <span className="hidden sm:inline">Compare</span>
                        </button>
                    </div>
                </div>

                {/* Wallet Toggle */}
                <div className="glass-card p-1 sm:p-2 animate-slide-up flex flex-1 w-full sm:w-auto">
                    <div className="flex gap-2 w-full h-full">
                        <div className="relative flex items-center bg-slate-100/50 dark:bg-slate-800/50 sm:bg-slate-100 sm:dark:bg-slate-800 rounded-xl px-4 flex-1 transition-colors">
                            <span className="text-xl mr-2 pointer-events-none">💼</span>
                            <select
                                value={filterWallet}
                                onChange={(e) => setFilterWallet(e.target.value)}
                                className="bg-transparent text-slate-700 dark:text-slate-300 font-medium outline-none appearance-none pr-4 cursor-pointer h-full py-2 shadow-none border-none focus:ring-0"
                            >
                                <option value="All">All Wallets</option>
                                {wallets.map((wallet) => (
                                    <option key={wallet.id} value={wallet.id}>
                                        {wallet.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Horizontal Selector */}
            <div className="mb-6 animate-slide-up sm:glass-card sm:p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2 sm:mb-3 px-1 sm:px-2">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {compareMode
                            ? `Select categories to compare (${compareCategories.length}/5 selected)`
                            : `Select ${transactionType === 'expense' ? 'Expense' : 'Income'} Category`}
                    </h3>
                    {compareMode && compareCategories.length > 0 && (
                        <button
                            onClick={() => setCompareCategories([])}
                            className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1"
                        >
                            <X size={12} /> Clear all
                        </button>
                    )}
                </div>

                {availableCategories.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                        No {transactionType} records found for this wallet.
                    </div>
                ) : (
                    <div
                        ref={categoryScrollRef}
                        className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 scrollbar-hide sm:scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 px-1 sm:px-2"
                    >
                        {availableCategories.map(cat => {
                            const isCompareSelected = compareCategories.find(c => c.name === cat.name);
                            const compareIndex = compareCategories.findIndex(c => c.name === cat.name);
                            const isSingleSelected = !compareMode && selectedCategory?.name === cat.name;
                            const isSelected = compareMode ? !!isCompareSelected : isSingleSelected;
                            const isDisabled = compareMode && !isCompareSelected && compareCategories.length >= 5;
                            return (
                                <button
                                    key={cat.name}
                                    onClick={() => compareMode ? toggleCompareCategory(cat) : setSelectedCategory(cat)}
                                    disabled={isDisabled}
                                    className={`relative flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 rounded-xl min-w-max transition-all ${
                                        isDisabled ? 'opacity-40 cursor-not-allowed' :
                                        isSelected
                                            ? 'shadow-md sm:shadow-lg ring-2 ring-offset-2 dark:ring-offset-slate-900 border-transparent sm:scale-105'
                                            : 'border-2 border-transparent sm:border-slate-200 sm:dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 backdrop-blur-md sm:bg-white dark:bg-slate-800/50 sm:dark:bg-slate-800'
                                    }`}
                                    style={{
                                        backgroundColor: isSelected ? `${cat.color}15` : undefined,
                                        borderColor: isSelected ? cat.color : undefined,
                                        ringColor: isSelected ? cat.color : undefined,
                                    }}
                                >
                                    {/* Numbered badge in compare mode */}
                                    {compareMode && isCompareSelected && (
                                        <span
                                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-md z-10"
                                            style={{ backgroundColor: cat.color }}
                                        >
                                            {compareIndex + 1}
                                        </span>
                                    )}
                                    <div
                                        className="w-10 h-10 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xl sm:text-xl transition-transform"
                                        style={{ backgroundColor: `${cat.color}20` }}
                                    >
                                        {cat.icon || '📦'}
                                    </div>
                                    <span className={`font-medium text-xs sm:text-base ${isSelected ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {cat.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── HEADER / SUMMARY SECTION (Adaptive) ── */}
            <div className="glass-card sm:p-5 mb-6 animate-slide-up relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-5 sm:p-0">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0"
                            style={{ backgroundColor: compareMode ? '#7c3aed20' : `${selectedCategory?.color}20` }}
                        >
                            {compareMode ? '📊' : selectedCategory?.icon}
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                {compareMode ? 'Category Comparison' : `${selectedCategory?.name} Trend`}
                                {compareMode && (
                                    <span className="text-xs bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400 px-2 py-0.5 rounded-full font-bold">
                                        {compareCategories.length} items
                                    </span>
                                )}
                            </h2>
                            {!compareMode && (
                                <div className="flex items-center gap-2 mt-1">
                                    <span
                                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                                            trendPercentage <= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                        }`}
                                    >
                                        {trendPercentage <= 0 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                                        {Math.abs(trendPercentage).toFixed(1)}% {trendPercentage <= 0 ? 'decrease' : 'increase'}
                                    </span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500">vs previous {differenceInDays(dateRange.to, dateRange.from)}d</span>
                                </div>
                            )}
                            {compareMode && (
                                <div className="flex items-center gap-3 mt-1.5">
                                    {compareCategories.slice(0, 3).map(cat => (
                                        <div key={cat.name} className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold" style={{ color: cat.color }}>
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                            {cat.name}
                                        </div>
                                    ))}
                                    {compareCategories.length > 3 && <span className="text-[10px] text-slate-400 font-bold">+{compareCategories.length - 3} more</span>}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 self-end sm:self-auto">
                        <div className="hidden sm:flex glass-card p-1">
                            {['Trend', 'Monthly'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setChartType(type.toLowerCase())}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                                        chartType === type.toLowerCase()
                                            ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                                >
                                    {type === 'Trend' ? <LineChartIcon size={14} /> : <BarChart2 size={14} />}
                                    {type}
                                </button>
                            ))}
                        </div>

                        {/* Date Preset Selection (Shared) */}
                        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-hide">
                            {[
                                { id: '7days', label: '7D' },
                                { id: '30days', label: '1M' },
                                { id: '3months', label: '3M' },
                                { id: '6months', label: '6M' },
                                { id: '1year', label: '1Y' },
                                { id: 'all', label: 'All' }
                            ].map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => handlePresetSelect(preset.id)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all min-w-[36px] ${
                                        activePreset === preset.id
                                            ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm'
                                            : 'text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50 hover:text-slate-600'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                            <button
                                onClick={() => setShowCalendar(!showCalendar)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center ${
                                    showCalendar
                                        ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm'
                                        : 'text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50 transition-all'
                                }`}
                            >
                                <Calendar size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Calendar Dropdown */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showCalendar ? 'max-h-[500px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-center gap-8">
                        <TransactionCalendar
                            dateRange={dateRange}
                            setDateRange={(range) => {
                                setDateRange(range);
                                setActivePreset('custom');
                            }}
                        />
                        <div className="flex flex-col items-center justify-center gap-4">
                            <div className="text-center">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Custom Range Selection</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {formatDate(dateRange.from)} — {formatDate(dateRange.to)}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCalendar(false)}
                                className="px-8 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
                            >
                                Apply Range
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── COMPARE MODE CHART ── */}
            {compareMode && (
                <div className="animate-slide-up">
                    {compareCategories.length < 2 ? (
                        <div className="glass-card p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 mb-6">
                            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                                ⚖️
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Ready to compare?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-500 max-w-xs mx-auto mb-6">
                                Select at least <strong>two categories</strong> from the list above to see them mapped side-by-side.
                            </p>
                        </div>
                    ) : (
                        <div className="glass-card p-5 sm:p-6 mb-6 relative overflow-hidden">
                            <div className="h-72 sm:h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={compareChartData} margin={{ top: 10, right: 20, left: 15, bottom: 0 }}>
                                    <defs>
                                        {compareCategories.map((cat, i) => (
                                            <linearGradient key={`catGrad-${i}`} id={`catGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={cat.color} stopOpacity={0.15} />
                                                <stop offset="100%" stopColor={cat.color} stopOpacity={0} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.3} />
                                    <XAxis
                                        dataKey="label"
                                        axisLine={false} tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 11 }}
                                        dy={10} minTickGap={28}
                                    />
                                    <YAxis
                                        axisLine={false} tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 11 }}
                                        tickFormatter={v => {
                                            if (v === 0) return '0';
                                            return formatCurrency(v, currency).replace(/[^\d.,kKmMbB₹$€£¥]/g, '').slice(0, 7);
                                        }}
                                        dx={-8}
                                    />
                                    <RechartsTooltip content={<CompareTooltip />} />
                                    
                                    {compareCategories.map((cat, i) => (
                                        <React.Fragment key={cat.name}>
                                            <Area
                                                type="monotone"
                                                dataKey={cat.name}
                                                stroke="none"
                                                fill={`url(#catGrad-${i})`}
                                                connectNulls
                                                animationDuration={1500}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey={cat.name}
                                                stroke={cat.color}
                                                strokeWidth={3}
                                                dot={{ r: 4.5, fill: cat.color, stroke: '#fff', strokeWidth: 2 }}
                                                activeDot={{ r: 7, fill: cat.color, stroke: '#fff', strokeWidth: 2.5 }}
                                                connectNulls
                                                animationDuration={1000 + i * 200}
                                            />
                                        </React.Fragment>
                                    ))}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── SINGLE CATEGORY ANALYSIS (hidden in compare mode) ── */}
            {!compareMode && selectedCategory ? (
                <>
                    <div className="glass-card p-4 sm:p-6 mb-6 animate-slide-up">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Custom Range Selection</p>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    Refine the timeline for {selectedCategory.name}
                                </p>
                            </div>
                            <MonthRangePicker
                                dateRange={dateRange}
                                onDateRangeChange={(range) => {
                                    if (range.from && range.to) {
                                        setDateRange(range);
                                        setActivePreset('custom');
                                        setSelectedDataPoint(null);
                                    }
                                }}
                            />
                        </div>
                    </div>

                        {/* Main Visualization Card - Chart & Metrics */}
                        <div className="glass-card p-6 md:p-8 mb-6 animate-slide-up relative overflow-hidden">

                            {/* Metrics Row */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 z-10 relative">
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-100 dark:border-slate-700/50">
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-1">Period Total</p>
                                    <p className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-white">
                                        {formatCurrency(totalCurrent, currency)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-100 dark:border-slate-700/50">
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                                        <Activity size={14} className="text-teal-500" />
                                        Avg Velocity
                                    </p>
                                    <p className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-white flex items-end gap-1">
                                        {formatCurrency(chartType === 'bar' ? (chartData.length > 0 ? totalCurrent / chartData.length : 0) : averageVelocity, currency)}
                                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                                            /{chartType === 'bar' ? 'mo' : (chartData.length <= 35 ? 'd' : chartData.length <= 180 ? 'wk' : 'mo')}
                                        </span>
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-100 dark:border-slate-700/50">
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-1">Transactions</p>
                                    <p className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-white">
                                        {currentPeriodTransactions.length}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-100 dark:border-slate-700/50">
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-1">Previous Period</p>
                                    <p className="text-lg sm:text-2xl font-bold text-slate-500 dark:text-slate-500">
                                        {formatCurrency(totalPrevious, currency)}
                                    </p>
                                </div>
                            </div>

                            {/* The Chart */}
                            {chartData.length > 0 && currentPeriodTransactions.length > 0 ? (
                                <div className="h-56 sm:h-80 w-full z-10 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {chartType === 'area' ? (
                                            <AreaChart
                                                data={chartData}
                                                margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
                                                onClick={handleChartClick}
                                            >
                                                <defs>
                                                    <linearGradient id={`colorSelected`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={selectedCategory?.color || '#14b8a6'} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={selectedCategory?.color || '#14b8a6'} stopOpacity={0.0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.3} />
                                                <XAxis
                                                    dataKey="label"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748B', fontSize: 12 }}
                                                    dy={10}
                                                    minTickGap={30}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748B', fontSize: 12 }}
                                                    tickFormatter={(value) => {
                                                        if (value === 0) return '0';
                                                        const formatted = formatCurrency(value, currency);
                                                        return formatted.replace(/[^\d.kKmMbB]/g, '');
                                                    }}
                                                    dx={-10}
                                                />
                                                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: selectedCategory?.color || '#14b8a6', strokeDasharray: '4 4' }} />
                                                <Area
                                                    type="monotone"
                                                    dataKey="amount"
                                                    stroke={selectedCategory?.color || '#14b8a6'}
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill={`url(#colorSelected)`}
                                                    activeDot={{ r: 6, fill: selectedCategory?.color || '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
                                                    dot={(props) => {
                                                        const { cx, cy, payload } = props;
                                                        const isSelected = selectedDataPoint && payload.label === selectedDataPoint.label;
                                                        if (isSelected) {
                                                            return <circle key={`dot-${payload.label}`} cx={cx} cy={cy} r={6} fill={selectedCategory?.color || '#14b8a6'} stroke="#fff" strokeWidth={2} />;
                                                        }
                                                        return null;
                                                    }}
                                                    animationDuration={1500}
                                                />
                                            </AreaChart>
                                        ) : (
                                            <BarChart
                                                data={chartData}
                                                margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
                                                onClick={handleChartClick}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.3} />
                                                <XAxis
                                                    dataKey="label"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748B', fontSize: 12 }}
                                                    dy={10}
                                                    minTickGap={30}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748B', fontSize: 12 }}
                                                    tickFormatter={(value) => {
                                                        if (value === 0) return '0';
                                                        const formatted = formatCurrency(value, currency);
                                                        return formatted.replace(/[^\d.kKmMbB]/g, '');
                                                    }}
                                                    dx={-10}
                                                />
                                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: `${selectedCategory?.color || '#14b8a6'}15` }} />
                                                <ReferenceLine
                                                    y={chartData.length > 0 ? totalCurrent / chartData.length : 0}
                                                    stroke="#94a3b8"
                                                    strokeDasharray="3 3"
                                                    label={{ position: 'insideTopLeft', value: 'Avg', fill: '#94a3b8', fontSize: 12 }}
                                                />
                                                <Bar
                                                    dataKey="amount"
                                                    radius={[4, 4, 0, 0]}
                                                    animationDuration={1500}
                                                >
                                                    {chartData.map((entry, index) => {
                                                        const isSelected = selectedDataPoint && entry.label === selectedDataPoint.label;
                                                        const opacity = selectedDataPoint ? (isSelected ? 'ff' : '40') : 'e6';
                                                        return <Cell key={`cell-${index}`} fill={`${selectedCategory?.color || '#14b8a6'}${opacity}`} />;
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl z-10 relative">
                                    <div
                                        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4 opacity-50 grayscale"
                                        style={{ backgroundColor: `${selectedCategory.color}20` }}
                                    >
                                        {selectedCategory.icon}
                                    </div>
                                    <p className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-1">No activity for {selectedCategory.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-500">During {activePreset === 'all' ? 'all time' : 'the selected time range'}</p>
                                </div>
                            )}
                        </div>

                        {predictor && (
                            <div className="glass-card p-6 md:p-8 mb-6 animate-slide-up relative overflow-hidden">
                                {/* Ambient background glow */}
                                <div
                                    className="absolute inset-x-0 top-0 h-40 opacity-60 pointer-events-none"
                                    style={{ background: `linear-gradient(180deg, ${selectedCategory.color}18 0%, transparent 100%)` }}
                                />
                                <div
                                    className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-[0.07] pointer-events-none"
                                    style={{ backgroundColor: selectedCategory.color }}
                                />

                                <div className="relative z-10">
                                    {/* Header */}
                                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
                                        <div>
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.22em] mb-3"
                                                style={{ background: `${selectedCategory.color}18`, color: selectedCategory.color, border: `1px solid ${selectedCategory.color}30` }}>
                                                <Sparkles size={12} />
                                                AI Forecast · EWMA + OLS Ensemble
                                            </div>
                                            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-2">
                                                {selectedCategory.name} — {predictor.nextLabel} Outlook
                                            </h3>
                                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                                                {predictor.insight}
                                            </p>
                                        </div>

                                        {/* Big prediction badge */}
                                        <div
                                            className="rounded-2xl px-5 py-4 border shadow-md backdrop-blur-md self-start min-w-[180px]"
                                            style={{
                                                borderColor: `${selectedCategory.color}40`,
                                                background: `linear-gradient(135deg, ${selectedCategory.color}20 0%, rgba(255,255,255,0.72) 100%)`
                                            }}
                                        >
                                            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400 mb-1">Predicted spend</p>
                                            <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                                {formatCurrency(predictor.predictedAmount, currency)}
                                            </p>
                                            <div className={`mt-2 text-xs font-semibold flex items-center gap-1.5 ${
                                                predictor.direction === 'down' ? 'text-emerald-600 dark:text-emerald-400'
                                                : predictor.direction === 'up' ? 'text-amber-600 dark:text-amber-400'
                                                : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                                {predictor.direction === 'down' ? <ArrowDownRight size={14} /> : predictor.direction === 'up' ? <ArrowUpRight size={14} /> : null}
                                                {predictor.direction === 'steady'
                                                    ? 'Holding pace'
                                                    : `${predictor.direction === 'up' ? '▲' : '▼'} ${Math.abs(predictor.deltaPercent).toFixed(1)}% vs this month`}
                                            </div>
                                            <div className="mt-2 pt-2 border-t" style={{ borderColor: `${selectedCategory.color}25` }}>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                                    Corridor: {formatCurrency(predictor.lowerBound, currency)} – {formatCurrency(predictor.upperBound, currency)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-7">
                                        {/* This month projection */}
                                        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/40 p-4">
                                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">This month projection</p>
                                            <p className="text-xl font-bold text-slate-800 dark:text-white">{formatCurrency(predictor.projectedCurrentMonth, currency)}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                                                {predictor.currentMonthGap > 0
                                                    ? `≈ ${formatCurrency(predictor.currentMonthGap, currency)} more by month-end`
                                                    : 'Month looks nearly complete'}
                                            </p>
                                        </div>

                                        {/* Confidence meter */}
                                        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/40 p-4">
                                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">Model confidence</p>
                                            <p className="text-xl font-bold text-slate-800 dark:text-white">{predictor.confidenceScore}%</p>
                                            <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000"
                                                    style={{
                                                        width: `${predictor.confidenceScore}%`,
                                                        background: `linear-gradient(90deg, ${selectedCategory.color}88, ${selectedCategory.color})`
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                                                {predictor.confidenceScore >= 75 ? 'High' : predictor.confidenceScore >= 55 ? 'Moderate' : 'Low'} signal quality
                                            </p>
                                        </div>

                                        {/* Trend */}
                                        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/40 p-4">
                                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                                                <TrendingUp size={12} /> Linear trend
                                            </p>
                                            <p className="text-xl font-bold text-slate-800 dark:text-white">{predictor.trendLabel}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{predictor.sliceLabel} per month slope</p>
                                        </div>

                                        {/* Volatility */}
                                        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/40 p-4">
                                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                                                <Activity size={12} /> Volatility
                                            </p>
                                            <p className="text-xl font-bold text-slate-800 dark:text-white">{predictor.cv}%</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                                                {predictor.cv < 25 ? 'Very consistent' : predictor.cv < 50 ? 'Somewhat variable' : 'Highly variable'} spending pattern
                                            </p>
                                        </div>
                                    </div>

                                    {/* Forecast chart with ComposedChart + ReferenceArea corridor */}
                                    <div className="h-64 sm:h-80 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={predictor.chartData} margin={{ top: 18, right: 16, left: 15, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={selectedCategory?.color || '#14b8a6'} stopOpacity={0.25} />
                                                        <stop offset="100%" stopColor={selectedCategory?.color || '#14b8a6'} stopOpacity={0.02} />
                                                    </linearGradient>
                                                    <linearGradient id="corridorGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={selectedCategory?.color || '#14b8a6'} stopOpacity={0.18} />
                                                        <stop offset="100%" stopColor={selectedCategory?.color || '#14b8a6'} stopOpacity={0.04} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CBD5E1" opacity={0.3} />
                                                <XAxis
                                                    dataKey="label"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={(props) => {
                                                        const { x, y, payload } = props;
                                                        const isForecast = predictor.chartData.find(d => d.label === payload.value)?.isForecast;
                                                        return (
                                                            <text x={x} y={y + 14} textAnchor="middle" fontSize={12}
                                                                fill={isForecast ? (selectedCategory?.color || '#14b8a6') : '#64748B'}
                                                                fontWeight={isForecast ? '700' : '400'}>
                                                                {payload.value}
                                                            </text>
                                                        );
                                                    }}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748B', fontSize: 11 }}
                                                    tickFormatter={(value) => {
                                                        if (value === 0) return '0';
                                                        const formatted = formatCurrency(value, currency);
                                                        return formatted.replace(/[^\d.,kKmMbB₹$€£¥]/g, '').slice(0, 7);
                                                    }}
                                                    dx={-8}
                                                />
                                                <RechartsTooltip content={<PredictorTooltip />} />

                                                {/* Forecast zone vertical divider */}
                                                <ReferenceLine
                                                    x={predictor.nextLabel.slice(0, 3)}
                                                    stroke={selectedCategory?.color || '#14b8a6'}
                                                    strokeDasharray="5 4"
                                                    strokeOpacity={0.4}
                                                    label={{
                                                        value: '← History  Forecast →',
                                                        position: 'insideTopRight',
                                                        fill: selectedCategory?.color || '#14b8a6',
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                        offset: 4,
                                                    }}
                                                />

                                                {/* Uncertainty corridor shading */}
                                                <ReferenceArea
                                                    x1={predictor.nextLabel.slice(0, 3)}
                                                    x2={predictor.nextLabel.slice(0, 3)}
                                                    y1={predictor.lowerBound}
                                                    y2={predictor.upperBound}
                                                    fill={`${selectedCategory?.color || '#14b8a6'}22`}
                                                    strokeOpacity={0}
                                                />

                                                {/* Historical actual area fill */}
                                                <Area
                                                    type="monotone"
                                                    dataKey="actual"
                                                    stroke="none"
                                                    fill="url(#actualGrad)"
                                                    connectNulls={false}
                                                    activeDot={false}
                                                    dot={false}
                                                />

                                                {/* Actual line */}
                                                <Line
                                                    type="monotone"
                                                    dataKey="actual"
                                                    stroke={selectedCategory?.color || '#14b8a6'}
                                                    strokeWidth={3}
                                                    dot={{ r: 4, fill: selectedCategory?.color || '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
                                                    activeDot={{ r: 6, fill: selectedCategory?.color || '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
                                                    animationDuration={1200}
                                                    connectNulls={false}
                                                    name="Actual"
                                                />

                                                {/* Current month run-rate dashed projection */}
                                                <Line
                                                    type="monotone"
                                                    dataKey="runRate"
                                                    stroke={selectedCategory?.color || '#14b8a6'}
                                                    strokeWidth={2.5}
                                                    strokeDasharray="5 4"
                                                    strokeOpacity={0.65}
                                                    dot={(props) => {
                                                        const { cx, cy, payload } = props;
                                                        if (!payload?.isCurrentMonth || !payload.runRate) return null;
                                                        return (
                                                            <g key={`dot-runrate-${cx}`}>
                                                                <circle cx={cx} cy={cy} r={10} fill={`${selectedCategory?.color || '#14b8a6'}18`} />
                                                                <circle cx={cx} cy={cy} r={5} fill={selectedCategory?.color || '#14b8a6'} stroke="#fff" strokeWidth={2} strokeDasharray="2 2" />
                                                            </g>
                                                        );
                                                    }}
                                                    activeDot={false}
                                                    connectNulls
                                                    name="Month projection"
                                                />

                                                {/* Curvy dotted bridge: current month projected → forecast point */}
                                                <Line
                                                    type="monotone"
                                                    dataKey="forecastLine"
                                                    stroke={selectedCategory?.color || '#14b8a6'}
                                                    strokeWidth={2.5}
                                                    strokeDasharray="4 5"
                                                    strokeOpacity={0.85}
                                                    dot={false}
                                                    activeDot={false}
                                                    connectNulls
                                                    animationDuration={1600}
                                                    name="Forecast bridge"
                                                />

                                                {/* Forecast point */}
                                                <Line
                                                    type="monotone"
                                                    dataKey="predicted"
                                                    stroke={selectedCategory?.color || '#14b8a6'}
                                                    strokeWidth={0}
                                                    dot={(props) => {
                                                        const { cx, cy, payload } = props;
                                                        if (!payload?.isForecast || !payload.predicted) return null;
                                                        return (
                                                            <g key={`dot-pred-${cx}`}>
                                                                {/* Pulsing outer ring */}
                                                                <circle cx={cx} cy={cy} r={20} fill={`${selectedCategory?.color || '#14b8a6'}12`} />
                                                                <circle cx={cx} cy={cy} r={13} fill={`${selectedCategory?.color || '#14b8a6'}22`} />
                                                                <circle cx={cx} cy={cy} r={7} fill={selectedCategory?.color || '#14b8a6'} stroke="#fff" strokeWidth={2.5} />
                                                                {/* Star burst top */}
                                                                <polygon
                                                                    points={`${cx},${cy - 22} ${cx + 3},${cy - 16} ${cx + 8},${cy - 16} ${cx + 4.5},${cy - 12} ${cx + 6},${cy - 6} ${cx},${cy - 10} ${cx - 6},${cy - 6} ${cx - 4.5},${cy - 12} ${cx - 8},${cy - 16} ${cx - 3},${cy - 16}`}
                                                                    fill={selectedCategory?.color || '#14b8a6'}
                                                                    opacity={0.85}
                                                                />
                                                            </g>
                                                        );
                                                    }}
                                                    activeDot={false}
                                                    connectNulls
                                                    animationDuration={1800}
                                                />

                                                {/* Low bound line */}
                                                <Line type="monotone" dataKey="lowerBound"
                                                    stroke={selectedCategory?.color || '#14b8a6'} strokeOpacity={0.3} strokeWidth={1.5}
                                                    strokeDasharray="3 4" dot={false} connectNulls name="Low estimate" />
                                                {/* High bound line */}
                                                <Line type="monotone" dataKey="upperBound"
                                                    stroke={selectedCategory?.color || '#14b8a6'} strokeOpacity={0.3} strokeWidth={1.5}
                                                    strokeDasharray="3 4" dot={false} connectNulls name="High estimate" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Legend row */}
                                    <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="inline-block w-6 h-0.5 rounded" style={{ backgroundColor: selectedCategory.color }} />
                                            Actual spending
                                        </span>
                                        <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="inline-block w-6 h-0.5 rounded" style={{ background: `repeating-linear-gradient(90deg, ${selectedCategory.color} 0, ${selectedCategory.color} 4px, transparent 4px, transparent 8px)` }} />
                                            Run-rate projection
                                        </span>
                                        <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="inline-block w-7 h-0.5 rounded" style={{ background: `repeating-linear-gradient(90deg, ${selectedCategory.color} 0, ${selectedCategory.color} 3px, transparent 3px, transparent 7px)`, opacity: 0.85 }} />
                                            Forecast curve
                                        </span>
                                        <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: selectedCategory.color }}>
                                            <span>★</span>
                                            Next month forecast
                                        </span>
                                        <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="inline-block w-4 h-3 rounded opacity-30" style={{ backgroundColor: selectedCategory.color }} />
                                            Uncertainty corridor
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Transactions List */}
                        <div className="glass-card p-4 sm:p-6 md:p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Calendar className="text-teal-500" size={24} />
                                    Transactions log
                                </h3>
                                <div className="flex flex-wrap items-center gap-3">
                                    {selectedDataPoint && (
                                        <span className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300">
                                            <span>Filtered to: <span className="text-slate-900 dark:text-white font-bold">{selectedDataPoint.label}</span></span>
                                            <button onClick={() => setSelectedDataPoint(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={14} /></button>
                                        </span>
                                    )}
                                    <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full whitespace-nowrap">
                                        {displayedTransactions.length} items
                                    </span>
                                </div>
                            </div>

                            {displayedTransactions.length > 0 ? (
                                <div className="max-h-[500px] overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                                    {displayedTransactions.map((transaction, index) => (
                                        <div
                                            key={transaction.id}
                                            className={`flex justify-between items-center py-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors sm:rounded-xl sm:border border-transparent sm:hover:border-slate-100 sm:dark:hover:border-slate-700 ${index !== displayedTransactions.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/50 sm:border-transparent' : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                <div
                                                    className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-lg sm:text-xl shadow-sm"
                                                >
                                                    {selectedCategory.icon}
                                                </div>
                                                <div className="min-w-0 pr-2">
                                                    <p className="font-semibold text-sm sm:text-base text-slate-800 dark:text-white truncate">
                                                        {transaction.description || selectedCategory.name}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                            {formatDate(transaction.date)}
                                                        </p>
                                                        {transaction.tag && (
                                                            <>
                                                                <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                                                                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                                    🏷️ {transaction.tag}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`font-bold text-sm sm:text-base flex-shrink-0 ${transactionType === 'income' ? 'text-green-500' : 'text-slate-800 dark:text-white'}`}>
                                                {transactionType === 'income' ? '+' : ''}{formatCurrency(transaction.amount, currency)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-8 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                    No transactions log to display.
                                </p>
                            )}
                        </div>
                    </>
            ) : null}
        </div>
    );
}
