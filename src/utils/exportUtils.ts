import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Staff, Attendance, SalaryDetail, OldStaffRecord, PartTimeSalaryDetail } from '../types';

// Remove currency symbol for exports
const formatNumberForExport = (value: number): number => {
  return value;
};

const formatCurrencyForExport = (value: number): string => {
  return value.toString();
};

// Calculate currency note breakdown
const calculateCurrencyNotes = (amount: number): Record<string, number> => {
  const denominations = [500, 200, 100, 50, 20, 10];
  const breakdown: Record<string, number> = {};
  let remaining = Math.round(amount);
  
  denominations.forEach(denom => {
    const count = Math.floor(remaining / denom);
    breakdown[denom.toString()] = count;
    remaining = remaining % denom;
  });
  
  return breakdown;
};

export const exportAttendanceToExcel = (
  staff: Staff[],
  attendance: Attendance[],
  selectedDate: string
) => {
  const data = staff.filter(s => s.isActive).map((member, index) => {
    const attendanceRecord = attendance.find(a => a.staffId === member.id && a.date === selectedDate);
    return {
      'S.No': index + 1,
      'Name': member.name,
      'Location': member.location,
      'Type': member.type,
      'Status': attendanceRecord?.status || 'Absent',
      'Shift': attendanceRecord?.shift || '-'
    };
  });

  // Add part-time staff
  const partTimeAttendance = attendance.filter(a => a.isPartTime && a.date === selectedDate);
  partTimeAttendance.forEach((record, index) => {
    data.push({
      'S.No': staff.length + index + 1,
      'Name': record.staffName || 'Unknown',
      'Location': record.location || 'Part-Time',
      'Type': 'part-time',
      'Status': record.status,
      'Shift': record.shift || '-'
    });
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  XLSX.writeFile(wb, `attendance-report-${selectedDate}.xlsx`);
};

export const exportSalaryToExcel = (
  salaryDetails: SalaryDetail[],
  partTimeSalaries: PartTimeSalaryDetail[],
  staff: Staff[],
  month: number,
  year: number
) => {
  // Full-time staff data
  const fullTimeData = salaryDetails.map((detail, index) => {
    const staffMember = staff.find(s => s.id === detail.staffId);
    return {
      'S.No': index + 1,
      'Name': staffMember?.name || 'Unknown',
      'Present': detail.presentDays,
      'Half Days': detail.halfDays,
      'Leave': detail.leaveDays,
      'Sunday Absents': detail.sundayAbsents,
      'Old Advance': formatNumberForExport(detail.oldAdv),
      'Current Advance': formatNumberForExport(detail.curAdv),
      'Deduction': formatNumberForExport(detail.deduction),
      'Basic Earned': formatNumberForExport(detail.basicEarned),
      'Incentive Earned': formatNumberForExport(detail.incentiveEarned),
      'HRA Earned': formatNumberForExport(detail.hraEarned),
      'Sunday Penalty': formatNumberForExport(detail.sundayPenalty),
      'Gross Salary': formatNumberForExport(detail.grossSalary),
      'Net Salary': formatNumberForExport(detail.netSalary),
      'New Advance': formatNumberForExport(detail.newAdv)
    };
  });

  // Part-time staff data
  const partTimeData = partTimeSalaries.map((detail, index) => ({
    'S.No': index + 1,
    'Name': detail.staffName,
    'Location': detail.location,
    'Total Days': detail.totalDays,
    'Total Earnings': formatNumberForExport(detail.totalEarnings)
  }));

  const wb = XLSX.utils.book_new();
  
  if (fullTimeData.length > 0) {
    const ws1 = XLSX.utils.json_to_sheet(fullTimeData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Full-Time Salary');
  }
  
  if (partTimeData.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(partTimeData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Part-Time Salary');
  }

  const monthName = new Date(0, month).toLocaleString('default', { month: 'long' });
  XLSX.writeFile(wb, `salary-report-${monthName}-${year}.xlsx`);
};

export const exportAttendancePDF = (
  staff: Staff[],
  attendance: Attendance[],
  selectedDate: string,
  isMonthly: boolean = false,
  monthlyData?: { month: number; year: number }
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Staff Attendance Report', 20, 20);
  
  if (isMonthly && monthlyData) {
    doc.setFontSize(12);
    doc.text(`Month: ${new Date(0, monthlyData.month).toLocaleString('default', { month: 'long' })} ${monthlyData.year}`, 20, 35);
  } else {
    doc.setFontSize(12);
    doc.text(`Date: ${new Date(selectedDate).toLocaleDateString()}`, 20, 35);
  }

  // Prepare data
  const tableData = staff.filter(s => s.isActive).map((member, index) => {
    const attendanceRecord = attendance.find(a => a.staffId === member.id && a.date === selectedDate);
    return [
      index + 1,
      member.name,
      member.location,
      member.type,
      attendanceRecord?.status || 'Absent',
      attendanceRecord?.shift || '-'
    ];
  });

  // Add part-time staff
  const partTimeAttendance = attendance.filter(a => a.isPartTime && a.date === selectedDate);
  partTimeAttendance.forEach((record, index) => {
    tableData.push([
      staff.length + index + 1,
      record.staffName || 'Unknown',
      'Part-Time',
      'part-time',
      record.status,
      record.shift || '-'
    ]);
  });

  autoTable(doc, {
    head: [['S.No', 'Name', 'Location', 'Type', 'Status', 'Shift']],
    body: tableData,
    startY: 45,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [59, 130, 246] }
  });

  doc.save(`attendance-report-${selectedDate}.pdf`);
};

export const exportSalaryPDF = (
  salaryDetails: SalaryDetail[],
  partTimeSalaries: PartTimeSalaryDetail[],
  staff: Staff[],
  month: number,
  year: number
) => {
  const doc = new jsPDF('landscape');
  
  // Header
  doc.setFontSize(20);
  doc.text('Salary Report', 20, 20);
  doc.setFontSize(12);
  doc.text(`Month: ${new Date(0, month).toLocaleString('default', { month: 'long' })} ${year}`, 20, 35);

  let currentY = 45;

  // Full-time staff salary data (only if there are full-time salaries)
  if (salaryDetails.length > 0) {
    const fullTimeData = salaryDetails.map((detail, index) => {
      const staffMember = staff.find(s => s.id === detail.staffId);
      return [
        index + 1,
        staffMember?.name || 'Unknown',
        detail.presentDays,
        detail.halfDays,
        detail.leaveDays,
        detail.sundayAbsents,
        formatCurrencyForExport(detail.oldAdv),
        formatCurrencyForExport(detail.curAdv),
        formatCurrencyForExport(detail.deduction),
        formatCurrencyForExport(detail.basicEarned),
        formatCurrencyForExport(detail.incentiveEarned),
        formatCurrencyForExport(detail.hraEarned),
        formatCurrencyForExport(detail.sundayPenalty),
        formatCurrencyForExport(detail.grossSalary),
        formatCurrencyForExport(detail.netSalary),
        formatCurrencyForExport(detail.newAdv)
      ];
    });

    autoTable(doc, {
      head: [['S.No', 'Name', 'Present', 'Half', 'Leave', 'Sun Abs', 'Old Adv', 'Cur Adv', 'Deduction', 'Basic', 'Incentive', 'HRA', 'Sun Penalty', 'Gross', 'Net Salary', 'New Adv']],
      body: fullTimeData,
      startY: currentY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  // Part-time staff salary data
  if (partTimeSalaries.length > 0) {
    // Add part-time section header
    doc.setFontSize(14);
    doc.text('Part-Time Staff Salary Report', 20, currentY);
    currentY += 15;
    
    const partTimeData = partTimeSalaries.map((detail, index) => [
      index + 1,
      detail.staffName,
      detail.location,
      detail.totalDays,
      detail.totalEarnings
    ]);

    autoTable(doc, {
      head: [['S.No', 'Name', 'Location', 'Days', 'Total Earnings']],
      body: partTimeData,
      startY: currentY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [168, 85, 247] }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 20;
    
    // Add total part-time earnings
    const totalPartTimeEarnings = partTimeSalaries.reduce((sum, salary) => sum + salary.totalEarnings, 0);
    doc.setFontSize(12);
    doc.text(`Total Part-Time Earnings: ${totalPartTimeEarnings}`, 20, currentY);
    currentY += 15;
    
    // Calculate and display currency note breakdown
    const noteBreakdown = calculateCurrencyNotes(totalPartTimeEarnings);
    doc.setFontSize(10);
    doc.text('Currency Note Breakdown:', 20, currentY);
    currentY += 10;
    
    Object.entries(noteBreakdown).forEach(([denomination, count]) => {
      if (count > 0) {
        doc.text(`${denomination}s = ${count}`, 30, currentY);
        currentY += 8;
      }
    });
  }

  doc.save(`salary-report-${new Date(0, month).toLocaleString('default', { month: 'long' })}-${year}.pdf`);
};

// Export part-time salary PDF with week dates and currency breakdown
export const exportPartTimeSalaryPDF = (
  partTimeSalaries: PartTimeSalaryDetail[],
  month: number,
  year: number,
  reportType: 'weekly' | 'monthly' | 'dateRange',
  weekData?: { start: string; end: string },
  dateRange?: { start: string; end: string }
) => {
  const doc = new jsPDF('landscape');
  
  // Header
  doc.setFontSize(20);
  doc.text('Part-Time Staff Salary Report', 20, 20);
  
  // Date range header
  doc.setFontSize(12);
  if (reportType === 'weekly' && weekData) {
    doc.text(`Week: ${weekData.start} - ${weekData.end}`, 20, 35);
  } else if (reportType === 'dateRange' && dateRange) {
    doc.text(`Date Range: ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`, 20, 35);
  } else {
    doc.text(`Month: ${new Date(0, month).toLocaleString('default', { month: 'long' })} ${year}`, 20, 35);
  }

  let currentY = 50;

  // Part-time staff salary data
  if (partTimeSalaries.length > 0) {
    const partTimeData = partTimeSalaries.map((detail, index) => [
      index + 1,
      detail.staffName,
      detail.location,
      detail.totalDays,
      detail.totalEarnings
    ]);

    autoTable(doc, {
      head: [['S.No', 'Name', 'Location', 'Days', 'Total Earnings']],
      body: partTimeData,
      startY: currentY,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [168, 85, 247] }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 20;
    
    // Add total part-time earnings
    const totalPartTimeEarnings = partTimeSalaries.reduce((sum, salary) => sum + salary.totalEarnings, 0);
    doc.setFontSize(12);
    doc.text(`Total Part-Time Earnings: ${totalPartTimeEarnings}`, 20, currentY);
    currentY += 15;
    
    // Calculate and display currency note breakdown
    const noteBreakdown = calculateCurrencyNotes(totalPartTimeEarnings);
    doc.setFontSize(10);
    doc.text('Currency Note Breakdown:', 20, currentY);
    currentY += 10;
    
    Object.entries(noteBreakdown).forEach(([denomination, count]) => {
      if (count > 0) {
        doc.text(`${denomination}s = ${count}`, 30, currentY);
        currentY += 8;
      }
    });
  }

  const fileName = reportType === 'weekly' && weekData 
    ? `part-time-salary-${weekData.start}-to-${weekData.end}.pdf`
    : reportType === 'dateRange' && dateRange
    ? `part-time-salary-${dateRange.start}-to-${dateRange.end}.pdf`
    : `part-time-salary-${new Date(0, month).toLocaleString('default', { month: 'long' })}-${year}.pdf`;
    
  doc.save(fileName);
};

export const exportOldStaffPDF = (oldStaffRecords: OldStaffRecord[]) => {
  const doc = new jsPDF('landscape');
  
  // Header
  doc.setFontSize(20);
  doc.text('Old Staff Records', 20, 20);
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);

  const tableData = oldStaffRecords.map((record, index) => {
    const joinedDate = new Date(record.joinedDate);
    const leftDate = new Date(record.leftDate);
    const tenureMonths = Math.round((leftDate.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const tenureYears = Math.floor(tenureMonths / 12);
    const remainingMonths = tenureMonths % 12;
    const tenure = `${tenureYears > 0 ? `${tenureYears}y ` : ''}${remainingMonths}m`;

    return [
      index + 1,
      record.name,
      record.location,
      record.type,
      record.experience,
      tenure,
      record.totalSalary.toLocaleString(),
      record.totalAdvanceOutstanding.toLocaleString(),
      record.reason
    ];
  });

  autoTable(doc, {
    head: [['S.No', 'Name', 'Location', 'Type', 'Experience', 'Tenure', 'Last Salary', 'Outstanding Advance', 'Reason']],
    body: tableData,
    startY: 45,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [107, 114, 128] }
  });

  doc.save(`old-staff-records-${new Date().toISOString().split('T')[0]}.pdf`);
};