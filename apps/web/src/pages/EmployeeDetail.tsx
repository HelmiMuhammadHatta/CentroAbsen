import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../services/apiService';
import { toast } from 'sonner';
import { ArrowLeft, User, Briefcase, Building2, Calendar, FileText, Clock, Upload, Trash2, Download, Users, Eye } from 'lucide-react';
import { DocumentViewerModal } from '../components/DocumentViewerModal';

export const EmployeeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'info' | 'subordinates' | 'documents' | 'audit'>('info');
  const [showDocModal, setShowDocModal] = useState(false);
  const [docType, setDocType] = useState('KTP');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const handlePreviewDoc = (doc: any) => {
    const fileName = doc.filePath?.split('/').pop() || `${doc.documentType}.pdf`;
    setPreviewDoc({
      ...doc,
      fileName,
      fileSize: 0
    });
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 30) return `${diffDays} hari lalu`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} bulan lalu`;
    return `${Math.floor(diffDays / 365)} tahun lalu`;
  };

  const { data: employeeData, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeService.getById(id!),
    enabled: !!id
  });

  const { data: subordinates } = useQuery({
    queryKey: ['employee-subordinates', id],
    queryFn: () => employeeService.getSubordinates(id!),
    enabled: !!id && activeTab === 'subordinates'
  });

  const { data: documents } = useQuery({
    queryKey: ['employee-documents', id],
    queryFn: () => employeeService.getDocuments(id!),
    enabled: !!id && activeTab === 'documents'
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['employee-audit', id, auditPage],
    queryFn: () => employeeService.getAuditLogs(id!, auditPage, 10),
    enabled: !!id && activeTab === 'audit'
  });

  const uploadDocMutation = useMutation({
    mutationFn: ({ id, file, docType }: { id: string, file: File, docType: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType);
      return employeeService.uploadDocument(id, formData, (progressEvent: any) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      });
    },
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ['employee-documents', id] });
      setShowDocModal(false);
      setDocFile(null);
      setUploadProgress(0);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to upload document");
      setUploadProgress(0);
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => employeeService.deleteDocument(id!, docId),
    onSuccess: () => {
      toast.success("Document deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['employee-documents', id] });
    },
    onError: () => toast.error("Failed to delete document")
  });

  const handleDeleteDoc = (docId: string) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      deleteDocMutation.mutate(docId);
    }
  };

  const handleDownloadDoc = async (docId: string, docType: string, filePath: string) => {
    try {
      const blob = await employeeService.downloadDocument(id!, docId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const ext = filePath.split('.').pop();
      link.setAttribute('download', `${docType}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      toast.error('Failed to download document');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit");
      e.target.value = '';
      return;
    }
    
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error("Only PDF, JPG, JPEG and PNG are allowed");
      e.target.value = '';
      return;
    }
    
    setDocFile(file);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) {
      toast.error("Please select a file to upload");
      return;
    }
    uploadDocMutation.mutate({ id: id!, file: docFile, docType });
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading employee details...</div>;

  const emp = employeeData?.data;
  if (!emp) return <div className="p-8 text-center text-slate-500">Employee not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{emp.fullName}</h1>
          <p className="text-sm text-slate-500">{emp.positionName} at {emp.departmentName}</p>
        </div>
      </div>

      <div className="flex space-x-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
        <button className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => setActiveTab('info')}>
          <User size={16} /> Information
        </button>
        <button className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'subordinates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => setActiveTab('subordinates')}>
          <Users size={16} /> Subordinates
        </button>
        <button className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => setActiveTab('documents')}>
          <FileText size={16} /> Documents
        </button>
        <button className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => setActiveTab('audit')}>
          <Clock size={16} /> Riwayat Perubahan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        {activeTab === 'info' && (
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Personal Details</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><User size={20} /></div>
                      <div><p className="text-xs text-slate-500">Full Name</p><p className="font-semibold text-slate-800">{emp.fullName}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600"><Building2 size={20} /></div>
                      <div><p className="text-xs text-slate-500">Department</p><p className="font-semibold text-slate-800">{emp.departmentName || '-'}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600"><Briefcase size={20} /></div>
                      <div><p className="text-xs text-slate-500">Position</p><p className="font-semibold text-slate-800">{emp.positionName || '-'}</p></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Employment Details</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600"><Calendar size={20} /></div>
                      <div><p className="text-xs text-slate-500">Hire Date</p><p className="font-semibold text-slate-800">{new Date(emp.hireDate).toLocaleDateString()}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600"><User size={20} /></div>
                      <div><p className="text-xs text-slate-500">Direct Manager</p><p className="font-semibold text-slate-800">{emp.managerName || '-'}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600"><Clock size={20} /></div>
                      <div><p className="text-xs text-slate-500">Status</p><p className="font-semibold text-slate-800">{emp.status}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><Clock size={20} /></div>
                      <div><p className="text-xs text-slate-500">Default Shift</p><p className="font-semibold text-slate-800">{emp.defaultShiftName || 'Office Hour'}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><Users size={20} /></div>
                      <div><p className="text-xs text-slate-500">Grup Rotasi Shift</p><p className="font-semibold text-slate-800">{emp.rotationGroupName || '(None - Fixed Shift)'}</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subordinates' && (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-500">Name</th>
                <th className="px-6 py-4 font-semibold text-slate-500">Position</th>
                <th className="px-6 py-4 font-semibold text-slate-500">Department</th>
                <th className="px-6 py-4 font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subordinates?.data?.map((sub: any) => (
                <tr key={sub.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/employees/${sub.id}`)}>
                  <td className="px-6 py-4 font-medium text-slate-900">{sub.fullName}</td>
                  <td className="px-6 py-4 text-slate-600">{sub.positionName}</td>
                  <td className="px-6 py-4 text-slate-600">{sub.departmentName}</td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700 border border-green-200">{sub.status}</span></td>
                </tr>
              ))}
              {(!subordinates?.data || subordinates.data.length === 0) && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No subordinates found</td></tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'documents' && (
          <div>
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-end">
              <button onClick={() => setShowDocModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm shadow-blue-200">
                <Upload size={16} />
                Upload Document
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents?.data?.map((doc: any) => {
                const isPdf = doc.filePath.toLowerCase().endsWith('.pdf');
                return (
                  <div key={doc.id} className="flex flex-col p-5 border border-slate-200 rounded-xl hover:shadow-md transition-all duration-300 bg-white group">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                        <FileText size={24} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate" title={doc.documentType}>{doc.documentType}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{new Date(doc.uploadedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handlePreviewDoc(doc)} className="flex-1 flex items-center justify-center gap-1.5 p-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm" title="Preview / Baca PDF">
                        <Eye size={16} /> Pratinjau
                      </button>
                      <button onClick={() => handleDownloadDoc(doc.id, doc.documentType, doc.filePath)} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 hover:border-blue-200" title="Download">
                        <Download size={16} />
                      </button>
                      <button onClick={() => handleDeleteDoc(doc.id)} className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 hover:border-red-200" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {(!documents?.data || documents.data.length === 0) && (
                <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <FileText size={32} className="text-slate-300" />
                  </div>
                  <p className="font-medium text-slate-600 mb-1">No documents found</p>
                  <p className="text-sm">Click the upload button to add a document.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="p-6 sm:p-8">
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-4">
              {auditLogs?.data?.data?.map((log: any) => {
                const isCreate = log.action === 0;
                const isUpdate = log.action === 1;
                const isDelete = log.action === 2;
                
                const oldVals = log.oldValue ? JSON.parse(log.oldValue) : {};
                const newVals = log.newValue ? JSON.parse(log.newValue) : {};
                
                const changedFields = [];
                if (isUpdate) {
                  for (const key in newVals) {
                    if (oldVals[key] !== newVals[key] && key !== 'UpdatedAt' && key !== 'CreatedAt') {
                      changedFields.push({ key, old: oldVals[key], new: newVals[key] });
                    }
                  }
                }

                return (
                  <div key={log.id} className="relative pl-8">
                    <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white ${isCreate ? 'bg-green-500' : isUpdate ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                    
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${isCreate ? 'bg-green-50 text-green-700' : isUpdate ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                            {isCreate ? 'Create' : isUpdate ? 'Update' : 'Delete'}
                          </span>
                          <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                            <User size={14} className="text-slate-400" />
                            {log.changedByName || 'System'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium cursor-help" title={new Date(log.changedAt).toLocaleString()}>
                          {getRelativeTime(log.changedAt)}
                        </span>
                      </div>
                      
                      {isUpdate && changedFields.length > 0 && (
                        <div className="mt-4 space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Perubahan Detail</p>
                          {changedFields.map((field, idx) => (
                            <div key={idx} className="text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                              <span className="font-medium text-slate-700 min-w-[140px]">{field.key}</span>
                              <div className="flex items-center gap-2 text-slate-600 flex-wrap">
                                <span className="bg-white px-2 py-1 rounded border border-slate-200 line-through text-slate-400">{field.old?.toString() || 'null'}</span>
                                <span className="text-slate-400">→</span>
                                <span className="bg-white px-2 py-1 rounded border border-slate-200 font-medium text-blue-600">{field.new?.toString() || 'null'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {isCreate && (
                        <p className="mt-2 text-sm text-slate-600">Employee record created successfully.</p>
                      )}
                      {isDelete && (
                        <p className="mt-2 text-sm text-slate-600 text-red-600 font-medium">Employee record was deleted.</p>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {(!auditLogs?.data?.data || auditLogs.data.data.length === 0) && (
                <div className="pl-8 py-4 text-slate-500 font-medium text-sm">
                  Belum ada riwayat perubahan.
                </div>
              )}
            </div>
            
            {auditLogs?.data?.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                  disabled={auditPage === 1}
                  className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-slate-600">
                  Page {auditPage} of {auditLogs.data.totalPages}
                </span>
                <button 
                  onClick={() => setAuditPage(p => p + 1)}
                  disabled={auditPage === auditLogs.data.totalPages}
                  className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showDocModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">Upload Document</h2>
                <button onClick={() => { setShowDocModal(false); setDocFile(null); setUploadProgress(0); }} className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-1 rounded-full transition-colors">&times;</button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Document Type</label>
                  <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full border border-slate-200 bg-slate-50 p-2.5 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
                    <option value="KTP">KTP</option>
                    <option value="Ijazah">Ijazah</option>
                    <option value="Kontrak">Kontrak Kerja</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">File (PDF/JPG/PNG, Max 5MB)</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors relative group">
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="flex flex-col items-center justify-center text-slate-500 pointer-events-none">
                      <Upload size={28} className={`mb-3 transition-colors ${docFile ? 'text-blue-500' : 'text-slate-400 group-hover:text-blue-500'}`} />
                      <p className={`text-sm font-semibold ${docFile ? 'text-slate-800' : 'text-slate-600'}`}>
                        {docFile ? docFile.name : 'Click or drag file here'}
                      </p>
                      <p className="text-xs mt-1 text-slate-400">
                        {docFile ? `${(docFile.size / 1024 / 1024).toFixed(2)} MB` : 'Up to 5MB'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                )}
                
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                  <button type="button" onClick={() => { setShowDocModal(false); setDocFile(null); setUploadProgress(0); }} className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors">Cancel</button>
                  <button type="submit" disabled={!docFile || uploadDocMutation.isPending} className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 font-medium transition-all disabled:opacity-70 flex items-center">
                    {uploadDocMutation.isPending ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        fetchDocumentBlob={async () => previewDoc ? employeeService.viewDocument(id!, previewDoc.id) : new Blob()}
      />
    </div>
  );
};


