import React, { useState } from 'react';
import { Staff, Attendance, SalaryDetail, AdvanceDeduction, PartTimeSalaryDetail } from '../types';
import { DollarSign, Download, Users, Calendar, TrendingUp, Edit2, Save, X, FileSpreadsheet, Search, FileText } from 'lucide-react';
import { calculateAttendanceMetrics, calculateSalary, calculatePartTimeSalary, roundToNearest10 } from '../utils/salaryCalculations';
import { exportSalaryToExcel, exportSalaryPDF, generateSalarySlipPDF, exportBulkSalarySlipsPDF } from '../utils/exportUtils';
import { settingsService } from '../services/settingsService';
import { salaryOverrideService } from '../services/salaryOverrideService';

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
  mealAllowanceOverride?: number;
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
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  // Fetch locations on mount
  React.useEffect(() => {
    const fetchLocations = async () => {
      // Dynamic import to avoid circular dependency
      const { locationService } = await import('../services/locationService');
      const locs = await locationService.getLocations();
      setLocations(locs);
    };
    fetchLocations();
  }, []);

  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [editMode, setEditMode] = useState(false);
  const [tempAdvances, setTempAdvances] = useState<{ [key: string]: TempSalaryData }>({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const salaryCategories = settingsService.getSalaryCategories();

  const customCategories = salaryCategories.filter(c => !['basic', 'incentive', 'hra', 'meal_allowance'].includes(c.id));

  // Load monthly overrides
  React.useEffect(() => {
    const loadOverrides = async () => {
      const overrides = await salaryOverrideService.getOverrides(selectedMonth + 1, selectedYear);
      const newTempAdvances: { [key: string]: TempSalaryData } = {};

      overrides.forEach(ov => {
        // Find existing advance data to preserve old/current advance if needed,
        // but here we primarily care about salary components.
        // We recalculate the totals based on overrides.

        // Note: We need the BASE values to calculate correctly? 
        // No, the override REPLACES the base value in the calculation.
        // But for "net", we need deduction etc.
        // Since we don't have all data here easily, strictly speaking, 
        // we should merge with existing tempAdvances or initialize carefully.

        const basicVal = ov.basicOverride;
        const incentiveVal = ov.incentiveOverride;
        const hraVal = ov.hraOverride;
        const mealVal = ov.mealAllowanceOverride;
        const sundayVal = ov.sundayPenaltyOverride;

        // If we have any override, we initialize the temp object
        if (basicVal !== undefined || incentiveVal !== undefined || hraVal !== undefined || mealVal !== undefined || sundayVal !== undefined) {
          newTempAdvances[ov.staffId] = {
            basicOverride: basicVal,
            incentiveOverride: incentiveVal,
            hraOverride: hraVal,
            mealAllowanceOverride: mealVal,
            sundayPenaltyOverride: sundayVal,
            // We can't easily calc gross/net here without knowing defaults (advances/deductions)
            // But the UI will use these overrides when switching to edit mode?
            // Actually, if we just set these, the `getEffectiveSalary` helper (if it exists) would work.
            // But existing code expects `grossSalary` in tempData?
          };
        }
      });

      setTempAdvances(prev => {
        // Merge with previous to not lose other edits if any (though usually we load on mount/month change)
        // Actually, we should merge carefully.
        // For now, let's just use the loaded overrides as the base state for this month.
        return newTempAdvances;
      });

      // If we have overrides, we should probably turn on edit mode for those rows? 
      // Or just having the data there allows the "Edit" button to show them?
      // When user clicks "Edit All", it initializes tempAdvances. 
      // We need to ensure that initialization RESPECTS these loaded overrides.
    };
    loadOverrides();
  }, [selectedMonth, selectedYear]);

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

  // State for monthly overrides
  const [overrides, setOverrides] = useState<{ [key: string]: SalaryOverride }>({});

  // Load monthly overrides
  React.useEffect(() => {
    const loadOverrides = async () => {
      const dbOverrides = await salaryOverrideService.getOverrides(selectedMonth + 1, selectedYear);
      const overridesMap: { [key: string]: SalaryOverride } = {};

      const newTempAdvances: { [key: string]: TempSalaryData } = {};

      dbOverrides.forEach(ov => {
        overridesMap[ov.staffId] = ov;

        const basicVal = ov.basicOverride;
        const incentiveVal = ov.incentiveOverride;
        const hraVal = ov.hraOverride;
        const mealVal = ov.mealAllowanceOverride;
        const sundayVal = ov.sundayPenaltyOverride;

        if (basicVal !== undefined || incentiveVal !== undefined || hraVal !== undefined || mealVal !== undefined || sundayVal !== undefined) {
          newTempAdvances[ov.staffId] = {
            basicOverride: basicVal,
            incentiveOverride: incentiveVal,
            hraOverride: hraVal,
            mealAllowanceOverride: mealVal,
            sundayPenaltyOverride: sundayVal,
          };
        }
      });

      setOverrides(overridesMap);
      setTempAdvances(newTempAdvances);
    };
    loadOverrides();
  }, [selectedMonth, selectedYear]);


  const calculateSalaryDetails = (): SalaryDetail[] => {
    return filteredStaff.map(member => {
      const attendanceMetrics = calculateAttendanceMetrics(member.id, attendance, selectedYear, selectedMonth);
      const memberAdvances = advances.find(adv =>
        adv.staffId === member.id &&
        adv.month === selectedMonth &&
        adv.year === selectedYear
      );

      const baseDetail = calculateSalary(member, attendanceMetrics, memberAdvances, advances, attendance, selectedMonth, selectedYear);

      // Merge with overrides if present
      const override = overrides[member.id];
      if (override) {
        const basic = override.basicOverride ?? baseDetail.basicEarned;
        const incentive = override.incentiveOverride ?? baseDetail.incentiveEarned;
        const hra = override.hraOverride ?? baseDetail.hraEarned;
        const meal = override.mealAllowanceOverride ?? baseDetail.mealAllowance;
        const sundayPenalty = override.sundayPenaltyOverride ?? baseDetail.sundayPenalty;

        // Recalculate totals
        // Note: Gross = sum of earnings. Net = Gross - Deductions.
        // We assume 'baseDetail.deduction' is correct unless overridden (advances logic handled elsewhere?)
        // Actually, advances are separate. 'baseDetail.deduction' includes standard deductions.

        const gross = roundToNearest10(basic + incentive + hra + meal);
        const net = roundToNearest10(gross - baseDetail.deduction - sundayPenalty);

        return {
          ...baseDetail,
          basicEarned: basic,
          incentiveEarned: incentive,
          hraEarned: hra,
          mealAllowance: meal,
          sundayPenalty: sundayPenalty,
          grossSalary: gross,
          netSalary: net
        };
      }

      return baseDetail;
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
      const mealAllowanceVal = detail?.mealAllowance ?? 0;
      const sundayPenaltyVal = detail?.sundayPenalty ?? 0;

      const grossSalary = roundToNearest10(basicVal + incentiveVal + hraVal + mealAllowanceVal);
      const netSalary = roundToNearest10(grossSalary - deduction - sundayPenaltyVal);
      const newAdvance = roundToNearest10(oldAdv + curAdv - deduction);

      initialTempAdvances[member.id] = {
        oldAdvance: oldAdv,
        currentAdvance: curAdv,
        deduction: deduction,
        basicOverride: basicVal,
        incentiveOverride: incentiveVal,
        hraOverride: hraVal,
        mealAllowanceOverride: mealAllowanceVal,
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

  const handleDownloadAllSlips = () => {
    exportBulkSalarySlipsPDF(salaryDetails, staff, selectedMonth, selectedYear);
  };

  const handleDownloadSingleSlip = (detail: SalaryDetail) => {
    const staffMember = staff.find(s => s.id === detail.staffId);
    if (staffMember) {
      generateSalarySlipPDF(detail, staffMember, selectedMonth, selectedYear);
    }
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
    const mealAllowanceVal = updated.mealAllowanceOverride || 0;
    const sundayPenaltyVal = updated.sundayPenaltyOverride || 0;
    const oldAdv = updated.oldAdvance || 0;
    const curAdv = updated.currentAdvance || 0;
    const deduction = updated.deduction || 0;

    // Gross = Basic + Incentive + HRA + Meal Allowance
    updated.grossSalary = roundToNearest10(basicVal + incentiveVal + hraVal + mealAllowanceVal);
    // Net = Gross - Deduction - Sunday Penalty
    updated.netSalary = roundToNearest10(updated.grossSalary - deduction - sundayPenaltyVal);
    // New Adv = Old Adv + Cur Adv - Deduction
    updated.newAdvance = roundToNearest10(oldAdv + curAdv - deduction);

    setTempAdvances({
      ...tempAdvances,
      [staffId]: updated
    });

    // Auto-save overrides to DB and update local overrides state
    if (['basicOverride', 'incentiveOverride', 'hraOverride', 'mealAllowanceOverride', 'sundayPenaltyOverride'].includes(field)) {
      const overrideUpdate = {
        staffId,
        month: selectedMonth + 1,
        year: selectedYear,
        basicOverride: updated.basicOverride,
        incentiveOverride: updated.incentiveOverride,
        hraOverride: updated.hraOverride,
        mealAllowanceOverride: updated.mealAllowanceOverride,
        sundayPenaltyOverride: updated.sundayPenaltyOverride
      };

      // Optimistically update local state so View Mode reflects changes instantly
      setOverrides(prev => ({
        ...prev,
        [staffId]: {
          ...prev[staffId],
          id: prev[staffId]?.id || '', // Keep existing ID or empty
          ...overrideUpdate
        }
      }));

      salaryOverrideService.upsertOverride(overrideUpdate)
        .catch(err => console.error("Failed to auto-save override:", err));
    }
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
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="stat-icon stat-icon-success">
            <DollarSign size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Salary Management</h1>
            <p className="text-white/50 text-sm">Track and manage salaries</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 flex-1 md:justify-end">
          {/* Search Bar */}
          <div className="relative flex-1 md:max-w-md">
            <input
              type="text"
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-premium"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="btn-premium btn-premium-success whitespace-nowrap flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-sm"
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="btn-premium whitespace-nowrap flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button
              onClick={handleDownloadAllSlips}
              className="btn-premium whitespace-nowrap flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-sm"
              style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' }}
              title="Download individual salary slips for all staff"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">All Slips</span>
              <span className="sm:hidden">Slips</span>
            </button>
          </div>
        </div>
      </div>

      {/* Month/Year/Location Selection - Compact Single Row */}
      <div className="glass-card-static p-3 md:p-4">
        <div className="flex flex-row items-center justify-center gap-2 md:gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            <label className="text-xs font-medium text-white/60 hidden sm:inline">Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="input-premium px-2 py-1.5 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {new Date(0, i).toLocaleString('default', { month: 'short' })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs font-medium text-white/60 hidden sm:inline">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input-premium px-2 py-1.5 text-sm"
            >
              {Array.from({ length: 5 }, (_, i) => (
                <option key={i} value={new Date().getFullYear() - 2 + i}>
                  {new Date().getFullYear() - 2 + i}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs font-medium text-white/60 hidden sm:inline">Location:</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value as 'All' | 'Big Shop' | 'Small Shop' | 'Godown')}
              className="input-premium px-2 py-1.5 text-sm"
            >
              <option value="All">All Locations</option>
              {locations.map(loc => (<option key={loc.id} value={loc.name}>{loc.name}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">Active Staff</p>
              <p className="text-3xl font-bold text-blue-400">{activeStaff.length}</p>
              <p className="text-xs text-white/50">Active employees</p>
            </div>
            <div className="stat-icon stat-icon-primary">
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">Full-Time Salary</p>
              <p className="text-3xl font-bold text-emerald-400">₹{(editMode ? Object.values(tempAdvances).reduce((sum, t) => sum + (t.netSalary || 0), 0) : totalSalaryDisbursed).toLocaleString()}</p>
              <p className="text-xs text-white/50">
                For {new Date(0, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear}
              </p>
            </div>
            <div className="stat-icon stat-icon-success">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">Part-Time Earnings</p>
              <p className="text-3xl font-bold text-purple-400">₹{totalPartTimeEarnings.toLocaleString()}</p>
              <p className="text-xs text-white/50">{partTimeSalaries.length} staff</p>
            </div>
            <div className="stat-icon stat-icon-purple">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">Average Attendance</p>
              <p className="text-3xl font-bold text-amber-400">{averageAttendance.toFixed(1)}</p>
              <p className="text-xs text-white/50">Days per employee</p>
            </div>
            <div className="stat-icon stat-icon-warning">
              <Calendar size={24} />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">Total Disbursed</p>
              <p className="text-3xl font-bold text-indigo-400">₹{((editMode ? Object.values(tempAdvances).reduce((sum, t) => sum + (t.netSalary || 0), 0) : totalSalaryDisbursed) + totalPartTimeEarnings).toLocaleString()}</p>
              <p className="text-xs text-white/50">Full + Part-time</p>
            </div>
            <div className="stat-icon stat-icon-primary">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Full-Time Salary Details Table */}
      <div className="table-container">
        <div className="p-4 md:p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-white">
                Full-Time Salary Details - {new Date(0, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear}
              </h2>
              <p className="text-xs md:text-sm text-white/50 mt-1">
                All values rounded to nearest ₹10. Sunday absents incur ₹500 penalty.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 ml-4">
              {editMode ? (
                <>
                  <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="btn-premium btn-premium-success flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-sm disabled:opacity-50"
                  >
                    <Save size={16} />
                    <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save All'}</span>
                    <span className="sm:hidden">{saving ? 'Save' : 'Save'}</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="btn-ghost flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-sm disabled:opacity-50"
                  >
                    <X size={16} />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEnableEditAll}
                  className="btn-premium flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-sm"
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
          <table className="table-premium">
            <thead>
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
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{salaryCategories.find(c => c.id === 'basic')?.name || 'Basic'}</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{salaryCategories.find(c => c.id === 'incentive')?.name || 'Incentive'}</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{salaryCategories.find(c => c.id === 'hra')?.name || 'HRA'}</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{salaryCategories.find(c => c.id === 'meal_allowance')?.name || 'Meal Allowance'}</th>
                {customCategories.map(cat => (<th key={cat.id} className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{cat.name}</th>))}
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Sun Penalty</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Gross</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">New Adv</th>
                <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salaryDetails.map((detail, index) => {
                const staffMember = activeStaff.find(s => s.id === detail.staffId);
                const tempData = tempAdvances[detail.staffId];

                return (
                  <tr key={detail.staffId} className="hover:bg-gray-50 text-sm md:text-base">
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-gray-900">{index + 1}</td>
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap font-medium text-gray-900 sticky left-0 z-10 bg-white">
                      {staffMember?.name}
                    </td>
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      <span className="badge-premium badge-success">
                        {detail.presentDays}
                      </span>
                    </td>
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      <span className="badge-premium badge-warning">
                        {detail.halfDays}
                      </span>
                    </td>
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      <span className={`badge-premium ${detail.leaveDays > 0 ? 'badge-danger' : 'badge-success'
                        }`}>
                        {detail.leaveDays}
                      </span>
                    </td>
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      <span className={`badge-premium ${detail.sundayAbsents > 0 ? 'badge-danger' : 'badge-neutral'
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
                    {/* Meal Allowance - Editable */}
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      {editMode ? (
                        <input
                          type="number"
                          value={tempData?.mealAllowanceOverride || 0}
                          onChange={(e) => updateTempAdvance(detail.staffId, 'mealAllowanceOverride', Number(e.target.value))}
                          className="w-16 md:w-20 px-1 md:px-2 py-1 text-xs border rounded text-center"
                        />
                      ) : (
                        <span className="text-gray-900">₹{detail.mealAllowance}</span>
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
                    {/* Actions - Download Slip */}
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleDownloadSingleSlip(detail)}
                        className="inline-flex items-center justify-center p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Download Salary Slip"
                      >
                        <Download size={16} />
                      </button>
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
      </div >

      {/* Part-Time Salary Details */}
      {
        partTimeSalaries.length > 0 && (
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
        )
      }
    </div >
  );
};

export default SalaryManagement;