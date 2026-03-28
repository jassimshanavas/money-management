import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, setMonth, setYear, startOfMonth, endOfMonth, isBefore, isSameMonth, isAfter } from 'date-fns';

export default function MonthRangePicker({ dateRange, onDateRangeChange }) {
    const [viewYear, setViewYear] = useState(dateRange?.from ? dateRange.from.getFullYear() : new Date().getFullYear());
    const [selectionStart, setSelectionStart] = useState(dateRange?.from || null);
    const [selectionEnd, setSelectionEnd] = useState(dateRange?.to || null);

    // Sync external changes
    useEffect(() => {
        if (dateRange?.from) setSelectionStart(dateRange.from);
        if (dateRange?.to) setSelectionEnd(dateRange.to);
    }, [dateRange]);

    const months = Array.from({ length: 12 }, (_, i) => i);

    const handleMonthClick = (monthIndex) => {
        const selectedDate = setMonth(setYear(new Date(), viewYear), monthIndex);

        if (!selectionStart || (selectionStart && selectionEnd)) {
            // Start new selection
            const start = startOfMonth(selectedDate);
            setSelectionStart(start);
            setSelectionEnd(null);
            onDateRangeChange({ from: start, to: null });
        } else {
            // End selection
            let start = selectionStart;
            let end = endOfMonth(selectedDate);

            if (isBefore(end, start)) {
                // Swap if they clicked backwards
                const tempStart = startOfMonth(selectedDate);
                end = endOfMonth(selectionStart);
                start = tempStart;
            }

            setSelectionStart(start);
            setSelectionEnd(end);
            onDateRangeChange({ from: start, to: end });
        }
    };

    const getMonthClass = (monthIndex) => {
        const date = setMonth(setYear(new Date(), viewYear), monthIndex);

        const isStart = selectionStart && isSameMonth(date, selectionStart);
        const isEnd = selectionEnd && isSameMonth(date, selectionEnd);
        const inRange = selectionStart && selectionEnd &&
            (isAfter(date, selectionStart) || isSameMonth(date, selectionStart)) &&
            (isBefore(date, selectionEnd) || isSameMonth(date, selectionEnd));

        const baseClass = "p-4 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer";

        if (isStart || isEnd) {
            return `${baseClass} bg-teal-500 text-white shadow-lg shadow-teal-500/30 scale-105`;
        }
        if (inRange) {
            return `${baseClass} bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-100`;
        }

        return `${baseClass} hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300`;
    };

    const selectedRangeText = selectionStart && selectionEnd
        ? `${format(selectionStart, 'MMM yyyy')} - ${format(selectionEnd, 'MMM yyyy')}`
        : selectionStart
            ? `${format(selectionStart, 'MMM yyyy')} - Select end month`
            : 'Select start and end month';

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => setViewYear(y => y - 1)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-600 dark:text-slate-400"
                >
                    <ChevronLeft size={20} />
                </button>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Calendar size={18} className="text-teal-500" />
                    {viewYear}
                </h3>
                <button
                    onClick={() => setViewYear(y => y + 1)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-600 dark:text-slate-400"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Month Grid - Full Width */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {months.map(month => (
                    <button
                        key={month}
                        onClick={() => handleMonthClick(month)}
                        className={getMonthClass(month)}
                    >
                        {format(setMonth(new Date(), month), 'MMM')}
                    </button>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Calendar size={14} className="text-teal-500" />
                    {selectedRangeText}
                </span>
                <button
                    onClick={() => {
                        setSelectionStart(null);
                        setSelectionEnd(null);
                        onDateRangeChange({ from: null, to: null });
                    }}
                    className="text-sm hover:text-red-500 transition-colors font-medium text-slate-500 dark:text-slate-400"
                >
                    Clear
                </button>
            </div>
        </div>
    );
}
