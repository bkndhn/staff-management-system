import React, { useState, useEffect } from 'react';
import { Staff, Attendance } from '../types';
import { Users, Clock, Calendar, MapPin, TrendingUp, Sun, Moon } from 'lucide-react';
import { calculateLocationAttendance } from '../utils/salaryCalculations';

interface DashboardProps {
  staff: Staff[];
  attendance: Attendance[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  userRole?: 'admin' | 'manager';
  userLocation?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  staff,
  attendance,
  selectedDate,
  onDateChange,
  userRole = 'manager',
  userLocation = ''
}) => {
  // Theme state
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme !== 'light'; // Default to dark theme
  });

  // Apply theme on change
  useEffect(() => {
    if (isDarkTheme) {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkTheme]);

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      setIsDarkTheme(false);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };
  const todayAttendance = attendance.filter(record => record.date === selectedDate);

  // For managers, filter staff and attendance to their location only
  const filteredStaff = userRole === 'admin'
    ? staff
    : staff.filter(member => member.location === userLocation);

  const activeStaff = filteredStaff.filter(member => member.isActive);
  const fullTimeStaff = activeStaff.filter(member => member.type === 'full-time');
  const partTimeStaff = activeStaff.filter(member => member.type === 'part-time');

  // Filter attendance for manager's location
  const filteredTodayAttendance = userRole === 'admin'
    ? todayAttendance
    : todayAttendance.filter(record => {
      // For full-time staff, check if the staffId belongs to their location
      if (!record.isPartTime) {
        const staffMember = staff.find(s => s.id === record.staffId);
        return staffMember?.location === userLocation;
      }
      // For part-time staff, check the location field
      return record.location === userLocation;
    });

  // Full-time attendance
  const fullTimeAttendance = filteredTodayAttendance.filter(record => !record.isPartTime);
  const presentToday = fullTimeAttendance.filter(record => record.status === 'Present').length;
  const halfDayToday = fullTimeAttendance.filter(record => record.status === 'Half Day').length;
  const absentToday = fullTimeAttendance.filter(record => record.status === 'Absent').length;

  // Part-time attendance
  const partTimeAttendance = filteredTodayAttendance.filter(record => record.isPartTime && record.status === 'Present');

  // Calculate part-time breakdown for top summary card
  const partTimeBoth = partTimeAttendance.filter(record => record.shift === 'Both').length;
  const partTimeMorning = partTimeAttendance.filter(record => record.shift === 'Morning').length;
  const partTimeEvening = partTimeAttendance.filter(record => record.shift === 'Evening').length;
  const partTimeTotal = partTimeBoth + partTimeMorning + partTimeEvening;

  // Calculate total present value including half days (corrected logic)
  const totalPresentValue = presentToday + halfDayToday;

  const [locations, setLocations] = React.useState<{ name: string; color: string; stats: any }[]>([]);

  React.useEffect(() => {
    const loadLocations = async () => {
      // Import locally to avoid circle dependency issues if any, or just standard import
      const { locationService } = await import('../services/locationService');
      const fetchedLocations = await locationService.getLocations();

      const colors = [
        'bg-blue-100 text-blue-800',
        'bg-green-100 text-green-800',
        'bg-purple-100 text-purple-800',
        'bg-orange-100 text-orange-800',
        'bg-teal-100 text-teal-800',
        'bg-indigo-100 text-indigo-800'
      ];

      // For managers, only show their location
      const locationsToShow = userRole === 'admin'
        ? fetchedLocations
        : fetchedLocations.filter(loc => loc.name === userLocation);

      const formattedLocations = locationsToShow.map((loc, index) => ({
        name: loc.name,
        color: colors[index % colors.length],
        stats: calculateLocationAttendance(activeStaff, todayAttendance, selectedDate, loc.name)
      }));

      setLocations(formattedLocations);
    };

    loadLocations();
  }, [activeStaff, todayAttendance, selectedDate, userRole, userLocation]);

  // Helper function to format staff names with shift info
  const formatStaffName = (staffId: string, isPartTime: boolean = false, staffName?: string, shift?: string) => {
    if (isPartTime) {
      return shift ? `${staffName} (${shift})` : staffName;
    }

    const staffMember = activeStaff.find(s => s.id === staffId);
    const attendanceRecord = filteredTodayAttendance.find(a => a.staffId === staffId && !a.isPartTime);

    if (attendanceRecord?.status === 'Half Day' && attendanceRecord?.shift) {
      return `${staffMember?.name} (${attendanceRecord.shift})`;
    }

    return staffMember?.name;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="stat-icon stat-icon-primary">
            <Calendar size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Dashboard
            </h1>
            <p className="text-white/50 text-sm">Overview & attendance tracking</p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
            title={isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDarkTheme ? <Sun size={18} /> : <Moon size={18} />}
            <span className="text-sm">{isDarkTheme ? 'Light' : 'Dark'}</span>
          </button>
          <div>
            <label className="block text-sm text-white/50 mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="input-premium"
            />
          </div>
          <div className="text-left md:text-right px-3 py-2">
            <span className="text-sm font-medium text-white/70">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards - Admin Only */}
      {userRole === 'admin' && (
        <div className="space-y-4">
          {/* Main Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Staff */}
            <div className="stat-card card-animate">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60 mb-1">Active Staff</p>
                  <p className="text-3xl font-bold text-white">{activeStaff.length}</p>
                </div>
                <div className="stat-icon stat-icon-primary">
                  <Users size={22} />
                </div>
              </div>
            </div>

            {/* Present Today */}
            <div className="stat-card stat-card-success card-animate">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60 mb-1">Present Today</p>
                  <p className="text-3xl font-bold text-emerald-400">{presentToday + halfDayToday}</p>
                </div>
                <div className="stat-icon stat-icon-success">
                  <Clock size={22} />
                </div>
              </div>
            </div>

            {/* Half Day */}
            <div className="stat-card stat-card-warning card-animate">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60 mb-1">Half Day Today</p>
                  <p className="text-3xl font-bold text-amber-400">{halfDayToday}</p>
                  <p className="text-xs text-white/40">Partial attendance</p>
                </div>
                <div className="stat-icon stat-icon-warning">
                  <TrendingUp size={22} />
                </div>
              </div>
            </div>

            {/* Absent */}
            <div className="stat-card stat-card-danger card-animate">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60 mb-1">Absent Today</p>
                  <p className="text-3xl font-bold text-red-400">{absentToday}</p>
                  <p className="text-xs text-white/40">Not present</p>
                </div>
                <div className="stat-icon stat-icon-danger">
                  <Calendar size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* Part-Time Row */}
          <div className="grid grid-cols-1">
            <div className="stat-card stat-card-purple card-animate">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60 mb-1">Part-Time Today</p>
                  <div className="flex items-end gap-3">
                    <p className="text-3xl font-bold text-purple-400">{partTimeTotal}</p>
                    <p className="text-sm text-white/50 mb-1">
                      (Both: {partTimeBoth}, Morning: {partTimeMorning}, Evening: {partTimeEvening})
                    </p>
                  </div>
                </div>
                <div className="stat-icon stat-icon-purple">
                  <Clock size={22} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location-based Attendance */}
      <div className="section-card">
        <div className="section-header">
          <MapPin size={20} />
          <h2 className="text-lg font-semibold">
            {userRole === 'admin'
              ? "Today's Attendance by Location"
              : `${userLocation} - Today's Attendance`
            }
          </h2>
        </div>
        <div className="section-body space-y-6">
          {locations.map((location) => {
            // Calculate location-wise part-time breakdown
            const locationPartTimeData = partTimeAttendance.filter(record =>
              record.location === location.name
            );

            const locationBoth = locationPartTimeData.filter(record => record.shift === 'Both');
            const locationMorning = locationPartTimeData.filter(record => record.shift === 'Morning');
            const locationEvening = locationPartTimeData.filter(record => record.shift === 'Evening');

            // Create names list in order: Both → Morning → Evening
            const partTimeNames = [
              ...locationBoth.map(record => `${record.staffName} (Both)`),
              ...locationMorning.map(record => `${record.staffName} (Morning)`),
              ...locationEvening.map(record => `${record.staffName} (Evening)`)
            ];

            // Get total full-time staff count at this location
            const locationTotalFullTimeStaff = fullTimeStaff.filter(s => s.location === location.name).length;

            // Get full-time staff with detailed names (including shift info for half-day)
            const locationFullTimePresent = fullTimeAttendance.filter(record => {
              const staffMember = activeStaff.find(s => s.id === record.staffId);
              const attendanceLocation = record.location || staffMember?.location;
              return record.status === 'Present' && attendanceLocation === location.name;
            }).map(record => formatStaffName(record.staffId, false));

            const locationFullTimeHalfDay = fullTimeAttendance.filter(record => {
              const staffMember = activeStaff.find(s => s.id === record.staffId);
              const attendanceLocation = record.location || staffMember?.location;
              return record.status === 'Half Day' && attendanceLocation === location.name;
            }).map(record => formatStaffName(record.staffId, false));

            const locationFullTimeAbsent = fullTimeAttendance.filter(record => {
              const staffMember = activeStaff.find(s => s.id === record.staffId);
              const attendanceLocation = record.location || staffMember?.location;
              return record.status === 'Absent' && attendanceLocation === location.name;
            }).map(record => formatStaffName(record.staffId, false));

            // Calculate total present value for this location
            const locationTotalPresent = locationFullTimePresent.length + (locationFullTimeHalfDay.length * 0.5);

            return (
              <div key={location.name} className="border-b border-white/10 pb-6 last:border-b-0 last:pb-0">
                <h3 className="text-base md:text-lg font-semibold text-gradient mb-4 text-center">
                  {location.name} - Total Present: {locationFullTimePresent.length + locationFullTimeHalfDay.length}
                  {locationPartTimeData.length > 0 && (
                    <span className="text-sm text-white/60">
                      {' + Part-Time: '}{locationPartTimeData.length}
                      {' ('}
                      Both: {locationBoth.length}, Morning: {locationMorning.length}, Evening: {locationEvening.length}
                      {')'}
                    </span>
                  )}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="glass-card-static p-4 border-l-4 border-emerald-500">
                    <p className="text-base font-bold text-emerald-400 mb-2">Present: {locationFullTimePresent.length}/{locationTotalFullTimeStaff}</p>
                    <p className="text-sm text-white/60">
                      {locationFullTimePresent.length > 0 ? locationFullTimePresent.join(', ') : 'None'}
                    </p>
                  </div>

                  <div className="glass-card-static p-4 border-l-4 border-amber-500">
                    <p className="text-base font-bold text-amber-400 mb-2">Half-day: {locationFullTimeHalfDay.length}</p>
                    <p className="text-sm text-white/60">
                      {locationFullTimeHalfDay.length > 0 ? locationFullTimeHalfDay.join(', ') : 'None'}
                    </p>
                  </div>

                  <div className="glass-card-static p-4 border-l-4 border-red-500">
                    <p className="text-base font-bold text-red-400 mb-2">Absent: {locationFullTimeAbsent.length}</p>
                    <p className="text-sm text-white/60">
                      {locationFullTimeAbsent.length > 0 ? locationFullTimeAbsent.join(', ') : 'None'}
                    </p>
                  </div>

                  <div className="glass-card-static p-4 border-l-4 border-purple-500">
                    <p className="text-base font-bold text-purple-400 mb-2">
                      Part-Time: {locationPartTimeData.length} (B: {locationBoth.length}, M: {locationMorning.length}, E: {locationEvening.length})
                    </p>
                    <p className="text-sm text-white/60">
                      {partTimeNames.length > 0
                        ? partTimeNames.join(', ')
                        : 'None'
                      }
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall Organization Attendance - Admin Only */}
      {userRole === 'admin' && (
        <div className="section-card">
          <div className="section-header" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' }}>
            <TrendingUp size={20} />
            <h2 className="text-lg font-semibold">Overall Organization Attendance</h2>
          </div>
          <div className="section-body">
            {(() => {
              // Calculate overall stats
              const overallPartTimeBoth = partTimeAttendance.filter(record => record.shift === 'Both');
              const overallPartTimeMorning = partTimeAttendance.filter(record => record.shift === 'Morning');
              const overallPartTimeEvening = partTimeAttendance.filter(record => record.shift === 'Evening');

              const overallPartTimeNames = [
                ...overallPartTimeBoth.map(record => `${record.staffName} (Both)`),
                ...overallPartTimeMorning.map(record => `${record.staffName} (Morning)`),
                ...overallPartTimeEvening.map(record => `${record.staffName} (Evening)`)
              ];

              const overallFullTimePresent = fullTimeAttendance.filter(record => record.status === 'Present')
                .map(record => formatStaffName(record.staffId, false));

              const overallFullTimeHalfDay = fullTimeAttendance.filter(record => record.status === 'Half Day')
                .map(record => formatStaffName(record.staffId, false));

              const overallFullTimeAbsent = fullTimeAttendance.filter(record => record.status === 'Absent')
                .map(record => formatStaffName(record.staffId, false));

              return (
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-gradient mb-4 text-center">
                    All Locations - Total Present: {overallFullTimePresent.length + overallFullTimeHalfDay.length}
                    {partTimeAttendance.length > 0 && (
                      <span className="text-sm text-white/60">
                        {' + Part-Time: '}{partTimeAttendance.length}
                        {' ('}
                        Both: {overallPartTimeBoth.length}, Morning: {overallPartTimeMorning.length}, Evening: {overallPartTimeEvening.length}
                        {')'}
                      </span>
                    )}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="glass-card-static p-4 border-l-4 border-emerald-500">
                      <p className="text-base font-bold text-emerald-400 mb-2">Present: {overallFullTimePresent.length}/{fullTimeStaff.length}</p>
                      <p className="text-sm text-white/60">
                        {overallFullTimePresent.length > 0 ? overallFullTimePresent.join(', ') : 'None'}
                      </p>
                    </div>

                    <div className="glass-card-static p-4 border-l-4 border-amber-500">
                      <p className="text-base font-bold text-amber-400 mb-2">Half-day: {overallFullTimeHalfDay.length}</p>
                      <p className="text-sm text-white/60">
                        {overallFullTimeHalfDay.length > 0 ? overallFullTimeHalfDay.join(', ') : 'None'}
                      </p>
                    </div>

                    <div className="glass-card-static p-4 border-l-4 border-red-500">
                      <p className="text-base font-bold text-red-400 mb-2">Absent: {overallFullTimeAbsent.length}</p>
                      <p className="text-sm text-white/60">
                        {overallFullTimeAbsent.length > 0 ? overallFullTimeAbsent.join(', ') : 'None'}
                      </p>
                    </div>

                    <div className="glass-card-static p-4 border-l-4 border-purple-500">
                      <p className="text-base font-bold text-purple-400 mb-2">
                        Part-Time: {partTimeAttendance.length} (B: {overallPartTimeBoth.length}, M: {overallPartTimeMorning.length}, E: {overallPartTimeEvening.length})
                      </p>
                      <p className="text-sm text-white/60">
                        {overallPartTimeNames.length > 0
                          ? overallPartTimeNames.join(', ')
                          : 'None'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
