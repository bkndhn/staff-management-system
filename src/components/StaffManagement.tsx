import React, { useState, useRef } from 'react';
import { Staff, SalaryHike, SalaryCategory } from '../types';
import { Users, Plus, Edit2, Trash2, Archive, Calendar, TrendingUp, MapPin, DollarSign, Check, X, Search, GripVertical, Filter, Copy, AlertCircle } from 'lucide-react';
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
  onRefreshStaff?: () => Promise<void>;
}

const StaffManagement: React.FC<StaffManagementProps> = ({
  staff,
  salaryHikes,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onUpdateStaffOrder,
  onRefreshStaff
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
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]); // Changed to object array
  const [salaryCategories, setSalaryCategories] = useState<SalaryCategory[]>(settingsService.getSalaryCategories());
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editingLocation, setEditingLocation] = useState<{ id: string; name: string } | null>(null); // Changed to object
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editLocationValue, setEditLocationValue] = useState('');
  const [editCategoryValue, setEditCategoryValue] = useState('');

  // Modal states for viewing full address and image
  const [viewAddressModal, setViewAddressModal] = useState<{ name: string; address: string } | null>(null);
  const [viewImageModal, setViewImageModal] = useState<{ name: string; photo: string } | null>(null);
  const [credentialsModal, setCredentialsModal] = useState<{ credentials: { email: string; password: string }; locationName: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const [formData, setFormData] = useState({
    name: '',
    location: '', // default empty, set in useEffect if needed or kept empty
    basicSalary: 15000,
    incentive: 10000,
    hra: 0,
    mealAllowance: 0,
    joinedDate: new Date().toISOString().split('T')[0],
    salarySupplements: {} as Record<string, number>,
    sundayPenalty: true,
    salaryCalculationDays: 30,
    contactNumber: '',
    address: '',
    photo: ''
  });

  // Set default location when locations load
  React.useEffect(() => {
    if (locations.length > 0 && !formData.location) {
      setFormData(prev => ({ ...prev, location: locations[0]?.name }));
    }
  }, [locations]);

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

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

  // ... (drag handlers unchanged) ...

  const handleCreateLocation = async () => {
    if (newLocation.trim()) {
      const { locationService } = await import('../services/locationService');
      const result = await locationService.addLocation(newLocation.trim());
      if (result.location) {
        setLocations(prev => [...prev, result.location!]);
        setNewLocation('');

        // Show generated credentials in styled modal
        if (result.credentials) {
          setCredentialsModal({
            credentials: result.credentials,
            locationName: result.location.name
          });
        }
      }
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleUpdateLocation = async (id: string) => {
    if (editLocationValue.trim()) {
      const { locationService } = await import('../services/locationService');
      const oldLocation = locations.find(l => l.id === id)?.name;
      const updated = await locationService.updateLocation(id, editLocationValue.trim());
      if (updated) {
        setLocations(prev => prev.map(l => l.id === id ? updated : l));
        setEditingLocation(null);
        setEditLocationValue('');

        // If location name changed, refresh staff data to get updated locations
        if (oldLocation && oldLocation !== updated.name && onRefreshStaff) {
          await onRefreshStaff();
        }
      }
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      const { locationService } = await import('../services/locationService');
      const success = await locationService.deleteLocation(id);
      if (success) {
        setLocations(prev => prev.filter(l => l.id !== id));
      }
    }
  };

  // ... (rest of component)

  // Need to update the render logic for "Manage Locations" modal to use objects
  // and update dropdowns to map locations.


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

  // Calculate total salary dynamically
  const calculateMemberTotalSalary = (member: Staff) => {
    let total = member.basicSalary + member.incentive + member.hra + (member.mealAllowance || 0);
    const customCategories = salaryCategories.filter(c => !['basic', 'incentive', 'hra', 'meal_allowance'].includes(c.id));
    total += customCategories.reduce((sum, cat) => sum + (member.salarySupplements?.[cat.id] || 0), 0);
    return total;
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
      location: locations[0]?.name || 'Big Shop',
      basicSalary: 15000,
      incentive: 10000,
      hra: 0,
      mealAllowance: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      salarySupplements: {},
      sundayPenalty: true,
      salaryCalculationDays: 30,
      contactNumber: '',
      address: '',
      photo: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate contact number (must be 10 digits)
    const phoneDigits = formData.contactNumber.replace(/[^0-9]/g, '');
    if (phoneDigits.length !== 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    const salaryCategories = settingsService.getSalaryCategories();
    // Start with basic fields
    let totalSalary = (formData.basicSalary || 0) + (formData.incentive || 0) + (formData.hra || 0) + (formData.mealAllowance || 0);

    // Add custom categories (anything not basic, incentive, hra, meal_allowance)
    const customCategories = salaryCategories.filter(c => !['basic', 'incentive', 'hra', 'meal_allowance'].includes(c.id));
    totalSalary += customCategories.reduce((sum, cat) => sum + (formData.salarySupplements[cat.id] || 0), 0);


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

  const handleEdit = async (member: Staff) => {
    // Refetch locations to get any newly added ones
    const { locationService } = await import('../services/locationService');
    const freshLocations = await locationService.getLocations();
    setLocations(freshLocations);

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
      salaryCalculationDays: member.salaryCalculationDays || 30,
      contactNumber: member.contactNumber || '',
      address: member.address || '',
      photo: member.photo || ''
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
      'Big Shop': 'badge-premium badge-info',
      'Small Shop': 'badge-premium badge-success',
      'Godown': 'badge-premium badge-purple'
    };
    return colors[location] || 'badge-premium badge-neutral';
  };

  const getStaffSalaryHikes = (staffId: string) => {
    return salaryHikes
      .filter(hike => hike.staffId === staffId)
      .sort((a, b) => new Date(b.hikeDate).getTime() - new Date(a.hikeDate).getTime());
  };

  return (
    <div className="p-1 md:p-6 space-y-6" >
      {/* Header */}
      < div className="flex flex-col md:flex-row md:items-center justify-between gap-4" >
        <div className="flex items-center gap-3">
          <div className="stat-icon stat-icon-primary">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Staff Management</h1>
            <p className="text-white/50 text-sm">Manage your team members</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:min-w-[200px] md:min-w-[300px]">
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
              onClick={() => setShowLocationManager(true)}
              className="btn-premium flex items-center gap-2 px-3 py-2 text-sm"
              style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' }}
              title="Manage Locations"
            >
              <MapPin size={16} />
              <span className="hidden sm:inline">Locations</span>
            </button>
            <button
              onClick={() => setShowCategoryManager(true)}
              className="btn-premium btn-premium-success flex items-center gap-2 px-3 py-2 text-sm"
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
              className="btn-premium flex items-center gap-2 px-4 py-2"
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
            <div onClick={() => setShowHikeDueModal(true)} className="glass-card-static p-4 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors border-l-4 border-amber-500">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-full">
                  <TrendingUp className="text-amber-400" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-400">Salary Hike Due</h3>
                  <p className="text-sm text-white/60">
                    {staffDueForHike.length} staff member{staffDueForHike.length !== 1 ? 's are' : ' is'} eligible for a salary hike
                  </p>
                </div>
              </div>
              <span className="text-amber-400 text-sm font-medium">Click to view →</span>
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
      <div className="glass-card-static p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-white/60">
            <Filter size={18} />
            <span className="font-medium">Filter by Location:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setLocationFilter('All')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${locationFilter === 'All'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
            >
              All ({staff.filter(s => s.isActive).length})
            </button>
            {locations.map(loc => {
              const count = staff.filter(s => s.isActive && s.location === loc.name).length;
              return (
                <button
                  key={loc.id}
                  onClick={() => setLocationFilter(loc.name)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${locationFilter === loc.name
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                >
                  {loc.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add/Edit Staff Form */}
      {
        showAddForm && (
          <div ref={formRef} className="glass-card-static p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-premium"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Location</label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input-premium"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Joined Date</label>
                <input
                  type="date"
                  value={formData.joinedDate}
                  onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                  className="input-premium"
                  required
                />
              </div>

              {/* Contact & Personal Details */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Mobile Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => {
                    // Auto-format: keep only digits, max 10
                    const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                    setFormData({ ...formData, contactNumber: digits });
                  }}
                  className="input-premium"
                  placeholder="10-digit mobile number"
                  required
                  pattern="[0-9]{10}"
                  maxLength={10}
                  title="Enter 10-digit mobile number (required for WhatsApp)"
                />
                <p className="text-xs text-white/50 mt-1">Required for WhatsApp salary slip</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-premium"
                  placeholder="Full address"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-white/70 mb-1">Image</label>
                <div className="flex items-center gap-3">
                  {formData.photo ? (
                    <img src={formData.photo} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2 border-white/30" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40">
                      <Users size={20} />
                    </div>
                  )}
                  <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm transition-colors">
                    Upload
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                  {formData.photo && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, photo: '' }))}
                      className="text-red-400 hover:text-red-300 px-2 py-1 text-xs rounded border border-red-400/50 hover:border-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Basic Salary</label>
                <input
                  type="number"
                  value={formData.basicSalary}
                  onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                  className="input-premium"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Incentive</label>
                <input
                  type="number"
                  value={formData.incentive}
                  onChange={(e) => setFormData({ ...formData, incentive: Number(e.target.value) })}
                  className="input-premium"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">HRA</label>
                <input
                  type="number"
                  value={formData.hra}
                  onChange={(e) => setFormData({ ...formData, hra: Number(e.target.value) })}
                  className="input-premium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Meal Allowance</label>
                <input
                  type="number"
                  value={formData.mealAllowance}
                  onChange={(e) => setFormData({ ...formData, mealAllowance: Number(e.target.value) })}
                  className="input-premium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Salary Calculation Days</label>
                <input
                  type="number"
                  value={formData.salaryCalculationDays}
                  onChange={(e) => setFormData({ ...formData, salaryCalculationDays: Number(e.target.value) })}
                  className="input-premium"
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
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-white/30 bg-white/10"
                  />
                  <span className="text-sm font-medium text-white/70">Apply Sunday Penalty</span>
                </label>
              </div>

              {salaryCategories.filter(c => !['basic', 'incentive', 'hra', 'meal_allowance'].includes(c.id)).map(category => (
                <div key={category.id}>
                  <label className="block text-sm font-medium text-white/70 mb-1">{category.name}</label>
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
                    className="input-premium"
                  />
                </div>
              ))}
              <div className="md:col-span-2 lg:col-span-3 flex gap-3">
                <button
                  type="submit"
                  className="btn-premium px-6 py-2"
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
                  className="btn-ghost px-6 py-2"
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
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Archive className="text-red-400" size={20} />
                Archive Staff Member
              </h3>
              <p className="text-white/60 mb-4">
                Are you sure you want to archive <strong className="text-white">{showDeleteModal.name}</strong>?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-white/70 mb-2">Reason *</label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Enter reason for archiving..."
                  className="input-premium w-full"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={!deleteReason.trim()}
                  className="flex-1 btn-premium btn-premium-danger disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Archive
                </button>
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="flex-1 btn-ghost"
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
          <div className="modal-overlay">
            <div className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="text-emerald-400" size={24} />
                  Salary Hike History
                </h3>
                <button onClick={() => setShowSalaryHistory(null)} className="text-white/50 hover:text-white">
                  ✕
                </button>
              </div>
              <SalaryHikeHistory
                salaryHikes={getStaffSalaryHikes(showSalaryHistory.id)}
                staffName={showSalaryHistory.name}
                currentSalary={showSalaryHistory.totalSalary}
                staff={showSalaryHistory}
                onRefresh={onRefreshStaff}
              />
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSalaryHistory(null)}
                  className="btn-ghost px-4 py-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Staff Table */}
      <div className="table-container">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Active Staff ({activeStaff.length})
            {locationFilter !== 'All' && <span className="text-indigo-400 ml-2">- {locationFilter}</span>}
          </h2>
          {onUpdateStaffOrder && (
            <span className="text-xs text-white/50 flex items-center gap-1">
              <GripVertical size={14} />
              Drag rows to reorder
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="table-premium">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>S.No</th>
                <th className="sticky left-0">Name</th>
                <th>Location</th>
                <th>Experience</th>
                <th>{salaryCategories.find(c => c.id === 'basic')?.name || 'Basic'}</th>
                <th>{salaryCategories.find(c => c.id === 'incentive')?.name || 'Incentive'}</th>
                <th>{salaryCategories.find(c => c.id === 'hra')?.name || 'HRA'}</th>
                <th>{salaryCategories.find(c => c.id === 'meal_allowance')?.name || 'Meal Allowance'}</th>
                {salaryCategories.filter(c => !['basic', 'incentive', 'hra', 'meal_allowance'].includes(c.id)).map(category => (
                  <th key={category.id}>{category.name}</th>
                ))}
                <th>Total</th>
                <th>Salary History</th>
                <th>Contact</th>
                <th>Address</th>
                <th>Image</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
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
                      <span className={getLocationColor(member.location)}>
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
                    <td className="px-3 py-4 text-sm font-semibold text-green-600">₹{calculateMemberTotalSalary(member).toLocaleString()}</td>
                    <td className="px-3 py-4">
                      <button
                        onClick={() => setShowSalaryHistory(member)}
                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${hasHikes ? 'badge-premium badge-success' : 'badge-premium badge-neutral'
                          } hover:opacity-80 transition-opacity border-0`}
                      >
                        <TrendingUp size={12} />
                        {hasHikes ? `${memberHikes.length} hikes` : 'No hikes'}
                      </button>
                    </td>
                    {/* Contact Column */}
                    <td className="px-3 py-4 text-sm text-gray-700">
                      {member.contactNumber ? (
                        <span className="text-gray-900">{member.contactNumber}</span>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    {/* Address Column */}
                    <td className="px-3 py-4 text-sm text-gray-700">
                      {member.address ? (
                        <button
                          onClick={() => setViewAddressModal({ name: member.name, address: member.address || '' })}
                          className="text-indigo-600 font-medium max-w-[120px] truncate block cursor-pointer hover:text-indigo-800 text-left"
                          title="Click to view full address"
                        >
                          📍 {member.address.length > 12 ? member.address.substring(0, 12) + '...' : member.address}
                        </button>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    {/* Image Column */}
                    <td className="px-3 py-4">
                      {member.photo ? (
                        <button
                          onClick={() => setViewImageModal({ name: member.name, photo: member.photo || '' })}
                          className="cursor-pointer"
                        >
                          <img src={member.photo} alt={member.name} className="w-10 h-10 rounded-full object-cover border-2 border-indigo-200 hover:border-indigo-400 hover:scale-110 transition-all" />
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                          <Users size={16} />
                        </div>
                      )}
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
      {showLocationManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-[95vw] md:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
                <MapPin className="text-purple-600" size={18} />
                Manage Locations
              </h3>
              <button onClick={() => setShowLocationManager(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-4 md:mb-6">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="New Location Name"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={handleCreateLocation}
                disabled={!newLocation.trim()}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Add
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {locations.map(loc => (
                <div key={loc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-200">
                  {editingLocation?.id === loc.id ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input
                        type="text"
                        value={editLocationValue}
                        onChange={(e) => setEditLocationValue(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateLocation(loc.id)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Save"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditingLocation(null)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-gray-700">{loc.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingLocation(loc);
                            setEditLocationValue(loc.name);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteLocation(loc.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {locations.length === 0 && (
                <p className="text-center text-gray-500 py-4">No locations added yet</p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowLocationManager(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Category Manager Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-[95vw] md:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign className="text-green-600" size={18} />
              Manage Salary Categories
            </h3>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New Category Name"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
              <button
                onClick={() => {
                  if (newCategory.trim()) {
                    const updated = settingsService.addSalaryCategory(newCategory.trim());
                    setSalaryCategories(updated);
                    setNewCategory('');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 whitespace-nowrap"
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
      )}

      {/* Full Address View Modal */}
      {viewAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setViewAddressModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <MapPin className="text-indigo-600" size={20} />
                Address - {viewAddressModal.name}
              </h3>
              <button onClick={() => setViewAddressModal(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-800 text-base leading-relaxed">{viewAddressModal.address}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setViewAddressModal(null)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image View Modal */}
      {viewImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setViewImageModal(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewImageModal(null)}
              className="absolute -top-3 -right-3 bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-lg z-10"
            >
              <X size={20} />
            </button>
            <div className="bg-white p-2 rounded-xl shadow-2xl">
              <img
                src={viewImageModal.photo}
                alt={viewImageModal.name}
                className="max-w-[85vw] max-h-[80vh] rounded-lg object-contain"
              />
              <p className="text-center text-gray-700 font-medium mt-2 pb-1">{viewImageModal.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {credentialsModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center">
                <Check className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">Manager Account Created</h3>
              <p className="text-white/60 text-sm mt-1">for {credentialsModal.locationName}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="glass-card-static p-4 rounded-xl">
                <label className="block text-xs font-medium text-white/50 mb-1">Email</label>
                <div className="flex items-center justify-between">
                  <span className="text-white font-mono">{credentialsModal.credentials.email}</span>
                  <button
                    onClick={() => copyToClipboard(credentialsModal.credentials.email, 'email')}
                    className={`p-2 rounded-lg transition-colors ${copiedField === 'email' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                  >
                    {copiedField === 'email' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="glass-card-static p-4 rounded-xl">
                <label className="block text-xs font-medium text-white/50 mb-1">Password</label>
                <div className="flex items-center justify-between">
                  <span className="text-white font-mono">{credentialsModal.credentials.password}</span>
                  <button
                    onClick={() => copyToClipboard(credentialsModal.credentials.password, 'password')}
                    className={`p-2 rounded-lg transition-colors ${copiedField === 'password' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                  >
                    {copiedField === 'password' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-6">
              <AlertCircle className="text-amber-400 flex-shrink-0" size={18} />
              <p className="text-amber-400 text-sm">Save these credentials securely. You can change them in Settings.</p>
            </div>

            <button onClick={() => setCredentialsModal(null)} className="w-full btn-premium">
              Done
            </button>
          </div>
        </div>
      )}
    </div >
  );
};

export default StaffManagement;
