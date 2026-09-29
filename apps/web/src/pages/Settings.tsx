import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentService, positionService, roleService, workShiftService } from '../services/apiService';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { Briefcase, Building2, Plus, Trash2, Shield, Key, X, Clock } from 'lucide-react';

import { RotationGroups } from './settings/RotationGroups';
import { ProfileSettings } from './settings/ProfileSettings';
import { User } from 'lucide-react';

export const Settings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'departments' | 'positions' | 'roles' | 'permissions' | 'workshifts' | 'rotations'>('profile');
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  
  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.getAll,
    enabled: activeTab === 'departments' || activeTab === 'positions'
  });

  const { data: positions, isLoading: loadingPos } = useQuery({
    queryKey: ['positions'],
    queryFn: positionService.getAll,
    enabled: activeTab === 'positions'
  });

  const { data: workshifts, isLoading: loadingWorkshifts } = useQuery({
    queryKey: ['workshifts'],
    queryFn: workShiftService.getAll,
    enabled: activeTab === 'workshifts'
  });

  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: roleService.getRoles,
    enabled: activeTab === 'roles' || activeTab === 'permissions'
  });

  const { data: permissions, isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: roleService.getPermissions,
    enabled: activeTab === 'permissions' || !!selectedRole
  });

  const { data: rolePermissions } = useQuery({
    queryKey: ['role-permissions', selectedRole?.id],
    queryFn: () => roleService.getRolePermissions(selectedRole.id),
    enabled: !!selectedRole
  });

  const createDeptMutation = useMutation({
    mutationFn: departmentService.create,
    onSuccess: () => {
      toast.success("Department created successfully!");
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setShowModal(false);
    },
    onError: () => toast.error("Failed to create department")
  });

  const deleteDeptMutation = useMutation({
    mutationFn: departmentService.delete,
    onSuccess: () => {
      toast.success("Department deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: () => toast.error("Failed to delete department")
  });

  const createPosMutation = useMutation({
    mutationFn: positionService.create,
    onSuccess: () => {
      toast.success("Position created successfully!");
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      setShowModal(false);
    },
    onError: () => toast.error("Failed to create position")
  });

  const deletePosMutation = useMutation({
    mutationFn: positionService.delete,
    onSuccess: () => {
      toast.success("Position deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
    onError: () => toast.error("Failed to delete position")
  });

  const createWorkshiftMutation = useMutation({
    mutationFn: workShiftService.create,
    onSuccess: () => {
      toast.success("Work Shift created successfully!");
      queryClient.invalidateQueries({ queryKey: ['workshifts'] });
      setShowModal(false);
    },
    onError: () => toast.error("Failed to create work shift")
  });

  const deleteWorkshiftMutation = useMutation({
    mutationFn: workShiftService.delete,
    onSuccess: () => {
      toast.success("Work Shift deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['workshifts'] });
    },
    onError: () => toast.error("Failed to delete work shift")
  });

  const createRoleMutation = useMutation({
    mutationFn: roleService.createRole,
    onSuccess: () => {
      toast.success("Role created successfully!");
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowModal(false);
    },
    onError: () => toast.error("Failed to create role")
  });

  const assignPermissionsMutation = useMutation({
    mutationFn: ({ roleId, data }: { roleId: string, data: any }) => roleService.assignPermissions(roleId, data),
    onSuccess: () => {
      toast.success("Permissions assigned successfully!");
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      setSelectedRole(null);
    },
    onError: () => toast.error("Failed to assign permissions")
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    if (activeTab === 'departments') {
      createDeptMutation.mutate({ name: data.name as string });
    } else if (activeTab === 'positions') {
      createPosMutation.mutate({ name: data.name as string, level: Number(data.level), departmentId: data.departmentId as string || null });
    } else if (activeTab === 'roles') {
      createRoleMutation.mutate({ name: data.name as string });
    } else if (activeTab === 'workshifts') {
      createWorkshiftMutation.mutate({
        name: data.name as string,
        startTime: data.startTime as string + ":00",
        endTime: data.endTime as string + ":00",
        isOvernight: data.isOvernight === 'on',
        toleranceMinutes: Number(data.toleranceMinutes)
      });
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${activeTab === 'departments' ? 'department' : 'position'}?`)) return;
    
    if (activeTab === 'departments') {
      deleteDeptMutation.mutate(id);
    } else if (activeTab === 'positions') {
      deletePosMutation.mutate(id);
    } else if (activeTab === 'workshifts') {
      deleteWorkshiftMutation.mutate(id);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Page Header */}
      <div className="bg-white px-8 py-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
              <span>CentroAbsen</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600">Settings</span>
            </div>
          </div>
          {(user?.role === 'Admin' || user?.role === 'HrAdmin' || user?.role === 'HR') && (activeTab === 'departments' || activeTab === 'positions' || activeTab === 'roles' || activeTab === 'workshifts') && !selectedRole && (
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-md hover:bg-blue-700 font-medium transition-all shadow-sm shrink-0">
              <Plus size={18} />
              Add {activeTab === 'departments' ? 'Department' : activeTab === 'positions' ? 'Position' : activeTab === 'workshifts' ? 'Work Shift' : 'Role'}
            </button>
          )}
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full flex-1">
        {!selectedRole ? (
          <>
            <div className="flex space-x-2 border-b border-slate-200 mb-6 overflow-x-auto">
              <button 
                className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold transition-colors border-b-[3px] whitespace-nowrap ${
                  activeTab === 'profile' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
                onClick={() => setActiveTab('profile')}
              >
                <User size={18} />
                Profil Saya
              </button>
              {(user?.role === 'Admin' || user?.role === 'HrAdmin' || user?.role === 'HR') && (
                <>
                  <button 
                    className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold transition-colors border-b-[3px] whitespace-nowrap ${
                      activeTab === 'departments' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveTab('departments')}
                  >
                    <Building2 size={18} />
                    Departments
                  </button>
                  <button 
                    className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold transition-colors border-b-[3px] whitespace-nowrap ${
                      activeTab === 'positions' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveTab('positions')}
                  >
                    <Briefcase size={18} />
                    Positions
                  </button>
                  <button 
                    className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold transition-colors border-b-[3px] whitespace-nowrap ${
                      activeTab === 'roles' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveTab('roles')}
                  >
                    <Shield size={18} />
                    Roles
                  </button>
                  <button 
                    className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold transition-colors border-b-[3px] whitespace-nowrap ${
                      activeTab === 'permissions' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveTab('permissions')}
                  >
                    <Key size={18} />
                    Permissions
                  </button>
                  <button 
                    className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold transition-colors border-b-[3px] whitespace-nowrap ${
                      activeTab === 'workshifts' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveTab('workshifts')}
                  >
                    <Clock size={18} />
                    Work Shifts
                  </button>
                  <button 
                    className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold transition-colors border-b-[3px] whitespace-nowrap ${
                      activeTab === 'rotations' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveTab('rotations')}
                  >
                    <Briefcase size={18} />
                    Rotation Groups
                  </button>
                </>
              )}
            </div>

            {activeTab === 'profile' ? (
              <ProfileSettings />
            ) : activeTab === 'rotations' ? (
              <RotationGroups />
            ) : (
              <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Name</th>
                        {activeTab === 'positions' && <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Department</th>}
                        {activeTab === 'positions' && <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Level</th>}
                        {activeTab === 'workshifts' && <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Schedule</th>}
                        {activeTab === 'workshifts' && <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Type</th>}
                        {activeTab === 'permissions' && <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Description</th>}
                        {activeTab !== 'permissions' && <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                    {activeTab === 'departments' ? (
                      loadingDepts ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                            <td className="px-6 py-4"><div className="h-8 w-8 bg-slate-200 rounded-md ml-auto"></div></td>
                          </tr>
                        ))
                      ) : departments?.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-6 py-24">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                <Building2 size={40} className="text-slate-300" />
                              </div>
                              <div className="text-center">
                                <h3 className="text-lg font-semibold text-slate-800 mb-1">Belum ada departemen</h3>
                                <p className="text-sm text-slate-500">Mulai tambahkan departemen pertama Anda.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        departments?.map((dept: any) => (
                          <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-900">{dept.name}</td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => handleDelete(dept.id)} className="text-slate-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors">
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )
                    ) : activeTab === 'positions' ? (
                      loadingPos ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                            <td className="px-6 py-4"><div className="h-6 w-24 bg-slate-200 rounded-full"></div></td>
                            <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
                            <td className="px-6 py-4"><div className="h-8 w-8 bg-slate-200 rounded-md ml-auto"></div></td>
                          </tr>
                        ))
                      ) : positions?.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-24">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                <Briefcase size={40} className="text-slate-300" />
                              </div>
                              <div className="text-center">
                                <h3 className="text-lg font-semibold text-slate-800 mb-1">Belum ada posisi</h3>
                                <p className="text-sm text-slate-500">Mulai tambahkan posisi pertama Anda.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        positions?.map((pos: any) => (
                          <tr key={pos.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-900">{pos.name}</td>
                            <td className="px-6 py-4">
                              {pos.departmentName ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">{pos.departmentName}</span>
                              ) : (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">Executive</span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-medium">Level {pos.level}</td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => handleDelete(pos.id)} className="text-slate-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors">
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )
                    ) : activeTab === 'roles' ? (
                      loadingRoles ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                            <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded ml-auto"></div></td>
                          </tr>
                        ))
                      ) : roles?.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-6 py-24">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                <Shield size={40} className="text-slate-300" />
                              </div>
                              <div className="text-center">
                                <h3 className="text-lg font-semibold text-slate-800 mb-1">Belum ada role</h3>
                                <p className="text-sm text-slate-500">Mulai tambahkan role pertama Anda.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        roles?.map((role: any) => (
                          <tr key={role.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedRole(role)}>
                            <td className="px-6 py-4 font-semibold text-slate-900">{role.name}</td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={(e) => { e.stopPropagation(); setSelectedRole(role); }} className="text-blue-600 hover:text-blue-700 p-2 rounded-md hover:bg-blue-50 transition-colors text-sm font-medium">
                                Edit Permissions
                              </button>
                            </td>
                          </tr>
                        ))
                      )
                    ) : activeTab === 'workshifts' ? (
                      loadingWorkshifts ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                            <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                            <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
                            <td className="px-6 py-4"><div className="h-8 w-8 bg-slate-200 rounded-md ml-auto"></div></td>
                          </tr>
                        ))
                      ) : workshifts?.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-24">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                <Clock size={40} className="text-slate-300" />
                              </div>
                              <div className="text-center">
                                <h3 className="text-lg font-semibold text-slate-800 mb-1">Belum ada work shift</h3>
                                <p className="text-sm text-slate-500">Mulai tambahkan work shift pertama Anda.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        workshifts?.map((shift: any) => (
                          <tr key={shift.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-900">{shift.name}</td>
                            <td className="px-6 py-4 font-medium text-slate-700">{shift.startTime.substring(0, 5)} - {shift.endTime.substring(0, 5)}</td>
                            <td className="px-6 py-4">
                              {shift.isOvernight ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">Overnight</span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">Regular</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => handleDelete(shift.id)} className="text-slate-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors">
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )
                    ) : (
                      loadingPerms ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-6 py-4"><div className="h-6 w-32 bg-slate-200 rounded-full"></div></td>
                            <td className="px-6 py-4"><div className="h-4 w-64 bg-slate-200 rounded"></div></td>
                          </tr>
                        ))
                      ) : permissions?.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-6 py-24">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                <Key size={40} className="text-slate-300" />
                              </div>
                              <div className="text-center">
                                <h3 className="text-lg font-semibold text-slate-800 mb-1">Belum ada permission</h3>
                                <p className="text-sm text-slate-500">Sistem belum memiliki permission yang terdaftar.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        permissions?.map((perm: any) => {
                          let desc = "Access related to " + perm.name.split('.')[0] + " management";
                          if (perm.name.includes("read")) desc = `View ${perm.name.split('.')[0]} data`;
                          if (perm.name.includes("write")) desc = `Create and modify ${perm.name.split('.')[0]} data`;
                          if (perm.name.includes("delete")) desc = `Delete ${perm.name.split('.')[0]} data`;
                          if (perm.name === "leave.approve") desc = "Approve or reject leave requests";
                          return (
                            <tr key={perm.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-900">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">{perm.name}</span>
                              </td>
                              <td className="px-6 py-4 text-sm">{desc}</td>
                            </tr>
                          );
                        })
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-200 p-8">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-800">Edit Permissions for <span className="text-blue-600">{selectedRole.name}</span></h2>
              <button onClick={() => setSelectedRole(null)} className="text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">Back</button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const selectedPerms = permissions?.filter((p: any) => formData.get(`perm_${p.id}`) === 'on').map((p: any) => p.id) || [];
              assignPermissionsMutation.mutate({ roleId: selectedRole.id, data: { permissionIds: selectedPerms } });
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {permissions?.map((perm: any) => (
                  <label key={perm.id} className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-blue-50/50 hover:border-blue-200 transition-colors">
                    <input 
                      type="checkbox" 
                      name={`perm_${perm.id}`} 
                      defaultChecked={rolePermissions?.includes(perm.id)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600 outline-none" 
                    />
                    <span className="text-sm font-medium text-slate-700">{perm.name}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex justify-end pt-6 border-t border-slate-200">
                <button type="submit" disabled={assignPermissionsMutation.isPending} className="px-6 py-2.5 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 font-medium transition-all disabled:opacity-70 text-sm">
                  {assignPermissionsMutation.isPending ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {showModal && !selectedRole && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">Add {activeTab === 'departments' ? 'Department' : activeTab === 'positions' ? 'Position' : activeTab === 'workshifts' ? 'Work Shift' : 'Role'}</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 p-1.5 rounded-md transition-colors shadow-sm">
                  <X size={18} />
                </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                  <input name="name" type="text" required className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm" />
                </div>
                {activeTab === 'positions' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
                      <select name="departmentId" className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm">
                        <option value="">-- No Department (Executive) --</option>
                        {departments?.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Level</label>
                      <input name="level" type="number" required min="1" className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm" />
                    </div>
                  </>
                )}
                {activeTab === 'workshifts' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Time</label>
                        <input name="startTime" type="time" required className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">End Time</label>
                        <input name="endTime" type="time" required className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Tolerance (Minutes)</label>
                      <input name="toleranceMinutes" type="number" defaultValue="15" min="0" required className="w-full border border-slate-200 bg-white px-3 py-2 rounded-md focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm text-sm" />
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-2">
                      <input type="checkbox" name="isOvernight" id="isOvernight" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600 outline-none" />
                      <label htmlFor="isOvernight" className="text-sm font-medium text-slate-700">Is Overnight Shift (Ends Next Day)</label>
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 bg-white rounded-md text-slate-700 hover:bg-slate-50 font-medium transition-colors shadow-sm text-sm">Cancel</button>
                  <button type="submit" disabled={createDeptMutation.isPending || createPosMutation.isPending || createRoleMutation.isPending || createWorkshiftMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 font-medium transition-all disabled:opacity-70 text-sm">
                    {(createDeptMutation.isPending || createPosMutation.isPending || createRoleMutation.isPending || createWorkshiftMutation.isPending) ? 'Saving...' : 'Save'}
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
