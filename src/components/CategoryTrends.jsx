import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import TransactionCalendar from './TransactionCalendar';
import MonthRangePicker from './MonthRangePicker';
import { AreaChart, Area, BarChart, Bar, ReferenceLine, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight, Activity, X, BarChart2, LineChart as LineChartIcon } from 'lucide-react';
import {
    parseISO,
    subDays,
    subMonths,
    startOfDay,
    endOfDay,
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

        const typeFiltered = walletTransactions.filter(t => {
            if (!t) return false;
            const isTransfer = t.isTransfer || t.type === 'transfer';
            const displayCategory = isTransfer ? (t.transferType === 'interest' ? 'Interest' : 'Transfer') : (t.category || 'Other');

            const isCorrectType = transactionType === 'expense'
                ? (t.type === 'expense' || (isTransfer && t.transferType === 'interest'))
                : (t.type === 'income' && !t.isTransfer);

            return displayCategory === selectedCategory?.name && isCorrectType;
        });

        const currentPeriod = typeFiltered.filter(t => {
            const d = parseISO(t.date);
            return (isAfter(d, startOfDay(dateRange.from)) || isSameDay(d, dateRange.from)) &&
                (isBefore(d, endOfDay(dateRange.to)) || isSameDay(d, dateRange.to));
        });

        // Calculate previous period for trend comparison
        const daysDiff = differenceInDays(dateRange.to, dateRange.from) || 1;
        const prevTo = subDays(dateRange.from, 1);
        const prevFrom = subDays(prevTo, daysDiff);

        const previousPeriod = typeFiltered.filter(t => {
            const d = parseISO(t.date);
            return (isAfter(d, startOfDay(prevFrom)) || isSameDay(d, prevFrom)) &&
                (isBefore(d, endOfDay(prevTo)) || isSameDay(d, prevTo));
        });

        return {
            currentPeriodTransactions: currentPeriod.sort((a, b) => new Date(b.date) - new Date(a.date)),
            previousPeriodTransactions: previousPeriod
        };
    }, [walletTransactions, selectedCategory, transactionType, dateRange]);

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

    return (
        <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
            <div className="mb-4 sm:mb-8 animate-fade-in">
                <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 text-slate-800 dark:text-white">Category Trends</h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">Analyze how your spending and income categories evolve over time.</p>
            </div>

            {/* Top Controls: Type & Wallet */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                {/* Expense/Income Toggle */}
                <div className="glass-card p-1 sm:p-2 animate-slide-up flex sm:inline-flex w-full sm:w-auto">
                    <div className="flex gap-1 w-full sm:w-auto">
                        {[
                            { id: 'expense', label: 'Expenses', icon: <TrendingDown size={18} />, color: '#ef4444' },
                            { id: 'income', label: 'Income', icon: <TrendingUp size={18} />, color: '#22c55e' }
                        ].map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => { setTransactionType(preset.id); setSelectedCategory(null); }}
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
                <h3 className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 sm:mb-3 px-1 sm:px-2">
                    Select {transactionType === 'expense' ? 'Expense' : 'Income'} Category
                </h3>

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
                            const isSelected = selectedCategory?.name === cat.name;
                            return (
                                <button
                                    key={cat.name}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 rounded-xl min-w-max transition-all ${isSelected
                                        ? 'shadow-md sm:shadow-lg ring-2 ring-offset-2 dark:ring-offset-slate-900 border-transparent sm:scale-105'
                                        : 'border-2 border-transparent sm:border-slate-200 sm:dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 backdrop-blur-md sm:bg-white dark:bg-slate-800/50 sm:dark:bg-slate-800'
                                        }`}
                                    style={{
                                        backgroundColor: isSelected ? `${cat.color}15` : undefined,
                                        borderColor: isSelected ? cat.color : undefined,
                                    }}
                                >
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

            {
                selectedCategory && availableCategories.length > 0 && (
                    <>
                        {/* Main Visualization Card */}
                        <div className="glass-card p-4 sm:p-6 md:p-8 mb-6 animate-slide-up relative overflow-hidden">
                            {/* Background Blob */}
                            <div
                                className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
                                style={{ backgroundColor: selectedCategory.color }}
                            />

                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-6 sm:mb-8 gap-4 sm:gap-6 z-10 relative">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div
                                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-sm"
                                        style={{ backgroundColor: `${selectedCategory.color}20` }}
                                    >
                                        {selectedCategory.icon}
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            {selectedCategory.name} Trend
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span
                                                className={`flex items-center gap-1 text-xs sm:text-sm font-medium px-2 py-0.5 rounded-full ${isTrendGood
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}
                                            >
                                                {trendPercentage > 0 ? <ArrowUpRight size={14} /> : trendPercentage < 0 ? <ArrowDownRight size={14} /> : null}
                                                {Math.abs(trendPercentage).toFixed(1)}% {trendPercentage >= 0 ? 'increase' : 'decrease'}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">vs previous {differenceInDays(dateRange.to, dateRange.from) || 1}d</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex flex-col items-start lg:items-end gap-2 sm:gap-3 z-20 relative w-full lg:w-auto">
                                    {/* Chart Type Toggle */}
                                    <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                                        <button
                                            onClick={() => { setChartType('area'); setSelectedDataPoint(null); }}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${chartType === 'area'
                                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            <LineChartIcon size={16} /> Trend
                                        </button>
                                        <button
                                            onClick={() => { setChartType('bar'); setSelectedDataPoint(null); }}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${chartType === 'bar'
                                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            <BarChart2 size={16} /> Monthly
                                        </button>
                                    </div>

                                    {/* Date Presets */}
                                    <div className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                                        {(chartType === 'area' ? [
                                            { id: '7days', label: '7D' },
                                            { id: '30days', label: '1M' },
                                            { id: '3months', label: '3M' },
                                            { id: '6months', label: '6M' },
                                            { id: '1year', label: '1Y' },
                                            { id: 'all', label: 'All' },
                                        ] : [
                                            { id: '3months', label: '3M' },
                                            { id: '6months', label: '6M' },
                                            { id: 'thisYear', label: 'This Yr' },
                                            { id: 'lastYear', label: 'Last Yr' },
                                            { id: 'all', label: 'All' },
                                        ]).map((preset) => (
                                            <button
                                                key={preset.id}
                                                onClick={() => handlePresetSelect(preset.id)}
                                                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${activePreset === preset.id
                                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                                    }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setShowCalendar(!showCalendar)}
                                            className={`ml-1 px-3 py-1.5 rounded-md text-xs sm:text-sm flex items-center gap-1.5 font-medium transition-all ${showCalendar || activePreset === 'custom'
                                                ? 'bg-teal-500 text-white shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            <Calendar size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Calendar Dropdown - Outside the card */}
                        {showCalendar && (
                            <div className="mb-6 animate-slide-up">
                                <div className="glass-card p-6 md:p-8">
                                    {chartType === 'area' ? (
                                        <TransactionCalendar
                                            transactions={transactions}
                                            dateRange={dateRange}
                                            onDateRangeChange={(range) => {
                                                if (range.from && range.to) {
                                                    setDateRange(range);
                                                    setActivePreset('custom');
                                                    setSelectedDataPoint(null);
                                                }
                                            }}
                                            currency={currency}
                                        />
                                    ) : (
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
                                    )}
                                </div>
                            </div>
                        )}

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
                )
            }
        </div >
    );
}
