import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService, departmentService, positionService, workShiftService, shiftRotationService } from '../services/apiService';
import { toast } from 'sonner';
import { Search, Plus, KeyRound, Users, ChevronLeft, ChevronRight, X, Edit, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const EmployeeList = () => {
  const { user } = useAuth();
  const canManageEmployees = user?.role === 'Admin' || user?.role === 'HrAdmin' || user?.role === 'HR';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [posFilter, setPosFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedPosId, setSelectedPosId] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: depts } = useQuery({ queryKey: ['departments'], queryFn: departmentService.getAll });
  const { data: positions } = useQuery({ queryKey: ['positions'], queryFn: positionService.getAll });
  const { data: workshifts } = useQuery({ queryKey: ['workshifts'], queryFn: workShiftService.getAll });
  const { data: rotationGroups } = useQuery({ queryKey: ['rotation-groups'], queryFn: shiftRotationService.getGroups });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['employees', page, search, deptFilter, posFilter],
    queryFn: () => employeeService.getAll({ page, pageSize: 10, search, departmentId: deptFilter || undefined, positionId: posFilter || undefined })
  });

  const createMutation = useMutation({
    mutationFn: employeeService.create,
    onSuccess: (res) => {
      toast.success("Employee created! Temp Password: " + res.data.temporaryPassword, { duration: 10000 });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowModal(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.errors?.[0] || "Failed to create employee");
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { id: string, newPassword: string }) => employeeService.changePassword(data.id, { newPassword: data.newPassword }),
    onSuccess: () => {
      toast.success("Password updated successfully!");
      setShowPasswordModal(false);
      setSelectedEmployeeId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.errors?.[0] || "Failed to change password");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, body: any }) => employeeService.update(data.id, data.body),
    onSuccess: () => {
      toast.success("Employee updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowEditModal(false);
    },
    onError: () => toast.error("Failed to update employee")
  });

  const deleteMutation = useMutation({
    mutationFn: employeeService.delete,
    onSuccess: () => {
      toast.success("Employee deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: () => toast.error("Failed to delete employee")
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    if (!data.managerId) data.managerId = null;
    if (!data.defaultShiftId) data.defaultShiftId = null;
    if (!data.rotationGroupId) data.rotationGroupId = null;
    createMutation.mutate(data);
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    
    if (editData && editData.managerId) {
      data.managerId = editData.managerId;
    } else if (!data.managerId) {
      data.managerId = null;
    }
    if (!data.defaultShiftId) data.defaultShiftId = null;
    if (!data.rotationGroupId) data.rotationGroupId = null;
    
    updateMutation.mutate({ id: selectedEmployeeId, body: data });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleChangePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get('newPassword') as string;
    changePasswordMutation.mutate({ id: selectedEmployeeId, newPassword });
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Page Header */}
      <div className="bg-white px-8 py-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
              <span>CentroAbsen</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600">Employees</span>
            </div>
          </div>
          {canManageEmployees && (
            <button 
              onClick={() => { setShowModal(true); setSelectedDeptId(''); setSelectedPosId(''); }} 
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-md hover:bg-blue-700 font-medium transition-all shadow-sm shrink-0"
            >
              <Plus size={18} />
              Add Employee
            </button>
          )}
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full flex-1">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search employees..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-md w-full focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm transition-all text-sm" 
              />
            </div>
            <select 
              value={deptFilter} 
              onChange={(e) => setDeptFilter(e.target.value)} 
              className="py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm shadow-sm"
            >
              <option value="">All Departments</option>
              {depts?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select 
              value={posFilter} 
              onChange={(e) => setPosFilter(e.target.value)} 
              className="py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm shadow-sm"
            >
              <option value="">All Positions</option>
              {positions?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Employee</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Department</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Position</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Status</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-slate-200"></div><div><div className="h-4 w-32 bg-slate-200 rounded mb-2"></div><div className="h-3 w-24 bg-slate-200 rounded"></div></div></div></td>
                        <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                        <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                        <td className="px-6 py-4"><div className="h-6 w-16 bg-slate-200 rounded-full"></div></td>
                        <td className="px-6 py-4"><div className="h-6 w-24 bg-slate-200 rounded ml-auto"></div></td>
                      </tr>
                    ))
                  ) : isError ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-red-600 font-medium">
                        {(error as any)?.response?.data?.message || (error as any)?.message || 'Failed to load data.'}
                      </td>
                    </tr>
                  ) : !data?.data?.data || data.data.data.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-24">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                            <Users size={40} className="text-slate-300" />
                          </div>
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-slate-800 mb-1">Belum ada karyawan</h3>
                            <p className="text-sm text-slate-500">Mulai kelola tim Anda dengan menambahkan karyawan pertama.</p>
                          </div>
                          <button onClick={() => { setShowModal(true); setSelectedDeptId(''); setSelectedPosId(''); }} className="mt-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm">
                            Tambah Karyawan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.data.data.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                              {emp.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{emp.fullName}</div>
                              <div className="text-xs text-slate-500">{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium">{emp.departmentName || 'IT Department'}</td>
                        <td className="px-6 py-4">{emp.positionName || 'Staff'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            emp.status === 'Active' ? 'bg-green-100 text-green-700' : 
                            emp.status === 'OnLeave' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {emp.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/employees/${emp.id}`} className="text-slate-400 hover:text-blue-600 p-2 rounded-md hover:bg-blue-50 transition-colors" title="View Details">
                              <Eye size={18} />
                            </Link>
                            {canManageEmployees && (
                              <>
                                <button onClick={() => { setSelectedEmployeeId(emp.id); setEditData(emp); setSelectedDeptId(emp.departmentId); setSelectedPosId(emp.positionId); setShowEditModal(true); }} className="text-slate-400 hover:text-blue-600 p-2 rounded-md hover:bg-blue-50 transition-colors" title="Edit Employee">
                                  <Edit size={18} />
                                </button>
                                <button onClick={() => { setSelectedEmployeeId(emp.id); setShowPasswordModal(true); }} className="text-slate-400 hover:text-yellow-600 p-2 rounded-md hover:bg-yellow-50 transition-colors" title="Change Password">
                                  <KeyRound size={18} />
                                </button>
                                <button onClick={() => handleDelete(emp.id)} className="text-slate-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors" title="Delete Employee">
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
              <span className="text-sm text-slate-500 font-medium">Page {data?.data?.currentPage || 1} of {data?.data?.totalPages || 1}</span>
              <div className="flex gap-2">
                <button 
                  disabled={page === 1} 
                  onClick={() => setPage(p => p - 1)} 
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors text-sm font-medium text-slate-700 shadow-sm"
                >
                  <ChevronLeft size={16} />
                  Prev
                </button>
                <button 
                  disabled={!data?.data || page >= data.data.totalPages} 
                  onClick={() => setPage(p => p + 1)} 
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors text-sm font-medium text-slate-700 shadow-sm"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[600px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">Add New Employee</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-md transition-colors bg-white border border-slate-200 shadow-sm">
                  <X size={18} />
                </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                    <input name="email" type="email" placeholder="john.doe@company.com" required className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <input name="fullName" placeholder="John Doe" required className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
                    <select name="gender" required className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm">
                        <option value="">Select Gender</option>
                        <option value="Male">Laki-laki (Male)</option>
                        <option value="Female">Perempuan (Female)</option>
                    </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
                        <select name="departmentId" required value={selectedDeptId} onChange={(e) => { setSelectedDeptId(e.target.value); setSelectedPosId(''); }} className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm">
                            <option value="">Select Department</option>
                            {depts?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Position</label>
                        <select name="positionId" required value={selectedPosId} onChange={(e) => setSelectedPosId(e.target.value)} disabled={!selectedDeptId} className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm disabled:opacity-50 disabled:bg-slate-50">
                            {!selectedDeptId && <option value="">Pilih Department dahulu</option>}
                            {selectedDeptId && <option value="">Select Position</option>}
                            {selectedDeptId && positions && (() => {
                                const selectedDeptName = depts?.find((d: any) => d.id === selectedDeptId)?.name || 'Department';
                                const deptPositions = positions.filter((p: any) => String(p.departmentId) === String(selectedDeptId)).sort((a: any, b: any) => a.level - b.level);
                                const execPositions = positions.filter((p: any) => p.departmentId === null).sort((a: any, b: any) => a.level - b.level);
                                return (
                                    <>
                                        <optgroup label={`Posisi ${selectedDeptName}`}>
                                            {deptPositions.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Level {p.level})</option>)}
                                        </optgroup>
                                        <optgroup label="Posisi Eksekutif">
                                            {execPositions.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Level {p.level})</option>)}
                                        </optgroup>
                                    </>
                                );
                            })()}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Hire Date</label>
                        <input name="hireDate" type="date" required className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Default Shift</label>
                        <select name="defaultShiftId" className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm">
                            <option value="">(None)</option>
                            {workshifts?.map((ws: any) => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Rotation Group</label>
                        <select name="rotationGroupId" className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm">
                            <option value="">(None - Fixed Shift)</option>
                            {rotationGroups?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 bg-white rounded-md text-slate-700 hover:bg-slate-50 font-medium transition-colors text-sm shadow-sm">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors text-sm disabled:opacity-70 flex items-center shadow-sm">
                    {createMutation.isPending ? 'Saving...' : 'Create Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editData && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[600px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">Edit Employee</h2>
                <button onClick={() => { setShowEditModal(false); setEditData(null); }} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-md transition-colors bg-white border border-slate-200 shadow-sm">
                  <X size={18} />
                </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <input name="fullName" defaultValue={editData.fullName} required className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
                    <select name="gender" defaultValue={editData.gender || ''} required className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm">
                        <option value="">Select Gender</option>
                        <option value="Male">Laki-laki (Male)</option>
                        <option value="Female">Perempuan (Female)</option>
                    </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
                        <select name="departmentId" value={selectedDeptId} onChange={(e) => { setSelectedDeptId(e.target.value); setSelectedPosId(''); }} required className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm">
                            {depts?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Position</label>
                        <select name="positionId" value={selectedPosId} onChange={(e) => setSelectedPosId(e.target.value)} disabled={!selectedDeptId} required className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm disabled:opacity-50 disabled:bg-slate-50">
                            {!selectedDeptId && <option value="">Pilih Department dahulu</option>}
                            {selectedDeptId && <option value="">Select Position</option>}
                            {selectedDeptId && positions && (() => {
                                const selectedDeptName = depts?.find((d: any) => d.id === selectedDeptId)?.name || 'Department';
                                const deptPositions = positions.filter((p: any) => String(p.departmentId) === String(selectedDeptId)).sort((a: any, b: any) => a.level - b.level);
                                const execPositions = positions.filter((p: any) => p.departmentId === null).sort((a: any, b: any) => a.level - b.level);
                                return (
                                    <>
                                        <optgroup label={`Posisi ${selectedDeptName}`}>
                                            {deptPositions.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Level {p.level})</option>)}
                                        </optgroup>
                                        <optgroup label="Posisi Eksekutif">
                                            {execPositions.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Level {p.level})</option>)}
                                        </optgroup>
                                    </>
                                );
                            })()}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                        <select name="status" defaultValue={editData.status} required className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="OnLeave">OnLeave</option>
                            <option value="Terminated">Terminated</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Default Shift</label>
                        <select name="defaultShiftId" defaultValue={editData.defaultShiftId || ''} className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm">
                            <option value="">(None)</option>
                            {workshifts?.map((ws: any) => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Rotation Group</label>
                        <select name="rotationGroupId" defaultValue={editData.rotationGroupId || ''} className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm">
                            <option value="">(None - Fixed Shift)</option>
                            {rotationGroups?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200">
                  <button type="button" onClick={() => { setShowEditModal(false); setEditData(null); }} className="px-4 py-2 border border-slate-200 bg-white rounded-md text-slate-700 hover:bg-slate-50 font-medium transition-colors text-sm shadow-sm">Cancel</button>
                  <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors text-sm disabled:opacity-70 flex items-center shadow-sm">
                    {updateMutation.isPending ? 'Saving...' : 'Update Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">Change Password</h2>
                <button onClick={() => { setShowPasswordModal(false); setSelectedEmployeeId(null); }} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-md transition-colors bg-white border border-slate-200 shadow-sm">
                  <X size={18} />
                </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                    <input name="newPassword" type="password" required minLength={6} placeholder="Enter new password" className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm" />
                    <p className="text-xs text-slate-500 mt-2">Must be at least 6 characters long.</p>
                </div>
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200">
                  <button type="button" onClick={() => { setShowPasswordModal(false); setSelectedEmployeeId(null); }} className="px-4 py-2 border border-slate-200 bg-white rounded-md text-slate-700 hover:bg-slate-50 font-medium transition-colors text-sm shadow-sm">Cancel</button>
                  <button type="submit" disabled={changePasswordMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors text-sm disabled:opacity-70 flex items-center shadow-sm">
                    {changePasswordMutation.isPending ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
