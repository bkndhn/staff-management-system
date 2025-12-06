import React, { useState, useRef } from 'react';
import { Staff, SalaryHike, SalaryCategory } from '../types';
import { Users, Plus, Edit2, Trash2, Archive, Calendar, TrendingUp, MapPin, DollarSign, Check, X, Search, GripVertical, Filter } from 'lucide-react';
import { calculateExperience } from '../utils/salaryCalculations';
import SalaryHikeHistory from './SalaryHikeHistory';
import SalaryHikeDueModal from './SalaryHikeDueModal';
import { settingsService } from '../services/settingsService';

interface StaffManagementProps {
  staff: Staff[];
  salaryHikes: SalaryHike[];
  onAddStaff: (staff: Omit<Staff, 'id'>) => void;
  onUpdateStaff: (id: string, staff: Partial<Staff>) => void;
  onDeleteStaff: (id: string, reason: string) => void;
  onUpdateStaffOrder?: (newOrder: Staff[]) => void;
}

const StaffManagement: React.FC<StaffManagementProps> = ({
  staff,
  salaryHikes,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onUpdateStaffOrder
}) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<Staff | null>(null);
  const [showSalaryHistory, setShowSalaryHistory] = useState<Staff | null>(null);
  const [showHikeDueModal, setShowHikeDueModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('All');

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<Staff | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Settings State
  const [showLocationManager, setShowLocationManager] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [locations, setLocations] = useState<string[]>(settingsService.getLocations());
  const [salaryCategories, setSalaryCategories] = useState<SalaryCategory[]>(settingsService.getSalaryCategories());
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editLocationValue, setEditLocationValue] = useState('');
  const [editCategoryValue, setEditCategoryValue] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    location: locations[0] || 'Big Shop',
    basicSalary: 15000,
    incentive: 10000,
    hra: 0,
    mealAllowance: 0,
    joinedDate: new Date().toISOString().split('T')[0],
    salarySupplements: {} as Record<string, number>,
    sundayPenalty: true,
    salaryCalculationDays: 30
  });

  const activeStaff = staff.filter(member => {
    if (!member.isActive) return false;
    // Apply location filter
    if (locationFilter !== 'All' && member.location !== locationFilter) return false;
    // Apply search query
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.location.toLowerCase().includes(query)
    );
  });

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, member: Staff) => {
    setDraggedItem(member);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', member.id);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null);
    setDragOverIndex(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (!draggedItem || !onUpdateStaffOrder) return;

    const dragIndex = activeStaff.findIndex(s => s.id === draggedItem.id);
    if (dragIndex === -1 || dragIndex === dropIndex) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...activeStaff];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, removed);

    const inactiveStaff = staff.filter(s => !s.isActive);
    const fullNewOrder = [...newOrder, ...inactiveStaff];

    onUpdateStaffOrder(fullNewOrder);

    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: locations[0] || 'Big Shop',
      basicSalary: 15000,
      incentive: 10000,
      hra: 0,
      mealAllowance: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      salarySupplements: {},
      sundayPenalty: true,
      salaryCalculationDays: 30
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const supplementsTotal = Object.values(formData.salarySupplements).reduce((a, b) => a + b, 0);
    const totalSalary = formData.basicSalary + formData.incentive + formData.hra + formData.mealAllowance + supplementsTotal;
    const experience = calculateExperience(formData.joinedDate);

    if (editingStaff) {
      settingsService.updateStaffSupplement(editingStaff.id, formData.salarySupplements);

      onUpdateStaff(editingStaff.id, {
        ...formData,
        totalSalary,
        experience,
        type: 'full-time',
        sundayPenalty: formData.sundayPenalty
      });
      setEditingStaff(null);
    } else {
      onAddStaff({
        ...formData,
        totalSalary,
        type: 'full-time',
        isActive: true,
        experience
      });
    }

    resetForm();
    setShowAddForm(false);
  };

  const handleEdit = (member: Staff) => {
    const supplements = member.salarySupplements || {};
    setFormData({
      name: member.name,
      location: member.location,
      basicSalary: member.basicSalary,
      incentive: member.incentive,
      hra: member.hra,
      mealAllowance: member.mealAllowance || 0,
      joinedDate: member.joinedDate,
      salarySupplements: supplements,
      sundayPenalty: member.sundayPenalty ?? true,
      salaryCalculationDays: member.salaryCalculationDays || 30
    });
    setEditingStaff(member);
    setShowAddForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = (member: Staff) => {
    setShowDeleteModal(member);
    setDeleteReason('');
  };

  const confirmDelete = () => {
    if (showDeleteModal && deleteReason.trim()) {
      onDeleteStaff(showDeleteModal.id, deleteReason.trim());
      setShowDeleteModal(null);
      setDeleteReason('');
    }
  };

  const getLocationColor = (location: string): string => {
    const colors: Record<string, string> = {
      'Big Shop': 'bg-blue-100 text-blue-800',
      'Small Shop': 'bg-green-100 text-green-800',
      'Godown': 'bg-purple-100 text-purple-800'
    };
    return colors[location] || 'bg-gray-100 text-gray-800';
  };

  const getStaffSalaryHikes = (staffId: string) => {
    return salaryHikes
      .filter(hike => hike.staffId === staffId)
      .sort((a, b) => new Date(b.hikeDate).getTime() - new Date(a.hikeDate).getTime());
  };

  return (
    <div className="p-4 md:p-6 space-y-6" >
      {/* Header */}
      < div className="flex flex-col md:flex-row md:items-center justify-between gap-4" >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="text-blue-600" size={32} />
          Staff Management
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:min-w-[200px] md:min-w-[300px]">
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
              onClick={() => setShowLocationManager(true)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              title="Manage Locations"
            >
              <MapPin size={16} />
              <span className="hidden sm:inline">Locations</span>
            </button>
            <button
              onClick={() => setShowCategoryManager(true)}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              title="Manage Salary Categories"
            >
              <DollarSign size={16} />
              <span className="hidden sm:inline">Categories</span>
            </button>
            <button
              onClick={() => {
                resetForm();
                setEditingStaff(null);
                setShowAddForm(!showAddForm);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add Staff</span>
            </button>
          </div>
        </div>
      </div >

      {/* Salary Hike Due Banner */}
      {
        (() => {
          const staffDueForHike = activeStaff.filter(member => {
            const joinedDate = new Date(member.joinedDate);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            // Check if joined more than 1 year ago
            if (joinedDate > oneYearAgo) return false;

            // Check last hike date
            const memberHikes = getStaffSalaryHikes(member.id);
            if (memberHikes.length === 0) return true; // No hikes yet

            const lastHikeDate = new Date(memberHikes[0].hikeDate);
            return lastHikeDate <= oneYearAgo;
          });

          if (staffDueForHike.length === 0) return null;

          return (
            <div onClick={() => setShowHikeDueModal(true)} className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-full">
                  <TrendingUp className="text-amber-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">Salary Hike Due</h3>
                  <p className="text-sm text-amber-700">
                    {staffDueForHike.length} staff member{staffDueForHike.length !== 1 ? 's are' : ' is'} eligible for a salary hike
                  </p>
                </div>
              </div>
              <span className="text-amber-600 text-sm font-medium">Click to view ?</span>
            </div>
          );
        })()
      }

      {
        showHikeDueModal && (
          <SalaryHikeDueModal
            staff={staff}
            salaryHikes={salaryHikes}
            onClose={() => setShowHikeDueModal(false)}
          />
        )
      }

      {/* Location Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-gray-600">
            <Filter size={18} />
            <span className="font-medium">Filter by Location:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setLocationFilter('All')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${locationFilter === 'All'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              All ({staff.filter(s => s.isActive).length})
            </button>
            {locations.map(loc => {
              const count = staff.filter(s => s.isActive && s.location === loc).length;
              return (
                <button
                  key={loc}
                  onClick={() => setLocationFilter(loc)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${locationFilter === loc
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {loc} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add/Edit Staff Form */}
      {
        showAddForm && (
          <div ref={formRef} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joined Date</label>
                <input
                  type="date"
                  value={formData.joinedDate}
                  onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary</label>
                <input
                  type="number"
                  value={formData.basicSalary}
                  onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incentive</label>
                <input
                  type="number"
                  value={formData.incentive}
                  onChange={(e) => setFormData({ ...formData, incentive: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HRA</label>
                <input
                  type="number"
                  value={formData.hra}
                  onChange={(e) => setFormData({ ...formData, hra: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meal Allowance</label>
                <input
                  type="number"
                  value={formData.mealAllowance}
                  onChange={(e) => setFormData({ ...formData, mealAllowance: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Calculation Days</label>
                <input
                  type="number"
                  value={formData.salaryCalculationDays}
                  onChange={(e) => setFormData({ ...formData, salaryCalculationDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="31"
                />
              </div>

              <div className="flex items-center h-full pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sundayPenalty}
                    onChange={(e) => setFormData({ ...formData, sundayPenalty: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Apply Sunday Penalty</span>
                </label>
              </div>

              {salaryCategories.filter(c => !['basic', 'incentive', 'hra', 'meal_allowance'].includes(c.id)).map(category => (
                <div key={category.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{category.name}</label>
                  <input
                    type="number"
                    value={formData.salarySupplements[category.id] || 0}
                    onChange={(e) => setFormData({
                      ...formData,
                      salarySupplements: {
                        ...formData.salarySupplements,
                        [category.id]: Number(e.target.value)
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
              <div className="md:col-span-2 lg:col-span-3 flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingStaff ? 'Update Staff' : 'Add Staff'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setEditingStaff(null);
                    setShowAddForm(false);
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      {
        showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Archive className="text-red-600" size={20} />
                Archive Staff Member
              </h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to archive <strong>{showDeleteModal.name}</strong>?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Enter reason for archiving..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={!deleteReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Archive
                </button>
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Salary History Modal */}
      {
        showSalaryHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="text-green-600" size={24} />
                  Salary Hike History
                </h3>
                <button onClick={() => setShowSalaryHistory(null)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
              <SalaryHikeHistory
                salaryHikes={getStaffSalaryHikes(showSalaryHistory.id)}
                staffName={showSalaryHistory.name}
                currentSalary={showSalaryHistory.totalSalary}
                staff={showSalaryHistory}
              />
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSalaryHistory(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Active Staff ({activeStaff.length})
            {locationFilter !== 'All' && <span className="text-blue-600 ml-2">- {locationFilter}</span>}
          </h2>
          {onUpdateStaffOrder && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <GripVertical size={14} />
              Drag rows to reorder
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-4 w-10"></th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">Name</th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Basic</th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Incentive</th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">HRA</th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Meal Allowance</th>
                {salaryCategories.filter(c => !['basic', 'incentive', 'hra', 'meal_allowance'].includes(c.id)).map(category => (
                  <th key={category.id} className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">{category.name}</th>
                ))}
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Salary History</th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeStaff.map((member, index) => {
                const memberHikes = getStaffSalaryHikes(member.id);
                const hasHikes = memberHikes.length > 0;
                const isDragOver = dragOverIndex === index;
                const isDragging = draggedItem?.id === member.id;

                return (
                  <tr
                    key={member.id}
                    className={`hover:bg-gray-50 ${isDragOver ? 'bg-blue-50' : ''} ${isDragging ? 'opacity-50' : ''}`}
                    draggable={!!onUpdateStaffOrder}
                    onDragStart={(e) => handleDragStart(e, member)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <td className="px-2 py-4">
                      {onUpdateStaffOrder && (
                        <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                          <GripVertical size={16} />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-3 py-4 sticky left-0 bg-white">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar size={12} />
                          Joined: {new Date(member.joinedDate).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLocationColor(member.location)}`}>
                        {member.location}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-blue-600 font-medium">
                      {calculateExperience(member.joinedDate)}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">₹{member.basicSalary.toLocaleString()}</td>
                    <td className="px-3 py-4 text-sm text-gray-900">₹{member.incentive.toLocaleString()}</td>
                    <td className="px-3 py-4 text-sm text-gray-900">₹{member.hra.toLocaleString()}</td>
                    <td className="px-3 py-4 text-sm text-gray-900">₹{(member.mealAllowance || 0).toLocaleString()}</td>
                    {salaryCategories.filter(c => !['basic', 'incentive', 'hra', 'meal_allowance'].includes(c.id)).map(category => (
                      <td key={category.id} className="px-3 py-4 text-sm text-gray-900">
                        ₹{(member.salarySupplements?.[category.id] || 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="px-3 py-4 text-sm font-semibold text-green-600">₹{member.totalSalary.toLocaleString()}</td>
                    <td className="px-3 py-4">
                      <button
                        onClick={() => setShowSalaryHistory(member)}
                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${hasHikes ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        <TrendingUp size={12} />
                        {hasHikes ? `${memberHikes.length} hikes` : 'No hikes'}
                      </button>
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(member)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(member)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          title="Archive"
                        >
                          <Archive size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location Manager Modal */}
      {
        showLocationManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="text-purple-600" size={20} />
                Manage Locations
              </h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="New Location Name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={() => {
                    if (newLocation.trim()) {
                      const updated = settingsService.addLocation(newLocation.trim());
                      setLocations(updated);
                      setNewLocation('');
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {locations.map(loc => (
                  <div key={loc} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    {editingLocation === loc ? (
                      <>
                        <input
                          type="text"
                          value={editLocationValue}
                          onChange={(e) => setEditLocationValue(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => {
                              if (editLocationValue.trim()) {
                                const updated = settingsService.updateLocation(loc, editLocationValue.trim());
                                setLocations(updated);
                                setEditingLocation(null);
                              }
                            }}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditingLocation(null)} className="text-gray-500 hover:text-gray-700">
                            <X size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span>{loc}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingLocation(loc); setEditLocationValue(loc); }}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              const updated = settingsService.deleteLocation(loc);
                              setLocations(updated);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowLocationManager(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Category Manager Modal */}
      {
        showCategoryManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="text-green-600" size={20} />
                Manage Salary Categories
              </h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New Category Name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={() => {
                    if (newCategory.trim()) {
                      const updated = settingsService.addSalaryCategory(newCategory.trim());
                      setSalaryCategories(updated);
                      setNewCategory('');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {salaryCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    {editingCategory === cat.id ? (
                      <>
                        <input
                          type="text"
                          value={editCategoryValue}
                          onChange={(e) => setEditCategoryValue(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => {
                              if (editCategoryValue.trim()) {
                                const updated = settingsService.updateSalaryCategory(cat.id, editCategoryValue.trim());
                                setSalaryCategories(updated);
                                setEditingCategory(null);
                              }
                            }}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditingCategory(null)} className="text-gray-500 hover:text-gray-700">
                            <X size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span>{cat.name}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingCategory(cat.id); setEditCategoryValue(cat.name); }}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit2 size={16} />
                          </button>
                          {!['basic', 'incentive', 'hra'].includes(cat.id) && (
                            <button
                              onClick={() => {
                                const updated = settingsService.deleteSalaryCategory(cat.id);
                                setSalaryCategories(updated);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowCategoryManager(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default StaffManagement;
