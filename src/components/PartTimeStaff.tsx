import React, { useState, useRef, useEffect } from 'react';
import { Attendance, PartTimeSalaryDetail, Staff } from '../types';
import { Clock, Plus, Download, Calendar, DollarSign, Edit2, Save, X, FileSpreadsheet, Trash2, Settings } from 'lucide-react';
import { calculatePartTimeSalary, getPartTimeDailySalary, isSunday, getCurrencyBreakdown } from '../utils/salaryCalculations';
import { exportSalaryToExcel, exportSalaryPDF, exportPartTimeSalaryPDF } from '../utils/exportUtils';
import { settingsService } from '../services/settingsService';

interface PartTimeStaffProps {
    attendance: Attendance[];
    staff: Staff[];
    onUpdateAttendance: (staffId: string, date: string, status: 'Present' | 'Half Day' | 'Absent', isPartTime?: boolean, staffName?: string, shift?: 'Morning' | 'Evening' | 'Both', location?: string, salary?: number, salaryOverride?: boolean, arrivalTime?: string, leavingTime?: string) => void;
    onDeletePartTimeAttendance: (attendanceId: string) => void;
    userLocation?: string;
    userRole?: string;
}

const PartTimeStaff: React.FC<PartTimeStaffProps> = ({
    attendance,
    staff,
    onUpdateAttendance,
    onDeletePartTimeAttendance,
    userLocation,
    userRole
}) => {
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingAttendance, setEditingAttendance] = useState<string | null>(null);
    const [editData, setEditData] = useState<{
        name: string;
        location: string;
        shift: string;
        status: string;
        salary: number;
        arrivalTime: string;
        leavingTime: string;
    }>({
        name: '',
        location: '',
        shift: '',
        status: '',
        salary: 0,
        arrivalTime: '',
        leavingTime: ''
    });
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [locationFilter, setLocationFilter] = useState<string>(
        userLocation ? userLocation as any : 'All'
    );
    // Salary Report Filter: Defaults to ['All'] for admins, otherwise defaults to user's location in array
    const [reportLocationFilter, setReportLocationFilter] = useState<string[]>(
        userRole === 'admin' ? ['All'] : (userLocation ? [userLocation] : ['All'])
    );
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowLocationDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const [reportType, setReportType] = useState<'monthly' | 'weekly' | 'dateRange'>('weekly');
    const [selectedWeek, setSelectedWeek] = useState(0);
    const [dateRange, setDateRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());

    // Helper to toggle selection
    const handleToggleStaffSelection = (staffId: string, location: string) => {
        const key = `${staffId}-${location}`;
        const newSelection = new Set(selectedStaff);
        if (newSelection.has(key)) {
            newSelection.delete(key);
        } else {
            newSelection.add(key);
        }
        setSelectedStaff(newSelection);
    };

    // Helper to select/deselect all in a group
    const handleSelectAllInGroup = (groupStaff: PartTimeSalaryDetail[], shouldSelect: boolean) => {
        const newSelection = new Set(selectedStaff);
        groupStaff.forEach(staff => {
            const key = `${staff.name}-${staff.location}`;
            if (shouldSelect) {
                newSelection.add(key);
            } else {
                newSelection.delete(key);
            }
        });
        setSelectedStaff(newSelection);
    };
    const [newStaffData, setNewStaffData] = useState({
        name: '',
        location: (userLocation || settingsService.getLocations()[0] || 'Big Shop'),
        shift: (new Date().getDay() === 0 ? 'Both' : 'Morning') as 'Morning' | 'Evening' | 'Both',
        salary: 0,
        arrivalTime: '',
        leavingTime: ''
    });
    const [showSettings, setShowSettings] = useState(false);
    const [partTimeRates, setPartTimeRates] = useState(() => settingsService.getPartTimeRates());

    // Get recent names for smart suggestions
    const getRecentNames = () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let recentAttendance = attendance.filter(record => {
            const recordDate = new Date(record.date);
            return record.isPartTime &&
                recordDate >= thirtyDaysAgo &&
                record.staffName;
        });

        // Filter by location unless it's Sunday or "All" locations
        const today = new Date();
        const isSunday = today.getDay() === 0;

        if (!isSunday && userLocation) {
            recentAttendance = recentAttendance.filter(record => record.location === userLocation);
        }

        // Get unique names
        const uniqueNames = [...new Set(recentAttendance.map(record => record.staffName))];
        return uniqueNames.slice(0, 10); // Limit to 10 suggestions
    };

    const recentNames = getRecentNames();

    // Get weeks in month (simplified date-based: always 7-day weeks, can span into next month)
    const getWeeksInMonth = (year: number, month: number) => {
        const weeks = [];
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

        let currentDay = 1;

        while (currentDay <= lastDayOfMonth) {
            const weekStartDay = currentDay;
            const weekEndDay = currentDay + 6; // Always 7 days

            const startDate = new Date(year, month, weekStartDay);
            let endDate: Date;
            let endDay: number;
            let endMonth: number;
            let endYear: number;

            if (weekEndDay <= lastDayOfMonth) {
                // Week ends in current month
                endDate = new Date(year, month, weekEndDay, 23, 59, 59, 999);
                endDay = weekEndDay;
                endMonth = month;
                endYear = year;
            } else {
                // Week extends into next month
                const daysIntoNextMonth = weekEndDay - lastDayOfMonth;
                endMonth = month + 1;
                endYear = year;

                // Handle year boundary
                if (endMonth > 11) {
                    endMonth = 0;
                    endYear = year + 1;
                }

                endDate = new Date(endYear, endMonth, daysIntoNextMonth, 23, 59, 59, 999);
                endDay = daysIntoNextMonth;
            }

            weeks.push({
                start: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                end: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                startDate: startDate,
                endDate: endDate,
                startDay: weekStartDay,
                endDay: weekEndDay, // Always +6 from start for column count
                startMonth: month,
                startYear: year,
                endMonth: endMonth,
                endYear: endYear,
                actualEndDay: endDay
            });

            currentDay += 7;
        }

        return weeks;
    };

    // Set default week to current week on component mount
    React.useEffect(() => {
        if (reportType === 'weekly') {
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            if (selectedMonth === currentMonth && selectedYear === currentYear) {
                const weeks = getWeeksInMonth(currentYear, currentMonth);
                const todayTime = today.getTime();

                const currentWeekIndex = weeks.findIndex(week => {
                    const weekStartTime = week.startDate.getTime();
                    const weekEndTime = week.endDate.getTime();
                    return todayTime >= weekStartTime && todayTime <= weekEndTime;
                });

                if (currentWeekIndex !== -1) {
                    setSelectedWeek(currentWeekIndex);
                }
            }
        }
    }, [reportType, selectedMonth, selectedYear]);

    // Calculate part-time salaries for the selected month
    const calculatePartTimeSalaries = (): PartTimeSalaryDetail[] => {
        let monthlyAttendance = attendance.filter(record => {
            if (!record.isPartTime) return false;

            const recordDate = new Date(record.date);

            if (reportType === 'monthly') {
                return recordDate.getMonth() === selectedMonth &&
                    recordDate.getFullYear() === selectedYear;
            } else if (reportType === 'weekly') {
                const weeks = getWeeksInMonth(selectedYear, selectedMonth);
                const selectedWeekData = weeks[selectedWeek];
                if (!selectedWeekData) return false;
                return recordDate >= selectedWeekData.startDate && recordDate <= selectedWeekData.endDate;
            } else if (reportType === 'dateRange') {
                const startDate = new Date(dateRange.start);
                const endDate = new Date(dateRange.end);
                return recordDate >= startDate && recordDate <= endDate;
            }

            return false;
        });



        const uniqueStaff = new Map<string, { name: string; locations: Set<string> }>();
        monthlyAttendance.forEach(record => {
            if (record.staffName) {
                const key = record.staffName.toLowerCase();
                if (!uniqueStaff.has(key)) {
                    uniqueStaff.set(key, {
                        name: record.staffName,
                        locations: new Set([record.location || 'Unknown'])
                    });
                } else {
                    uniqueStaff.get(key)!.locations.add(record.location || 'Unknown');
                }
            }
        });

        return Array.from(uniqueStaff.values()).map(staff =>
            calculatePartTimeSalary(
                staff.name,
                Array.from(staff.locations).join(', '),
                monthlyAttendance,
                selectedYear,
                selectedMonth
            )
        );
    };

    // Check for duplicates
    const checkDuplicate = (name: string, location: string, shift: string, excludeId?: string) => {
        // Check for duplicate in part-time attendance
        const partTimeDuplicate = filteredTodayAttendance.some(record =>
            record.id !== excludeId &&
            record.staffName?.toLowerCase() === name.toLowerCase() &&
            record.location === location &&
            record.shift === shift
        );

        // Check for duplicate in full-time staff
        const fullTimeDuplicate = staff.some(member =>
            member.name.toLowerCase() === name.toLowerCase() &&
            member.isActive
        );

        // Check for duplicate name across all part-time staff for today (any location/shift)
        const partTimeNameDuplicate = filteredTodayAttendance.some(record =>
            record.id !== excludeId &&
            record.staffName?.toLowerCase() === name.toLowerCase()
        );

        return partTimeNameDuplicate || fullTimeDuplicate;
    };

    // Helper functions for multi-location selection
    const handleLocationToggle = (location: string) => {
        if (location === 'All') {
            setReportLocationFilter(['All']);
        } else {
            const newFilter = reportLocationFilter.includes('All')
                ? [location]
                : reportLocationFilter.includes(location)
                    ? reportLocationFilter.filter(loc => loc !== location)
                    : [...reportLocationFilter, location];

            // If no locations selected, default to All
            setReportLocationFilter(newFilter.length === 0 ? ['All'] : newFilter);
        }
    };

    const getLocationButtonText = () => {
        if (reportLocationFilter.includes('All')) return 'All Locations';
        const count = reportLocationFilter.length;
        return count === 1 ? reportLocationFilter[0] : `${count} Locations`;
    };

    const partTimeSalaries = calculatePartTimeSalaries().filter(salary => {
        if (reportLocationFilter.includes('All')) return true;
        return reportLocationFilter.some(loc => salary.location.includes(loc));
    });

    // Filter salaries based on selection if any are selected
    const selectedSalaries = selectedStaff.size > 0
        ? partTimeSalaries.filter(s => selectedStaff.has(`${s.staffName}-${s.location}`))
        : partTimeSalaries;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const totalPartTimeEarnings = selectedSalaries.reduce((sum, salary) => sum + salary.totalEarnings, 0);

    // Calculate currency breakdown
    const currencyBreakdown = (selectedStaff.size > 0 ? selectedSalaries : partTimeSalaries).reduce((acc, salary) => {
        const breakdown = getCurrencyBreakdown(salary.totalEarnings);
        Object.entries(breakdown).forEach(([denom, count]) => {
            const d = Number(denom);
            acc[d] = (acc[d] || 0) + count;
        });
        return acc;
    }, {} as Record<number, number>);

    const sortedDenominations = Object.keys(currencyBreakdown)
        .map(Number)
        .sort((a, b) => b - a);

    // Get today's part-time attendance
    let todayPartTimeAttendance = attendance.filter(record =>
        record.isPartTime && record.date === selectedDate
    );

    // Filter by user location if manager
    if (userLocation) {
        todayPartTimeAttendance = todayPartTimeAttendance.filter(record => record.location === userLocation);
    }

    // Filter by location
    const filteredTodayAttendance = locationFilter === 'All'
        ? todayPartTimeAttendance
        : todayPartTimeAttendance.filter(record => record.location === locationFilter);

    const handleAddPartTimeAttendance = (e: React.FormEvent) => {
        e.preventDefault();

        // Check for duplicates
        const isDuplicate = checkDuplicate(newStaffData.name, newStaffData.location, newStaffData.shift);

        if (isDuplicate) {
            const isFullTimeStaff = staff.some(member =>
                member.name.toLowerCase() === newStaffData.name.toLowerCase() &&
                member.isActive
            );

            if (isFullTimeStaff) {
                alert(`${newStaffData.name} is already a full-time staff member. Cannot add as part-time.`);
            } else {
                alert(`${newStaffData.name} is already added as part-time staff today.`);
            }
            return;
        }

        const staffId = `pt_${Date.now()}`;

        // Calculate salary based on shift and day
        let defaultSalary = getPartTimeDailySalary(selectedDate);
        if (newStaffData.shift === 'Morning' || newStaffData.shift === 'Evening') {
            defaultSalary = Math.round(defaultSalary / 2); // Half day rate
        }

        // Use manual salary if provided, otherwise use calculated default
        const finalSalary = newStaffData.salary > 0 ? newStaffData.salary : defaultSalary;
        const isSalaryEdited = newStaffData.salary > 0 && newStaffData.salary !== defaultSalary;

        // Set default arrival time to current time if not provided to current time if not provided
        const defaultArrivalTime = newStaffData.arrivalTime || new Date().toTimeString().slice(0, 5);

        // Set default leaving time based on shift
        let defaultLeavingTime = newStaffData.leavingTime;
        if (!defaultLeavingTime) {
            if (newStaffData.shift === 'Morning') {
                defaultLeavingTime = '15:00'; // 3:00 PM
            } else if (newStaffData.shift === 'Evening' || newStaffData.shift === 'Both') {
                defaultLeavingTime = '21:30'; // 9:30 PM
            }
        }

        onUpdateAttendance(
            staffId,
            selectedDate,
            'Present',
            true,
            newStaffData.name,
            newStaffData.shift,
            newStaffData.location,
            finalSalary,
            isSalaryEdited,
            defaultArrivalTime,
            defaultLeavingTime
        );
        setNewStaffData({
            name: '',
            location: (userLocation || 'Big Shop') as any,
            shift: (new Date().getDay() === 0 ? 'Both' : 'Morning') as 'Morning' | 'Evening' | 'Both',
            salary: 0,
            arrivalTime: '',
            leavingTime: ''
        });
        setShowAddForm(false);
    };

    const handleEdit = (record: Attendance) => {
        setEditingAttendance(record.id);
        setEditData({
            name: record.staffName || '',
            location: record.location || 'Big Shop',
            shift: record.shift || 'Morning',
            status: record.status,
            salary: record.salary || getPartTimeDailySalary(record.date),
            arrivalTime: record.arrivalTime || '',
            leavingTime: record.leavingTime || ''
        });
    };

    const handleSave = (attendanceRecord: Attendance) => {
        // Check for duplicates on edit
        const isDuplicate = checkDuplicate(editData.name, editData.location, editData.shift, attendanceRecord.id);

        if (isDuplicate) {
            const isFullTimeStaff = staff.some(member =>
                member.name.toLowerCase() === editData.name.toLowerCase() &&
                member.isActive
            );

            if (isFullTimeStaff) {
                alert(`${editData.name} is already a full-time staff member. Cannot use as part-time.`);
            } else {
                alert(`${editData.name} is already added as part-time staff today.`);
            }
            return;
        }

        // Smart edited label logic: calculate default salary to check if it was actually edited
        const defaultSalary = getPartTimeDailySalary(attendanceRecord.date);
        const calculatedSalary = (editData.shift === 'Morning' || editData.shift === 'Evening')
            ? Math.round(defaultSalary / 2)
            : defaultSalary;

        // Only mark as edited if salary actually changed from calculated default
        const isSalaryEdited = editData.salary !== calculatedSalary;

        onUpdateAttendance(
            attendanceRecord.staffId,
            attendanceRecord.date,
            editData.status as 'Present' | 'Half Day' | 'Absent',
            true,
            editData.name,
            editData.shift as 'Morning' | 'Evening' | 'Both',
            editData.location,
            editData.salary,
            isSalaryEdited,
            editData.arrivalTime,
            editData.leavingTime
        );
        setEditingAttendance(null);
    };

    const handleCancelEdit = () => {
        setEditingAttendance(null);
    };

    const handleDelete = (attendanceId: string) => {
        setShowDeleteModal(attendanceId);
    };

    const confirmDelete = () => {
        if (showDeleteModal) {
            const record = filteredTodayAttendance.find(r => r.id === showDeleteModal);
            if (record) {
                // Call the delete function from parent
                onDeletePartTimeAttendance(record.id);
            }
            setShowDeleteModal(null);
        }
    };

    const handleExportExcel = () => {
        exportSalaryToExcel([], partTimeSalaries, [], selectedMonth, selectedYear);
    };

    const handleExportPDF = () => {
        let weekData, dateRangeData;

        if (reportType === 'weekly') {
            const weeks = getWeeksInMonth(selectedYear, selectedMonth);
            const selectedWeekData = weeks[selectedWeek];
            if (selectedWeekData) {
                weekData = {
                    start: selectedWeekData.start,
                    end: selectedWeekData.end
                };
            }
        } else if (reportType === 'dateRange') {
            dateRangeData = dateRange;
        }

        // Export only selected salaries if any are selected
        const salariesToExport = selectedStaff.size > 0
            ? partTimeSalaries.filter(s => selectedStaff.has(`${s.staffName}-${s.location}`))
            : partTimeSalaries;

        exportPartTimeSalaryPDF(
            salariesToExport,
            selectedMonth,
            selectedYear,
            reportType,
            weekData,
            dateRangeData
        );
    };

    // Group salaries by location for display
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const salariesByLocation = partTimeSalaries.reduce((acc, salary) => {
        if (!acc[salary.location]) {
            acc[salary.location] = [];
        }
        acc[salary.location].push(salary);
        return acc;
    }, {} as Record<string, PartTimeSalaryDetail[]>);

    // Filter locations based on user role
    const getAvailableLocations = () => {
        if (userLocation) {
            return [userLocation];
        }
        return ['All', ...settingsService.getLocations()];
    };
    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Clock size={32} />
                        <h1 className="text-xl md:text-3xl font-bold">Part-Time Staff Management</h1>
                        {userLocation && (
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                {userLocation}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm"
                        >
                            <FileSpreadsheet size={16} />
                            <span className="hidden sm:inline">Export Excel</span>
                            <span className="sm:hidden">Excel</span>
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm"
                        >
                            <Download size={16} />
                            <span className="hidden sm:inline">Export PDF</span>
                            <span className="sm:hidden">PDF</span>
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm"
                        >
                            <Settings size={16} />
                            <span className="hidden sm:inline">Settings</span>
                        </button>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm"
                        >
                            <Plus size={16} />
                            <span className="hidden sm:inline">Add Part-Time Staff</span>
                            <span className="sm:hidden">Add Staff</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Part-Time Staff Form */}
            {showAddForm && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Add Part-Time Staff for Today</h2>
                    <form onSubmit={handleAddPartTimeAttendance} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                list="recent-names"
                                type="text"
                                value={newStaffData.name}
                                onChange={(e) => setNewStaffData({ ...newStaffData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                required
                            />
                            <datalist id="recent-names">
                                {recentNames.map((name, index) => (
                                    <option key={index} value={name} />
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <select
                                value={newStaffData.location}
                                onChange={(e) => setNewStaffData({ ...newStaffData, location: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                disabled={!!userLocation}
                            >
                                {settingsService.getLocations().map(loc => (<option key={loc} value={loc}>{loc}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                            <select
                                value={newStaffData.shift}
                                onChange={(e) => setNewStaffData({ ...newStaffData, shift: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                <option value="Morning">Morning (Half Day)</option>
                                <option value="Evening">Evening (Half Day)</option>
                                <option value="Both">Both (Full Day)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Salary (Optional)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-sm">₹</span>
                                </div>
                                <input
                                    type="number"
                                    value={newStaffData.salary || ''}
                                    onChange={(e) => setNewStaffData({ ...newStaffData, salary: Number(e.target.value) })}
                                    placeholder={(() => {
                                        let defaultSalary = getPartTimeDailySalary(selectedDate);
                                        if (newStaffData.shift === 'Morning' || newStaffData.shift === 'Evening') {
                                            defaultSalary = Math.round(defaultSalary / 2);
                                        }
                                        return `Auto: ₹${defaultSalary}`;
                                    })()}
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Leave empty to use auto-calculated salary</p>
                        </div>
                        <div className="md:col-span-2 lg:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Time</label>
                            <input
                                type="time"
                                value={newStaffData.arrivalTime}
                                onChange={(e) => setNewStaffData({ ...newStaffData, arrivalTime: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                        <div className="md:col-span-2 lg:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Leaving Time</label>
                            <input
                                type="time"
                                value={newStaffData.leavingTime}
                                onChange={(e) => setNewStaffData({ ...newStaffData, leavingTime: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                        <div className="md:col-span-2 lg:col-span-4 flex flex-col sm:flex-row items-end gap-2">
                            <button
                                type="submit"
                                className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Add Staff
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Date Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <label className="text-sm font-medium text-gray-700">Select Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        {isSunday(selectedDate) && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                                Sunday - ₹400 rate
                            </span>
                        )}
                    </div>
                    {!userLocation && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <label className="text-sm font-medium text-gray-700">Filter by Location</label>
                            <select
                                value={locationFilter}
                                onChange={(e) => setLocationFilter(e.target.value as any)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                {getAvailableLocations().map(location => (
                                    <option key={location} value={location}>{location}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Today's Part-Time Attendance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Calendar className="text-purple-600" size={20} />
                        Part-Time Staff Attendance - {new Date(selectedDate).toLocaleDateString()}
                        {(locationFilter !== 'All' || userLocation) && (
                            <span className="text-sm text-gray-500">
                                ({userLocation || locationFilter})
                            </span>
                        )}
                    </h2>
                </div>

                {filteredTodayAttendance.length === 0 ? (
                    <div className="p-8 text-center">
                        <Clock className="mx-auto text-gray-400 mb-4" size={48} />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No part-time staff for today</h3>
                        <p className="text-gray-500">Add part-time staff using the button above.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                                    <th className="sticky left-0 z-10 bg-gray-50 px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredTodayAttendance.map((record, index) => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                                        <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            {record.staffName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                                {record.location}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {record.shift}
                                            </span>
                                            {(record.arrivalTime || record.leavingTime) && (
                                                <div className="text-xs mt-1 text-gray-600">
                                                    {record.arrivalTime && `In: ${new Date(`2000-01-01T${record.arrivalTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                                                    {record.arrivalTime && record.leavingTime && ' | '}
                                                    {record.leavingTime && `Out: ${new Date(`2000-01-01T${record.leavingTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {editingAttendance === record.id ? (
                                                <div className="space-y-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input
                                                            type="text"
                                                            value={editData.name}
                                                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                            className="px-2 py-1 text-xs border rounded"
                                                            placeholder="Name"
                                                        />
                                                        <select
                                                            value={editData.location}
                                                            onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                                                            className="px-2 py-1 text-xs border rounded"
                                                        >
                                                            {settingsService.getLocations().map(loc => (<option key={loc} value={loc}>{loc}</option>))}
                                                        </select>
                                                        <select
                                                            value={editData.shift}
                                                            onChange={(e) => setEditData({ ...editData, shift: e.target.value })}
                                                            className="px-2 py-1 text-xs border rounded"
                                                        >
                                                            <option value="Morning">Morning</option>
                                                            <option value="Evening">Evening</option>
                                                            <option value="Both">Both</option>
                                                        </select>
                                                        <select
                                                            value={editData.status}
                                                            onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                                            className="px-2 py-1 text-xs border rounded"
                                                        >
                                                            <option value="Present">Present</option>
                                                            <option value="Half Day">Half Day</option>
                                                            <option value="Absent">Absent</option>
                                                        </select>
                                                        <input
                                                            type="time"
                                                            value={editData.arrivalTime}
                                                            onChange={(e) => setEditData({ ...editData, arrivalTime: e.target.value })}
                                                            className="px-2 py-1 text-xs border rounded"
                                                            placeholder="Arrival"
                                                        />
                                                        <input
                                                            type="time"
                                                            value={editData.leavingTime}
                                                            onChange={(e) => setEditData({ ...editData, leavingTime: e.target.value })}
                                                            className="px-2 py-1 text-xs border rounded"
                                                            placeholder="Leaving"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={editData.salary}
                                                            onChange={(e) => setEditData({ ...editData, salary: Number(e.target.value) })}
                                                            className="w-20 px-2 py-1 text-xs border rounded"
                                                            min="0"
                                                        />
                                                        <button
                                                            onClick={() => handleSave(record)}
                                                            className="text-green-600 hover:text-green-800 p-1"
                                                        >
                                                            <Save size={14} />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="text-red-600 hover:text-red-800 p-1"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-semibold ${record.salaryOverride ? 'text-orange-600' : 'text-green-600'}`}>
                                                        ₹{record.salary || getPartTimeDailySalary(record.date)}
                                                    </span>
                                                    {record.salaryOverride && (
                                                        <span className="text-xs text-orange-600">(edited)</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {editingAttendance !== record.id && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleEdit(record)}
                                                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                                                        title="Edit record"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(record.id)}
                                                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                                                        title="Delete record"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Monthly Salary Report */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <DollarSign className="text-green-600" size={20} />
                        Part-Time Staff Salary Report
                        {userLocation && (
                            <span className="text-sm text-gray-500">- {userLocation}</span>
                        )}
                    </h2>
                    <div className="flex flex-wrap gap-2 md:gap-4">
                        {/* Multi-Location Filter Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white hover:bg-gray-50 flex items-center gap-2"
                            >
                                {getLocationButtonText()}
                                <span className="text-xs">▼</span>
                            </button>
                            {showLocationDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[200px]">
                                    <div className="p-2 space-y-1">
                                        <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={reportLocationFilter.includes('All')}
                                                onChange={() => handleLocationToggle('All')}
                                                className="w-4 h-4 text-purple-600 rounded"
                                            />
                                            <span className="text-sm">All Locations</span>
                                        </label>
                                        <hr className="my-1" />
                                        {['Big Shop', 'Small Shop', 'Godown'].map(location => (
                                            <label key={location} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={reportLocationFilter.includes(location)}
                                                    onChange={() => handleLocationToggle(location)}
                                                    className="w-4 h-4 text-purple-600 rounded"
                                                />
                                                <span className="text-sm">{location}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value as 'monthly' | 'weekly' | 'dateRange')}
                            className="px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        >
                            <option value="monthly">Monthly</option>
                            <option value="weekly">Weekly</option>
                            <option value="dateRange">Date Range</option>
                        </select>

                        {reportType === 'weekly' && (() => {
                            const weeks = getWeeksInMonth(selectedYear, selectedMonth);
                            const selectedWeekData = weeks[selectedWeek];
                            return (
                                <div className="flex flex-wrap items-center gap-2">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                        className="px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i} value={i}>
                                                {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className="px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                    >
                                        {Array.from({ length: 5 }, (_, i) => (
                                            <option key={i} value={new Date().getFullYear() - 2 + i}>
                                                {new Date().getFullYear() - 2 + i}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedWeek}
                                        onChange={(e) => setSelectedWeek(Number(e.target.value))}
                                        className="px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                    >
                                        {weeks.map((week, index) => (
                                            <option key={index} value={index}>
                                                Week {index + 1}: {week.start} - {week.end}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedWeekData && (
                                        <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                                            Current Week: {selectedWeekData.start} - {selectedWeekData.end}
                                        </span>
                                    )}
                                </div>
                            );
                        })()}

                        {reportType === 'dateRange' && (
                            <>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    min={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                />
                            </>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                            checked={selectedStaff.size > 0 && partTimeSalaries.every(s => selectedStaff.has(`${s.staffName}-${s.location}`))}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    const newSelection = new Set<string>();
                                                    partTimeSalaries.forEach(s => newSelection.add(`${s.staffName}-${s.location}`));
                                                    setSelectedStaff(newSelection);
                                                } else {
                                                    setSelectedStaff(new Set());
                                                }
                                            }}
                                        />
                                        <span>Select</span>
                                    </div>
                                </th>
                                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                                <th className="sticky left-0 z-10 bg-gray-50 px-3 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Name</th>
                                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                {reportType === 'weekly' && getWeeksInMonth(selectedYear, selectedMonth)[selectedWeek] && (() => {
                                    const weekData = getWeeksInMonth(selectedYear, selectedMonth)[selectedWeek];
                                    const headers = [];

                                    for (let i = 0; i < 7; i++) {
                                        const currentDate = new Date(weekData.startDate);
                                        currentDate.setDate(currentDate.getDate() + i);
                                        const dayNum = currentDate.getDate();
                                        const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });

                                        headers.push(
                                            <th key={i} className="w-16 min-w-[64px] px-1 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <div>{dayNum}</div>
                                                <div className="text-[10px] text-gray-400">{monthName}</div>
                                            </th>
                                        );
                                    }
                                    return headers;
                                })()}
                                {reportType !== 'weekly' && (
                                    <>
                                        <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Attendance</th>
                                        <th className="px-3 md:px-6 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Breakdown</th>
                                    </>
                                )}
                                <th className="px-3 md:px-6 py-3 md:py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {partTimeSalaries.length === 0 ? (
                                <tr>
                                    <td colSpan={reportType === 'weekly' ? 12 : 7} className="px-6 py-4 text-center text-gray-500">
                                        No records found for the selected period
                                    </td>
                                </tr>
                            ) : (
                                partTimeSalaries.map((salary, index) => (
                                    <tr key={`${salary.staffName}-${index}`} className="hover:bg-gray-50 text-xs md:text-sm">
                                        <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedStaff.has(`${salary.staffName}-${salary.location}`)}
                                                onChange={(e) => {
                                                    const newSelection = new Set(selectedStaff);
                                                    const key = `${salary.staffName}-${salary.location}`;
                                                    if (e.target.checked) {
                                                        newSelection.add(key);
                                                    } else {
                                                        newSelection.delete(key);
                                                    }
                                                    setSelectedStaff(newSelection);
                                                }}
                                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                            />
                                        </td>
                                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-gray-900">{index + 1}</td>
                                        <td className="sticky left-0 z-10 bg-white px-3 md:px-6 py-4 whitespace-nowrap font-medium text-gray-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            {salary.staffName}
                                        </td>
                                        <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                                {salary.location}
                                            </span>
                                        </td>
                                        {reportType === 'weekly' && (() => {
                                            const weekData = getWeeksInMonth(selectedYear, selectedMonth)[selectedWeek];
                                            if (!weekData) return null;

                                            const dailySalaries: Record<string, number> = {};

                                            // Map all attendance to date strings (YYYY-MM-DD)
                                            salary.weeklyBreakdown.flatMap(week => week.days).forEach(day => {
                                                const dateKey = day.date; // Already in YYYY-MM-DD format
                                                dailySalaries[dateKey] = day.salary;
                                            });

                                            // Generate 7 columns for the week
                                            return Array.from({ length: 7 }, (_, i) => {
                                                const currentDate = new Date(weekData.startDate);
                                                currentDate.setDate(currentDate.getDate() + i);

                                                // Create local date string manually to avoid timezone shifts
                                                const year = currentDate.getFullYear();
                                                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                                                const day = String(currentDate.getDate()).padStart(2, '0');
                                                const dateKey = `${year}-${month}-${day}`;

                                                const salary = dailySalaries[dateKey];

                                                return (
                                                    <td key={i} className="w-16 min-w-[64px] px-1 py-4 text-center text-gray-900 font-semibold">
                                                        {salary ? `₹${salary}` : '-'}
                                                    </td>
                                                );
                                            });
                                        })()}
                                        {reportType !== 'weekly' && (
                                            <>
                                                <td className="px-3 md:px-6 py-4 text-left text-gray-900">
                                                    <div className="flex flex-col gap-1">
                                                        {salary.weeklyBreakdown.flatMap(week => week.days).map((day, dayIndex) => (
                                                            <div key={dayIndex} className="text-xs">
                                                                {new Date(day.date).toLocaleDateString('en-GB', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: '2-digit'
                                                                })} - ₹{day.salary}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                                                    <div className="flex flex-col gap-1">
                                                        {salary.weeklyBreakdown.map((week, wIndex) => (
                                                            <div key={wIndex} className="text-xs text-gray-500">
                                                                Week {week.week}: ₹{week.weekTotal}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right font-bold text-green-600">
                                            ₹{salary.totalEarnings}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold">
                            <tr>
                                <td colSpan={reportType === 'weekly' ? (getWeeksInMonth(selectedYear, selectedMonth)[selectedWeek] ? 3 + (getWeeksInMonth(selectedYear, selectedMonth)[selectedWeek].endDay - getWeeksInMonth(selectedYear, selectedMonth)[selectedWeek].startDay + 1) : 10) : 5} className="px-3 md:px-6 py-4 text-right text-gray-900">Total Payout:</td>
                                <td className="px-3 md:px-6 py-4 text-right text-green-600">₹{totalPartTimeEarnings}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Currency Note Breakdown */}
            {partTimeSalaries.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <DollarSign className="text-blue-600" size={20} />
                            Currency Note Breakdown
                        </div>
                        <span className="text-green-600">Total: ₹{totalPartTimeEarnings}</span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {sortedDenominations.map(denom => (
                            <div key={denom} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                <span className="font-medium text-gray-700">₹{denom}</span>
                                <span className="font-bold text-blue-600">x {currencyBreakdown[denom]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</h3>
                        <p className="text-gray-600 mb-6">Are you sure you want to delete this attendance record?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Part-Time Salary Rates</h3>
                            <button
                                onClick={() => {
                                    setShowSettings(false);
                                    setPartTimeRates(settingsService.getPartTimeRates()); // Reset
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Weekday Rate (₹)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">₹</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={partTimeRates.weekdayRate}
                                        onChange={(e) => setPartTimeRates({
                                            ...partTimeRates,
                                            weekdayRate: Number(e.target.value)
                                        })}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">Base rate for Monday to Saturday</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sunday Rate (₹)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">₹</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={partTimeRates.sundayRate}
                                        onChange={(e) => setPartTimeRates({
                                            ...partTimeRates,
                                            sundayRate: Number(e.target.value)
                                        })}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">Special rate for Sundays</p>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2">
                                <Clock className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                                <div className="text-xs text-blue-700">
                                    <p className="font-medium">Note:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                                        <li>Morning/Evening shifts earn 50% of these rates</li>
                                        <li>Changes apply to all future auto-calculations</li>
                                        <li>Existing manual overrides are preserved</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowSettings(false);
                                    setPartTimeRates(settingsService.getPartTimeRates()); // Reset
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    settingsService.updatePartTimeRates(partTimeRates);
                                    setShowSettings(false);
                                    // Force re-render to update calculated salaries
                                    window.location.reload();
                                }}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                            >
                                <Save size={16} />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );


};

export default PartTimeStaff;

