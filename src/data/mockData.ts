import { Staff, Attendance, AdvanceDeduction, OldStaffRecord } from '../types';

export const mockStaff: Staff[] = [
  {
    id: '1',
    name: 'SULTAN',
    location: 'Big Shop',
    type: 'full-time',
    experience: '0y 0m',
    basicSalary: 15000,
    incentive: 10000,
    hra: 0,
    totalSalary: 25000,
    joinedDate: '7/2/2025',
    isActive: true
  },
  {
    id: '2',
    name: 'IRFAN',
    location: 'Godown',
    type: 'full-time',
    experience: '12y 3m',
    basicSalary: 15000,
    incentive: 10000,
    hra: 5000,
    totalSalary: 30000,
    joinedDate: '4/1/2013',
    isActive: true
  },
  {
    id: '3',
    name: 'SHAHUL PPT',
    location: 'Godown',
    type: 'full-time',
    experience: '8y 2m',
    basicSalary: 15000,
    incentive: 9000,
    hra: 5000,
    totalSalary: 29000,
    joinedDate: '5/18/2017',
    isActive: true
  },
  {
    id: '4',
    name: 'IMRAN',
    location: 'Small Shop',
    type: 'full-time',
    experience: '12y 3m',
    basicSalary: 15000,
    incentive: 10000,
    hra: 5000,
    totalSalary: 30000,
    joinedDate: '4/1/2013',
    isActive: true
  },
  {
    id: '5',
    name: 'BAKRUDHEEN',
    location: 'Godown',
    type: 'full-time',
    experience: '7y 9m',
    basicSalary: 15000,
    incentive: 10000,
    hra: 5000,
    totalSalary: 30000,
    joinedDate: '10/30/2017',
    isActive: true
  }
];

export const mockAttendance: Attendance[] = [
  { id: '1', staffId: '1', date: '2025-01-03', status: 'Absent', attendanceValue: 0 },
  { id: '2', staffId: '2', date: '2025-01-03', status: 'Present', attendanceValue: 1 },
  { id: '3', staffId: '3', date: '2025-01-03', status: 'Absent', attendanceValue: 0 },
  { id: '4', staffId: '4', date: '2025-01-03', status: 'Present', attendanceValue: 1 },
  { id: '5', staffId: '5', date: '2025-01-03', status: 'Present', attendanceValue: 1 },
  { id: '6', staffId: '1', date: '2025-01-01', status: 'Absent', attendanceValue: 0 },
  { id: '7', staffId: '2', date: '2025-01-01', status: 'Present', attendanceValue: 1 },
  { id: '8', staffId: '3', date: '2025-01-01', status: 'Half Day', attendanceValue: 0.5 },
  { id: '9', staffId: '4', date: '2025-01-01', status: 'Absent', attendanceValue: 0 },
  { id: '10', staffId: '5', date: '2025-01-01', status: 'Present', attendanceValue: 1 },
  { id: '11', staffId: '1', date: '2025-01-02', status: 'Absent', attendanceValue: 0 },
  { id: '12', staffId: '2', date: '2025-01-02', status: 'Present', attendanceValue: 1 },
  { id: '13', staffId: '3', date: '2025-01-02', status: 'Half Day', attendanceValue: 0.5 },
  { id: '14', staffId: '4', date: '2025-01-02', status: 'Present', attendanceValue: 1 },
  { id: '15', staffId: '5', date: '2025-01-02', status: 'Present', attendanceValue: 1 },
  // Add some Sunday absents for testing
  { id: '16', staffId: '1', date: '2025-01-05', status: 'Absent', attendanceValue: 0, isSunday: true },
  { id: '17', staffId: '3', date: '2025-01-12', status: 'Absent', attendanceValue: 0, isSunday: true },
  // Part-time staff attendance examples
  { 
    id: '18', 
    staffId: 'pt1', 
    staffName: 'RAVI PT',
    date: '2025-01-03', 
    status: 'Present', 
    attendanceValue: 1, 
    isPartTime: true, 
    shift: 'Morning',
    location: 'Big Shop'
  },
  { 
    id: '19', 
    staffId: 'pt2', 
    staffName: 'KUMAR PT',
    date: '2025-01-03', 
    status: 'Present', 
    attendanceValue: 1, 
    isPartTime: true, 
    shift: 'Both',
    location: 'Small Shop'
  },
];

export const mockAdvanceDeductions: AdvanceDeduction[] = [
  {
    id: '1',
    staffId: '2',
    month: 0, // January
    year: 2025,
    oldAdvance: 25166,
    currentAdvance: 0,
    deduction: 0,
    newAdvance: 25166,
    notes: 'Carried forward from previous month',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: '2',
    staffId: '4',
    month: 0,
    year: 2025,
    oldAdvance: 5000,
    currentAdvance: 2000,
    deduction: 1000,
    newAdvance: 6000,
    notes: 'Monthly advance adjustment',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
];

export const mockOldStaffRecords: OldStaffRecord[] = [];