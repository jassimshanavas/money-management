import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    isSameDay,
    isSameMonth,
    isToday,
    format,
    isWithinInterval,
    isBefore,
    isAfter
} from 'date-fns';

export default function TransactionCalendar({ transactions, dateRange, onDateRangeChange, currency }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectionStart, setSelectionStart] = useState(dateRange.from);
    const [selectionEnd, setSelectionEnd] = useState(dateRange.to);
    const [hoverDate, setHoverDate] = useState(null);

    // Calculate daily summaries for the current month
    const dailySummaries = useMemo(() => {
        const summaries = new Map();

        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const dateKey = format(date, 'yyyy-MM-dd');

            if (!summaries.has(dateKey)) {
                summaries.set(dateKey, { income: 0, expense: 0, count: 0 });
            }

            const summary = summaries.get(dateKey);

            // Use consistent logic for income and expenses
            if (transaction.type === 'income' && !transaction.isTransfer) {
                summary.income += transaction.amount;
            } else if (transaction.type === 'expense' && (!transaction.isTransfer || transaction.transferType === 'interest')) {
                summary.expense += transaction.amount;
            }
            // Transfers (type: 'transfer') are intentionally excluded from income/expense sums
            // but contribute to the count

            summary.count++;
        });

        return summaries;
    }, [transactions]);

    // Get calendar days for current month
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart);
        const calendarEnd = endOfWeek(monthEnd);

        const days = [];
        let day = calendarStart;

        while (day <= calendarEnd) {
            days.push(day);
            day = addDays(day, 1);
        }

        return days;
    }, [currentDate]);

    const handleDateClick = (date) => {
        if (!selectionStart || (selectionStart && selectionEnd)) {
            // Start new selection
            setSelectionStart(date);
            setSelectionEnd(null);
            onDateRangeChange({ from: date, to: null });
        } else {
            // Complete selection
            let start = selectionStart;
            let end = date;

            if (isBefore(end, start)) {
                [start, end] = [end, start];
            }

            setSelectionStart(start);
            setSelectionEnd(end);
            onDateRangeChange({ from: start, to: end });
        }
    };

    const clearSelection = () => {
        setSelectionStart(null);
        setSelectionEnd(null);
        onDateRangeChange({ from: null, to: null });
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const previousMonth = () => {
        setCurrentDate(addMonths(currentDate, -1));
    };

    const nextMonth = () => {
        setCurrentDate(addMonths(currentDate, 1));
    };

    const isDateInRange = (date) => {
        if (!selectionStart) return false;

        const end = selectionEnd || hoverDate;
        if (!end) return isSameDay(date, selectionStart);

        const start = isBefore(selectionStart, end) ? selectionStart : end;
        const finish = isBefore(selectionStart, end) ? end : selectionStart;

        return isWithinInterval(date, { start, end: finish });
    };

    const isRangeStart = (date) => {
        return selectionStart && isSameDay(date, selectionStart);
    };

    const isRangeEnd = (date) => {
        return selectionEnd && isSameDay(date, selectionEnd);
    };

    const getDayCellClass = (date) => {
        const baseClass = "relative flex flex-col items-center justify-center min-h-[60px] sm:min-h-[70px] p-1 sm:p-2 rounded-lg cursor-pointer transition-all duration-200";
        const classes = [baseClass];

        // Other month styling
        if (!isSameMonth(date, currentDate)) {
            classes.push("text-slate-300 dark:text-slate-700");
        }

        // Today styling
        if (isToday(date)) {
            classes.push("ring-2 ring-teal-500");
        }

        // Selection styling
        if (isRangeStart(date) || isRangeEnd(date)) {
            classes.push("bg-teal-500 text-white font-bold");
        } else if (isDateInRange(date)) {
            classes.push("bg-teal-100 dark:bg-teal-900/30");
        } else {
            classes.push("hover:bg-slate-100 dark:hover:bg-slate-800");
        }

        return classes.join(" ");
    };

    const formatAmount = (amount) => {
        if (amount >= 1000) {
            return `${(amount / 1000).toFixed(1)}k`;
        }
        return amount.toFixed(0);
    };

    return (
        <div className="glass-card p-3 sm:p-4 animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={previousMonth}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Previous month"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white min-w-[140px] text-center">
                        {format(currentDate, 'MMMM yyyy')}
                    </h3>

                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Next month"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    Today
                </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {calendarDays.map((date, index) => {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const summary = dailySummaries.get(dateKey) || { income: 0, expense: 0, count: 0 };
                    const hasTransactions = summary.count > 0;

                    return (
                        <div
                            key={index}
                            className={getDayCellClass(date)}
                            onClick={() => handleDateClick(date)}
                            onMouseEnter={() => setHoverDate(date)}
                            onMouseLeave={() => setHoverDate(null)}
                        >
                            {/* Day Number */}
                            <div className="text-xs sm:text-sm font-semibold mb-0.5">
                                {format(date, 'd')}
                            </div>

                            {/* Transaction Amounts */}
                            {hasTransactions && (
                                <div className="flex flex-col items-center gap-0.5 w-full">
                                    {summary.income > 0 && (
                                        <div className="text-[8px] sm:text-[10px] font-medium text-green-600 dark:text-green-400 leading-none">
                                            +{formatAmount(summary.income)}
                                        </div>
                                    )}
                                    {summary.expense > 0 && (
                                        <div className="text-[8px] sm:text-[10px] font-medium text-red-600 dark:text-red-400 leading-none">
                                            -{formatAmount(summary.expense)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Transaction Count Indicator */}
                            {hasTransactions && (
                                <div className="absolute bottom-1 right-1 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-teal-500 rounded-full"></div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Selection Info */}
            {(selectionStart || selectionEnd) && (
                <div className="mt-4 flex items-center justify-between gap-2 p-2 sm:p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CalendarIcon size={16} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300 truncate">
                            {selectionStart && format(selectionStart, 'MMM d, yyyy')}
                            {selectionEnd && ` - ${format(selectionEnd, 'MMM d, yyyy')}`}
                            {!selectionEnd && ' (select end date)'}
                        </span>
                    </div>
                    <button
                        onClick={clearSelection}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded transition-colors flex-shrink-0"
                    >
                        Clear
                    </button>
                </div>
            )}
        </div>
    );
}
