$path = "e:\Setup\D-Link driver\staffmngt bolt app\project\src\components\PartTimeStaff.tsx"
$content = Get-Content $path -Raw

# 1. Add salary to newStaffData state
$content = $content -replace "        shift: \(new Date\(\)\.getDay\(\) === 0 \? 'Both' : 'Morning'\) as 'Morning' \| 'Evening' \| 'Both',", "        shift: (new Date().getDay() === 0 ? 'Both' : 'Morning') as 'Morning' | 'Evening' | 'Both',`n        salary: 0,"

# 2. Add selectedStaff state and helper functions
$selectionLogic = @"
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
"@
$content = $content -replace "const \[newStaffData, setNewStaffData\] = useState\(\{", "$selectionLogic`n    const [newStaffData, setNewStaffData] = useState({"

# 3. Update handleAddPartTimeAttendance to handle salary
$handleAddLogic = @"
        // Calculate salary based on shift and day
        let defaultSalary = getPartTimeDailySalary(selectedDate);
        if (newStaffData.shift === 'Morning' || newStaffData.shift === 'Evening') {
            defaultSalary = Math.round(defaultSalary / 2); // Half day rate
        }
        
        // Use manual salary if provided, otherwise use calculated default
        const finalSalary = newStaffData.salary > 0 ? newStaffData.salary : defaultSalary;
        const isSalaryEdited = newStaffData.salary > 0 && newStaffData.salary !== defaultSalary;

        // Set default arrival time to current time if not provided
"@
$content = $content -replace "// Calculate salary based on shift and day[\s\S]*?// Set default arrival time", $handleAddLogic

$updateCall = @"
            newStaffData.location,
            finalSalary,
            isSalaryEdited,
            defaultArrivalTime,
"@
$content = $content -replace "            newStaffData.location,`n            defaultSalary,`n            false,`n            defaultArrivalTime,", $updateCall

$resetState = @"
            shift: (new Date().getDay() === 0 ? 'Both' : 'Morning') as 'Morning' | 'Evening' | 'Both',
            salary: 0,
            arrivalTime: '',
"@
$content = $content -replace "            shift: \(new Date\(\)\.getDay\(\) === 0 \? 'Both' : 'Morning'\) as 'Morning' \| 'Evening' \| 'Both',`n            arrivalTime: '',", $resetState

# 4. Update handleSave for smart edited label
$handleSaveLogic = @"
        // Smart edited label logic
        const defaultSalary = getPartTimeDailySalary(attendanceRecord.date);
        const calculatedSalary = (editData.shift === 'Morning' || editData.shift === 'Evening') 
            ? Math.round(defaultSalary / 2) 
            : defaultSalary;
            
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
"@
$content = $content -replace "        onUpdateAttendance\(`n            attendanceRecord.staffId,[\s\S]*?editData.leavingTime`n        \);", $handleSaveLogic

# 5. Update totals to respect selection
$totalsLogic = @"
    // Filter salaries based on selection if any are selected
    const selectedSalaries = selectedStaff.size > 0 
        ? partTimeSalaries.filter(s => selectedStaff.has(`${s.name}-${s.location}`))
        : partTimeSalaries;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const totalPartTimeEarnings = selectedSalaries.reduce((sum, salary) => sum + salary.totalEarnings, 0);

    // Calculate currency breakdown
    const currencyBreakdown = selectedSalaries.reduce((acc, salary) => {
"@
$content = $content -replace "    // eslint-disable-next-line @typescript-eslint/no-unused-vars`n    const totalPartTimeEarnings = partTimeSalaries.reduce\(\(sum, salary\) => sum \+ salary.totalEarnings, 0\);`n`n    // Calculate currency breakdown`n    const currencyBreakdown = partTimeSalaries.reduce\(\(acc, salary\) => \{", $totalsLogic

# 6. Update Export PDF to respect selection
$exportLogic = @"
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

        // Filter for export
        const dataToExport = selectedStaff.size > 0
            ? partTimeSalaries.filter(s => selectedStaff.has(`${s.name}-${s.location}`))
            : partTimeSalaries;

        exportPartTimeSalaryPDF(
            dataToExport,
            selectedMonth,
            selectedYear,
            reportType,
            weekData,
            dateRangeData
        );
    };
"@
$content = $content -replace "    const handleExportPDF = \(\) => \{[\s\S]*?        \);`n    \};", $exportLogic

# 7. Add Salary Input to Add Form
$salaryInput = @"
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
                                    placeholder="Auto-calculated"
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Time</label>
"@
$content = $content -replace "                        <div>`n                            <label className=.block text-sm font-medium text-gray-700 mb-1.>Arrival Time</label>", $salaryInput

# 8. Add Checkboxes to Table
# This is tricky because it involves finding the table structure.
# I'll look for the table header "S.No" and add a checkbox column header.
# Then look for the row rendering and add the checkbox.

# Header
$content = $content -replace '<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>', '<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><div className="flex items-center gap-2">Select</div></th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>'

# Group Header (Select All buttons)
$groupHeader = @"
                            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-lg font-medium text-gray-900">{location}</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSelectAllInGroup(staffList, true)}
                                            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => handleSelectAllInGroup(staffList, false)}
                                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                        >
                                            Deselect All
                                        </button>
                                    </div>
                                </div>
                                <span className="text-sm text-gray-500">{staffList.length} Staff Members</span>
                            </div>
"@
$content = $content -replace '<div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">[\s\S]*?<h3 className="text-lg font-medium text-gray-900">\{location\}</h3>[\s\S]*?<span className="text-sm text-gray-500">\{staffList.length\} Staff Members</span>[\s\S]*?</div>', $groupHeader

# Row Checkbox
$rowCheckbox = @"
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStaff.has(`${staff.name}-${staff.location}`)}
                                                    onChange={() => handleToggleStaffSelection(staff.name, staff.location)}
                                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
"@
$content = $content -replace '<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">', $rowCheckbox

Set-Content $path $content
