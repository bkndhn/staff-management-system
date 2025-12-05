import React, { useState } from 'react';
import { Staff, Attendance, SalaryDetail, AdvanceDeduction, PartTimeSalaryDetail } from '../types';
import { DollarSign, Download, Users, Calendar, TrendingUp, Edit2, Save, X, FileSpreadsheet, Search } from 'lucide-react';
import { calculateAttendanceMetrics, calculateSalary, calculatePartTimeSalary, roundToNearest10 } from '../utils/salaryCalculations';
import { exportSalaryToExcel, exportSalaryPDF } from '../utils/exportUtils';
import { settingsService } from '../services/settingsService';

interface SalaryManagementProps {
  staff: Staff[];
  attendance: Attendance[];
  advances: AdvanceDeduction[];
  onUpdateAdvances: (staffId: string, month: number, year: number, advances: Partial<AdvanceDeduction>) => void;
}

interface TempSalaryData {
  oldAdvance?: number;
  currentAdvance?: number;
  deduction?: number;
  newAdvance?: number;
  basicOverride?: number;
  incentiveOverride?: number;
  hraOverride?: number;
  sundayPenaltyOverride?: number;
  grossSalary?: number;
  netSalary?: number;
}

const SalaryManagement: React.FC<SalaryManagementProps> = ({
  staff,
  attendance,
  advances,
  onUpdateAdvances
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [editMode, setEditMode] = useState(false);
  const [tempAdvances, setTempAdvances] = useState<{ [key: string]: TempSalaryData }>({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const salaryCategories = settingsService.getSalaryCategories();
  const customCategories = salaryCategories.filter(c => !['basic', 'incentive', 'hra'].includes(c.id));

  const activeStaff = staff.filter(member => {
    if (!member.isActive) return false;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.location.toLowerCase().includes(query)
    );
  });

  // Filter staff by location
  const filteredStaff = locationFilter === 'All'
    ? activeStaff
    : activeStaff.filter(member => member.location === locationFilter);

  const calculateSalaryDetails = (): SalaryDetail[] => {
    return filteredStaff.map(member => {
      const attendanceMetrics = calculateAttendanceMetrics(member.id, attendance, selectedYear, selectedMonth);
      const memberAdvances = advances.find(adv =>
        adv.staffId === member.id &&
        adv.month === selectedMonth &&
        adv.year === selectedYear
      );

      return calculateSalary(member, attendanceMetrics, memberAdvances, advances, attendance, selectedMonth, selectedYear);
    });
  };

  // Calculate part-time salaries
  const calculatePartTimeSalaries = (): PartTimeSalaryDetail[] => {
    const monthlyAttendance = attendance.filter(record => {
      const recordDate = new Date(record.date);
      return record.isPartTime &&
        recordDate.getMonth() === selectedMonth &&
        recordDate.getFullYear() === selectedYear;
    });

    const uniqueStaff = new Map();
    monthlyAttendance.forEach(record => {
      if (record.staffName) {
        uniqueStaff.set(record.staffName, {
          name: record.staffName,
          location: record.location || 'Unknown'
        });
      }
    });

    return Array.from(uniqueStaff.values()).map(staff =>
      calculatePartTimeSalary(
        staff.name,
        staff.location,
        attendance,
        selectedYear,
        selectedMonth
      )
    );
  };

  const salaryDetails = calculateSalaryDetails();
  const partTimeSalaries = calculatePartTimeSalaries();
  const totalSalaryDisbursed = salaryDetails.reduce((sum, detail) => sum + detail.netSalary, 0);
  const totalPartTimeEarnings = partTimeSalaries.reduce((sum, salary) => sum + salary.totalEarnings, 0);
  const averageAttendance = salaryDetails.length > 0
    ? salaryDetails.reduce((sum, detail) => sum + detail.presentDays + (detail.halfDays * 0.5), 0) / salaryDetails.length
    : 0;

  const handleEnableEditAll = () => {
    const initialTempAdvances: { [key: string]: TempSalaryData } = {};

    activeStaff.forEach(member => {
      const currentAdvances = advances.find(adv =>
        adv.staffId === member.id &&
        adv.month === selectedMonth &&
        adv.year === selectedYear
      );

      // Get previous month's advance for old advance
      let prevMonth = selectedMonth - 1;
      let prevYear = selectedYear;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear = selectedYear - 1;
      }

      const previousAdvance = advances.find(adv =>
        adv.staffId === member.id &&
        adv.month === prevMonth &&
        adv.year === prevYear
      );

      // Get the salary detail for this member
      const detail = salaryDetails.find(d => d.staffId === member.id);

      const oldAdv = currentAdvances?.oldAdvance ?? previousAdvance?.newAdvance ?? 0;
      const curAdv = currentAdvances?.currentAdvance ?? 0;
      const deduction = currentAdvances?.deduction ?? 0;
      const basicVal = detail?.basicEarned ?? 0;
      const incentiveVal = detail?.incentiveEarned ?? 0;
      const hraVal = detail?.hraEarned ?? 0;
      const sundayPenaltyVal = detail?.sundayPenalty ?? 0;

      const grossSalary = roundToNearest10(basicVal + incentiveVal + hraVal);
      const netSalary = roundToNearest10(grossSalary - deduction - sundayPenaltyVal);
      const newAdvance = roundToNearest10(oldAdv + curAdv - deduction);

      initialTempAdvances[member.id] = {
        oldAdvance: oldAdv,
        currentAdvance: curAdv,
        deduction: deduction,
        basicOverride: basicVal,
        incentiveOverride: incentiveVal,
        hraOverride: hraVal,
        sundayPenaltyOverride: sundayPenaltyVal,
        grossSalary: grossSalary,
        netSalary: netSalary,
        newAdvance: newAdvance
      };
    });

    setTempAdvances(initialTempAdvances);
    setEditMode(true);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const savePromises = Object.keys(tempAdvances).map(staffId => {
        const temp = tempAdvances[staffId];
        if (temp) {
          const newAdvance = roundToNearest10((temp.oldAdvance || 0) + (temp.currentAdvance || 0) - (temp.deduction || 0));

          return onUpdateAdvances(staffId, selectedMonth, selectedYear, {
            oldAdvance: temp.oldAdvance,
            currentAdvance: temp.currentAdvance,
            deduction: temp.deduction,
            newAdvance,
            updatedAt: new Date().toISOString()
          });
        }
        return Promise.resolve();
      });

      await Promise.all(savePromises);

      setEditMode(false);
      setTempAdvances({});
    } catch (error) {
      console.error('Error saving advances:', error);
      alert('Error saving advances. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setTempAdvances({});
  };

  const handleExportExcel = () => {
    exportSalaryToExcel(salaryDetails, partTimeSalaries, staff, selectedMonth, selectedYear);
  };

  const handleExportPDF = () => {
    exportSalaryPDF(salaryDetails, partTimeSalaries, staff, selectedMonth, selectedYear);
  };

  const getAdvanceForStaff = (staffId: string) => {
    return advances.find(adv =>
      adv.staffId === staffId &&
      adv.month === selectedMonth &&
      adv.year === selectedYear
    );
  };

  const updateTempAdvance = (staffId: string, field: string, value: number) => {
    const current = tempAdvances[staffId] || {};
    const updated = { ...current, [field]: value };

    // Recalculate derived values
    const basicVal = updated.basicOverride || 0;
    const incentiveVal = updated.incentiveOverride || 0;
    const hraVal = updated.hraOverride || 0;
    const sundayPenaltyVal = updated.sundayPenaltyOverride || 0;
    const oldAdv = updated.oldAdvance || 0;
    const curAdv = updated.currentAdvance || 0;
    const deduction = updated.deduction || 0;

    // Gross = Basic + Incentive + HRA
    updated.grossSalary = roundToNearest10(basicVal + incentiveVal + hraVal);
    // Net = Gross - Deduction - Sunday Penalty
    updated.netSalary = roundToNearest10(updated.grossSalary - deduction - sundayPenaltyVal);
    // New Adv = Old Adv + Cur Adv - Deduction
    updated.newAdvance = roundToNearest10(oldAdv + curAdv - deduction);

    setTempAdvances({
      ...tempAdvances,
      [staffId]: updated
    });
  };

  // Calculate totals for the table
  const calculateTotals = () => {
    if (editMode) {
      // Calculate from temp values
      let totalGross = 0;
      let totalNet = 0;
      let totalNewAdv = 0;
      let totalDeduction = 0;
      let totalOldAdv = 0;
      let totalCurAdv = 0;

      Object.values(tempAdvances).forEach(temp => {
        totalGross += temp.grossSalary || 0;
        totalNet += temp.netSalary || 0;
        totalNewAdv += temp.newAdvance || 0;
        totalDeduction += temp.deduction || 0;
        totalOldAdv += temp.oldAdvance || 0;
        totalCurAdv += temp.currentAdvance || 0;
      });

      return { totalGross, totalNet, totalNewAdv, totalDeduction, totalOldAdv, totalCurAdv };
    } else {
      // Calculate from salary details
      const totalGross = salaryDetails.reduce((sum, d) => sum + d.grossSalary, 0);
      const totalNet = salaryDetails.reduce((sum, d) => sum + d.netSalary, 0);
      const totalNewAdv = salaryDetails.reduce((sum, d) => sum + d.newAdv, 0);
      const totalDeduction = salaryDetails.reduce((sum, d) => sum + d.deduction, 0);
      const totalOldAdv = salaryDetails.reduce((sum, d) => sum + d.oldAdv, 0);
      const totalCurAdv = salaryDetails.reduce((sum, d) => sum + d.curAdv, 0);

      return { totalGross, totalNet, totalNewAdv, totalDeduction, totalOldAdv, totalCurAdv };
    }
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign className="text-green-600" size={32} />
          Enhanced Salary Management
        </h1>

        <div className="flex flex-col md:flex-row gap-4 flex-1 md:justify-end">
          {/* Search Bar */}
          <div className="relative flex-1 md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={20} />
            </div>
            <input
              type="text"
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="whitespace-nowrap flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="whitespace-nowrap flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Month/Year Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Select Month and Year</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => (
                <option key={i} value={new Date().getFullYear() - 2 + i}>
                  {new Date().getFullYear() - 2 + i}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value as 'All' | 'Big Shop' | 'Small Shop' | 'Godown')}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All">All Locations</option>
              {settingsService.getLocations().map(loc => (<option key={loc} value={loc}>{loc}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Staff</p>
              <p className="text-3xl font-bold text-blue-600">{activeStaff.length}</p>
              <p className="text-xs text-gray-500">Active employees</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Full-Time Salary</p>
              <p className="text-3xl font-bold text-green-600">₹{(editMode ? Object.values(tempAdvances).reduce((sum, t) => sum + (t.netSalary || 0), 0) : totalSalaryDisbursed).toLocaleString()}</p>
              <p className="text-xs text-gray-500">
                For {new Date(0, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Part-Time Earnings</p>
              <p className="text-3xl font-bold text-purple-600">₹{totalPartTimeEarnings.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{partTimeSalaries.length} staff</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Attendance</p>
              <p className="text-3xl font-bold text-orange-600">{averageAttendance.toFixed(1)}</p>
              <p className="text-xs text-gray-500">Days per employee</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Disbursed</p>
              <p className="text-3xl font-bold text-indigo-600">₹{((editMode ? Object.values(tempAdvances).reduce((sum, t) => sum + (t.netSalary || 0), 0) : totalSalaryDisbursed) + totalPartTimeEarnings).toLocaleString()}</p>
              <p className="text-xs text-gray-500">Full + Part-time</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-indigo-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Full-Time Salary Details Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-gray-800">
                Full-Time Salary Details - {new Date(0, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear}
              </h2>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                All values rounded to nearest ₹10. Sunday absents incur ₹500 penalty.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 ml-4">
              {editMode ? (
                <>
                  <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 text-sm"
                  >
                    <Save size={16} />
                    <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save All'}</span>
                    <span className="sm:hidden">{saving ? 'Save' : 'Save'}</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400 text-sm"
                  >
                    <X size={16} />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEnableEditAll}
                  className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Edit2 size={16} />
                  <span className="hidden sm:inline">Enable Edit for All</span>
                  <span className="sm:hidden">Edit All</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 md:px-4 py-3 md:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-10 bg-gray-50">Name</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Half Days</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Leave</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Sun Abs</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Old Adv</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cur Adv</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Deduction</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Basic</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Incentive</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">HRA</th>{customCategories.map(cat => (<th key={cat.id} className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{cat.name}</th>))}
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Sun Penalty</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Gross</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">New Adv</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salaryDetails.map((detail, index) => {
                const staffMember = activeStaff.find(s => s.id === detail.staffId);
                const tempData = tempAdvances[detail.staffId];

                return (
                  <tr key={detail.staffId} className="hover:bg-gray-50 text-xs md:text-sm">
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-gray-900">{index + 1}</td>
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap font-medium text-gray-900 sticky left-0 z-10 bg-white">
                      {staffMember?.name}
                    </td>
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {detail.presentDays}
                      </span>
                    </td>
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {detail.halfDays}
                      </span>
                    </td>
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${detail.leaveDays > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                        {detail.leaveDays}
                      </span>
                    </td>
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${detail.sundayAbsents > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {detail.sundayAbsents}
                      </span>
                    </td>
                    {/* Old Adv - Editable */}
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      {editMode ? (
                        <input
                          type="number"
                          value={tempData?.oldAdvance || 0}
                          onChange={(e) => updateTempAdvance(detail.staffId, 'oldAdvance', Number(e.target.value))}
                          className="w-16 md:w-20 px-1 md:px-2 py-1 text-xs border rounded text-center"
                        />
                      ) : (
                        <span className="text-blue-600">₹{detail.oldAdv}</span>
                      )}
                    </td>
                    {/* Cur Adv - Editable */}
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      {editMode ? (
                        <input
                          type="number"
                          value={tempData?.currentAdvance || 0}
                          onChange={(e) => updateTempAdvance(detail.staffId, 'currentAdvance', Number(e.target.value))}
                          className="w-16 md:w-20 px-1 md:px-2 py-1 text-xs border rounded text-center"
                        />
                      ) : (
                        <span className="text-blue-600">₹{detail.curAdv}</span>
                      )}
                    </td>
                    {/* Deduction - Editable */}
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      {editMode ? (
                        <input
                          type="number"
                          value={tempData?.deduction || 0}
                          onChange={(e) => updateTempAdvance(detail.staffId, 'deduction', Number(e.target.value))}
                          className="w-16 md:w-20 px-1 md:px-2 py-1 text-xs border rounded text-center"
                        />
                      ) : (
                        <span className="text-red-600">₹{detail.deduction}</span>
                      )}
                    </td>
                    {/* Basic - Editable */}
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      {editMode ? (
                        <input
                          type="number"
                          value={tempData?.basicOverride || 0}
                          onChange={(e) => updateTempAdvance(detail.staffId, 'basicOverride', Number(e.target.value))}
                          className="w-16 md:w-20 px-1 md:px-2 py-1 text-xs border rounded text-center"
                        />
                      ) : (
                        <span className="text-gray-900">₹{detail.basicEarned}</span>
                      )}
                    </td>
                    {/* Incentive - Editable */}
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      {editMode ? (
                        <input
                          type="number"
                          value={tempData?.incentiveOverride || 0}
                          onChange={(e) => updateTempAdvance(detail.staffId, 'incentiveOverride', Number(e.target.value))}
                          className="w-16 md:w-20 px-1 md:px-2 py-1 text-xs border rounded text-center"
                        />
                      ) : (
                        <span className="text-gray-900">₹{detail.incentiveEarned}</span>
                      )}
                    </td>
                    {/* HRA - Editable */}
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      {editMode ? (
                        <input
                          type="number"
                          value={tempData?.hraOverride || 0}
                          onChange={(e) => updateTempAdvance(detail.staffId, 'hraOverride', Number(e.target.value))}
                          className="w-16 md:w-20 px-1 md:px-2 py-1 text-xs border rounded text-center"
                        />
                      ) : (
                        <span className="text-gray-900">₹{detail.hraEarned}</span>
                      )}
                    </td>
                    {/* Sunday Penalty - Editable */}
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      {editMode ? (
                        <input
                          type="number"
                          value={tempData?.sundayPenaltyOverride || 0}
                          onChange={(e) => updateTempAdvance(detail.staffId, 'sundayPenaltyOverride', Number(e.target.value))}
                          className="w-16 md:w-20 px-1 md:px-2 py-1 text-xs border rounded text-center"
                        />
                      ) : (
                        <span className={`${detail.sundayPenalty > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          ₹{detail.sundayPenalty}
                        </span>
                      )}
                    </td>
                    {/* Gross - Live calculated */}
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center font-semibold text-green-600">
                      ₹{editMode ? (tempData?.grossSalary || 0) : detail.grossSalary}
                    </td>
                    {/* Net Salary - Live calculated */}
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center font-bold text-green-700">
                      ₹{editMode ? (tempData?.netSalary || 0) : detail.netSalary}
                    </td>
                    {/* New Adv - Live calculated */}
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center text-blue-600">
                      ₹{editMode ? (tempData?.newAdvance || 0) : detail.newAdv}
                    </td>
                  </tr>
                );
              })}
              {/* Totals Row */}
              <tr className="bg-gray-100 font-bold text-sm">
                <td className="px-2 md:px-4 py-3 whitespace-nowrap" colSpan={6}>
                  <span className="text-gray-800">TOTAL</span>
                </td>
                <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center text-blue-600">
                  ₹{totals.totalOldAdv.toLocaleString()}
                </td>
                <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center text-blue-600">
                  ₹{totals.totalCurAdv.toLocaleString()}
                </td>
                <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center text-red-600">
                  ₹{totals.totalDeduction.toLocaleString()}
                </td>
                <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center" colSpan={4}></td>
                <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center text-green-600">
                  ₹{totals.totalGross.toLocaleString()}
                </td>
                <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center text-green-700">
                  ₹{totals.totalNet.toLocaleString()}
                </td>
                <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center text-blue-600">
                  ₹{totals.totalNewAdv.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Part-Time Salary Details */}
      {partTimeSalaries.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">
              Part-Time Staff Earnings - {new Date(0, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear}
            </h2>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              Rate: ₹350/day (Mon-Sat), ₹400/day (Sunday)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-10 bg-gray-50">Name</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Days</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Breakdown</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Earnings</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {partTimeSalaries.map((salary, index) => (
                  <tr key={`${salary.staffName}-${index}`} className="hover:bg-gray-50 text-xs md:text-sm">
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-gray-900">{index + 1}</td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap font-medium text-gray-900 sticky left-0 z-10 bg-white">
                      {salary.staffName}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {salary.location}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center text-gray-900">
                      {salary.totalDays}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center text-gray-900">
                      <div className="space-y-1">
                        {salary.weeklyBreakdown.map(week => (
                          <div key={week.week} className="text-xs">
                            Week {week.week}: {week.days.length} days - ₹{week.weekTotal}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center font-bold text-purple-600">
                      ₹{salary.totalEarnings.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {/* Part-Time Totals Row */}
                <tr className="bg-gray-100 font-bold text-sm">
                  <td className="px-3 md:px-6 py-3 whitespace-nowrap" colSpan={5}>
                    <span className="text-gray-800">TOTAL</span>
                  </td>
                  <td className="px-3 md:px-6 py-3 whitespace-nowrap text-center text-purple-600">
                    ₹{totalPartTimeEarnings.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;