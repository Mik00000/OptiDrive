"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Inputs";
import { Modal } from "@/components/Modal";
import Switch from "@/components/Switch";
import {
  getAdminEnterpriseRequestsApi,
  approveEnterpriseRequestApi,
  rejectEnterpriseRequestApi,
  getAdminIncidentsApi,
  createIncidentApi,
  updateIncidentApi,
  deleteIncidentApi,
  getAdminWorkspacesAndUsersApi,
  updateWorkspaceBonusApi,
  toggleWorkspaceBanApi,
  toggleUserBanApi,
  purgeCdnCacheApi,
  getAdminTrafficAnalyticsApi,
  AdminEnterpriseRequest,
  AdminIncident,
  AdminWorkspace,
  AdminUser,
  AdminTrafficMetric,
} from "@/features/admin/api";
import { toast } from "react-toastify";

// Helper to format Storage/Traffic metrics cleanly
const formatQuotaText = (text: string | null | undefined): string => {
  if (!text) return '—';
  let cleaned = text.replace(/about/gi, '').trim().toUpperCase();
  cleaned = cleaned.replace(/ГБ/gi, 'GB').replace(/ТБ/gi, 'TB');
  cleaned = cleaned.replace(/(\d+)\s*(GB|TB|MB|KB|GB\/MONTH|TB\/MONTH)/gi, '$1 $2');
  return cleaned;
};

// Format bytes into GB or MB
const formatBytes = (bytesStr: string): string => {
  const bytes = Number(bytesStr);
  if (isNaN(bytes) || bytes === 0) return '0 GB';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 0.1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

export default function AdminConsolePage() {
  const [activeTab, setActiveTab] = useState<'requests' | 'incidents' | 'workspaces' | 'cdn' | 'traffic'>('requests');
  
  // Enterprise Requests States
  const [requests, setRequests] = useState<AdminEnterpriseRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AdminEnterpriseRequest | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [limitsForm, setLimitsForm] = useState({
    storageGb: 250,
    bandwidthGb: 2000,
    optimizations: 100000,
    price: 150,
    couponCode: "",
  });

  // Incidents States
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<AdminIncident | null>(null);
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    status: 'INVESTIGATING',
    description: '',
    isActive: true
  });
  const [incidentSubmitLoading, setIncidentSubmitLoading] = useState(false);

  // Workspaces & Users States
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [managerLoading, setManagerLoading] = useState(true);
  const [managerSubTab, setManagerSubTab] = useState<'workspaces' | 'users'>('workspaces');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Workspace Bonus Modal States
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [selectedBonusWorkspace, setSelectedBonusWorkspace] = useState<AdminWorkspace | null>(null);
  const [bonusForm, setBonusForm] = useState({ bonusGb: 10 });
  const [bonusSubmitLoading, setBonusSubmitLoading] = useState(false);

  // CDN Purger States
  const [cdnType, setCdnType] = useState<'path' | 'tag'>('path');
  const [cdnValue, setCdnValue] = useState('/*');
  const [cdnPurging, setCdnPurging] = useState(false);

  // Traffic Analytics States
  const [trafficData, setTrafficData] = useState<AdminTrafficMetric[]>([]);
  const [trafficLoading, setTrafficLoading] = useState(true);

  // Fetch Requests
  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const data = await getAdminEnterpriseRequestsApi();
      setRequests(data);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to load enterprise requests.");
    } finally {
      setRequestsLoading(false);
    }
  };

  // Fetch Incidents
  const fetchIncidents = async () => {
    setIncidentsLoading(true);
    try {
      const data = await getAdminIncidentsApi();
      setIncidents(data);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to load system incidents.");
    } finally {
      setIncidentsLoading(false);
    }
  };

  // Fetch Workspaces & Users
  const fetchWorkspacesAndUsers = async () => {
    setManagerLoading(true);
    try {
      const data = await getAdminWorkspacesAndUsersApi();
      setWorkspaces(data.workspaces);
      setUsers(data.users);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to load workspaces & users.");
    } finally {
      setManagerLoading(false);
    }
  };

  // Fetch Traffic
  const fetchTrafficAnalytics = async () => {
    setTrafficLoading(true);
    try {
      const data = await getAdminTrafficAnalyticsApi();
      setTrafficData(data);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to load traffic logs.");
    } finally {
      setTrafficLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchIncidents();
    fetchWorkspacesAndUsers();
    fetchTrafficAnalytics();
  }, []);

  // Approve Enterprise Modal Actions
  const handleOpenApproveModal = (req: AdminEnterpriseRequest) => {
    setSelectedRequest(req);
    
    let parsedStorage = 250;
    let parsedTraffic = 2000;
    
    const storageMatch = req.expectedStorage.match(/(\d+)/);
    if (storageMatch) parsedStorage = parseInt(storageMatch[1]);
    
    const trafficMatch = req.expectedTraffic.match(/(\d+)/);
    if (trafficMatch) parsedTraffic = parseInt(trafficMatch[1]);

    if (req.expectedStorage.toLowerCase().includes("tb") || req.expectedStorage.toLowerCase().includes("тб")) {
      parsedStorage *= 1024;
    }
    if (req.expectedTraffic.toLowerCase().includes("tb") || req.expectedTraffic.toLowerCase().includes("тб")) {
      parsedTraffic *= 1024;
    }

    setLimitsForm({
      storageGb: parsedStorage,
      bandwidthGb: parsedTraffic,
      optimizations: parsedStorage >= 1000 ? 500000 : 100000,
      price: parsedStorage >= 1024 ? 300 : 150,
      couponCode: "",
    });
    
    setIsApproveModalOpen(true);
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setApproveLoading(true);
    try {
      const res = await approveEnterpriseRequestApi(selectedRequest.id, {
        storageGb: Number(limitsForm.storageGb),
        bandwidthGb: Number(limitsForm.bandwidthGb),
        optimizations: Number(limitsForm.optimizations),
        price: Number(limitsForm.price),
        couponCode: limitsForm.couponCode,
      });

      if (res.success) {
        toast.success("Enterprise offer sent to client!");
        setIsApproveModalOpen(false);
        fetchRequests();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to approve request.");
    } finally {
      setApproveLoading(false);
    }
  };

  const handleRejectRequest = async (id: string) => {
    if (!confirm("Are you sure you want to reject this request?")) return;
    try {
      const res = await rejectEnterpriseRequestApi(id);
      if (res.success) {
        toast.info("Request rejected.");
        fetchRequests();
      }
    } catch {
      toast.error("Failed to reject request.");
    }
  };

  // Incident Modal Actions
  const handleOpenIncidentModal = (inc: AdminIncident | null = null) => {
    if (inc) {
      setSelectedIncident(inc);
      setIncidentForm({
        title: inc.title,
        status: inc.status,
        description: inc.description,
        isActive: inc.isActive
      });
    } else {
      setSelectedIncident(null);
      setIncidentForm({
        title: '',
        status: 'INVESTIGATING',
        description: '',
        isActive: true
      });
    }
    setIsIncidentModalOpen(true);
  };

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIncidentSubmitLoading(true);
    try {
      if (selectedIncident) {
        const res = await updateIncidentApi(selectedIncident.id, incidentForm);
        if (res.success) {
          toast.success("Incident updated successfully!");
          setIsIncidentModalOpen(false);
          fetchIncidents();
        }
      } else {
        const res = await createIncidentApi(incidentForm);
        if (res.success) {
          toast.success("New incident created!");
          setIsIncidentModalOpen(false);
          fetchIncidents();
        }
      }
    } catch {
      toast.error("Failed to save incident.");
    } finally {
      setIncidentSubmitLoading(false);
    }
  };

  const handleDeleteIncident = async (id: string) => {
    if (!confirm("Are you sure you want to delete this incident permanently?")) return;
    try {
      const res = await deleteIncidentApi(id);
      if (res.success) {
        toast.info("Incident removed.");
        fetchIncidents();
      }
    } catch {
      toast.error("Failed to delete incident.");
    }
  };

  // Workspace Manager Actions
  const handleOpenBonusModal = (w: AdminWorkspace) => {
    setSelectedBonusWorkspace(w);
    const currentBonusGb = Math.round(Number(w.storageBonusBytes) / (1024 * 1024 * 1024));
    setBonusForm({ bonusGb: currentBonusGb || 10 });
    setIsBonusModalOpen(true);
  };

  const handleBonusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBonusWorkspace) return;
    setBonusSubmitLoading(true);
    try {
      const res = await updateWorkspaceBonusApi(selectedBonusWorkspace.id, Number(bonusForm.bonusGb));
      if (res.success) {
        toast.success(`Storage bonus updated to +${bonusForm.bonusGb} GB`);
        setIsBonusModalOpen(false);
        fetchWorkspacesAndUsers();
      }
    } catch {
      toast.error("Failed to apply storage bonus.");
    } finally {
      setBonusSubmitLoading(false);
    }
  };

  const handleToggleWorkspaceBan = async (w: AdminWorkspace) => {
    const action = w.isBanned ? "unban" : "ban";
    if (!confirm(`Are you sure you want to ${action} workspace "${w.name}"?`)) return;
    try {
      const res = await toggleWorkspaceBanApi(w.id, !w.isBanned);
      if (res.success) {
        toast.success(`Workspace is now ${w.isBanned ? "Active" : "Suspended"}`);
        fetchWorkspacesAndUsers();
      }
    } catch {
      toast.error("Failed to toggle workspace ban status.");
    }
  };

  const handleToggleUserBan = async (u: AdminUser) => {
    const action = u.isBanned ? "unban" : "ban";
    if (!confirm(`Are you sure you want to ${action} user "${u.name || u.email}"?`)) return;
    try {
      const res = await toggleUserBanApi(u.id, !u.isBanned);
      if (res.success) {
        toast.success(`User account is now ${u.isBanned ? "Active" : "Suspended"}`);
        fetchWorkspacesAndUsers();
      }
    } catch {
      toast.error("Failed to toggle user ban status.");
    }
  };

  // CDN purge trigger
  const handleCdnPurgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cdnValue.trim()) return;
    setCdnPurging(true);
    try {
      const res = await purgeCdnCacheApi({ type: cdnType, value: cdnValue });
      if (res.success) {
        toast.success(res.message);
        setCdnValue('/*');
      }
    } catch {
      toast.error("Failed to purge CDN cache.");
    } finally {
      setCdnPurging(false);
    }
  };

  // Filter workspaces & users based on query
  const filteredWorkspaces = workspaces.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute stats for traffic
  const totalRequests = trafficData.reduce((acc, curr) => acc + curr.ok + curr.clientErr + curr.serverErr, 0);
  const totalOk = trafficData.reduce((acc, curr) => acc + curr.ok, 0);
  const totalErr = trafficData.reduce((acc, curr) => acc + curr.clientErr + curr.serverErr, 0);
  const totalGigabytesSaved = (trafficData.reduce((acc, curr) => acc + curr.bytes, 0) / (1024 * 1024 * 1024)).toFixed(2);

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-8 w-full max-w-7xl mx-auto">
      {/* Page Heading */}
      <div className="flex flex-col gap-1">
        <h1 className="font-headings font-bold text-2xl text-text-light text-left">Admin Control Console</h1>
        <p className="text-text-muted text-xs text-left mt-1">Manage global enterprise contracts, system status events, user privileges and CDN configurations</p>
      </div>

      {/* Tab Navigation Controls */}
      <div className="flex border-b border-slate-800 gap-6 w-full -mt-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-4 text-sm font-semibold tracking-wide transition-all relative cursor-pointer ${
            activeTab === 'requests' ? 'text-indigo-400 font-bold' : 'text-text-muted hover:text-text-light'
          }`}
        >
          <span>Enterprise Requests</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-semibold text-text-muted">
            {requests.length}
          </span>
          {activeTab === 'requests' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full animate-in fade-in duration-200" />
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('workspaces')}
          className={`pb-4 text-sm font-semibold tracking-wide transition-all relative cursor-pointer ${
            activeTab === 'workspaces' ? 'text-indigo-400 font-bold' : 'text-text-muted hover:text-text-light'
          }`}
        >
          <span>User & Workspaces</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-semibold text-text-muted">
            {workspaces.length}
          </span>
          {activeTab === 'workspaces' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full animate-in fade-in duration-200" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('traffic')}
          className={`pb-4 text-sm font-semibold tracking-wide transition-all relative cursor-pointer ${
            activeTab === 'traffic' ? 'text-indigo-400 font-bold' : 'text-text-muted hover:text-text-light'
          }`}
        >
          <span>API Traffic Monitor</span>
          {activeTab === 'traffic' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full animate-in fade-in duration-200" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('cdn')}
          className={`pb-4 text-sm font-semibold tracking-wide transition-all relative cursor-pointer ${
            activeTab === 'cdn' ? 'text-indigo-400 font-bold' : 'text-text-muted hover:text-text-light'
          }`}
        >
          <span>CDN Edge Purger</span>
          {activeTab === 'cdn' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full animate-in fade-in duration-200" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('incidents')}
          className={`pb-4 text-sm font-semibold tracking-wide transition-all relative cursor-pointer ${
            activeTab === 'incidents' ? 'text-indigo-400 font-bold' : 'text-text-muted hover:text-text-light'
          }`}
        >
          <span>Status Incidents</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-semibold text-text-muted">
            {incidents.length}
          </span>
          {activeTab === 'incidents' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full animate-in fade-in duration-200" />
          )}
        </button>
      </div>

      {/* Tab Contents: Enterprise Requests */}
      {activeTab === 'requests' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="text-left">
              <h2 className="text-text-light font-bold text-lg">Inbound Enterprise Requests</h2>
              <p className="text-text-muted text-xs">Manage inquiries from custom enterprise clients</p>
            </div>
            <Button variant="bordered" onClick={fetchRequests} disabled={requestsLoading} className="border-slate-800 hover:bg-slate-900">
              <Icon icon="lucide:refresh-cw" className={requestsLoading ? "animate-spin" : ""} width={14} />
              <span className="ml-1.5">Refresh</span>
            </Button>
          </div>

          {requestsLoading ? (
            <div className="flex justify-center items-center py-20">
              <Icon icon="lucide:loader-2" className="animate-spin text-indigo-500" width={36} />
            </div>
          ) : requests.length === 0 ? (
            <div className="border border-slate-800 bg-[#111827] rounded-2xl p-12 text-center text-text-muted">
              <Icon icon="lucide:building-2" className="mx-auto text-text-muted/20 mb-3" width={40} />
              <p className="text-sm">No Enterprise requests found.</p>
            </div>
          ) : (
            <div className="border border-slate-800 bg-[#111827] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/40 text-text-muted/70 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">Client Info</th>
                      <th className="px-6 py-4">Workspace</th>
                      <th className="px-6 py-4">Required Storage</th>
                      <th className="px-6 py-4">Required Traffic</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm text-text-light">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm tracking-wide shrink-0">
                              {req.contactName ? req.contactName[0].toUpperCase() : '?'}
                            </div>
                            <div className="flex flex-col text-left min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-text-light text-sm truncate">{req.contactName}</span>
                                <a
                                  href={`mailto:${req.contactEmail}?subject=OptiDrive Enterprise Offer Details`}
                                  className="text-text-muted hover:text-indigo-400 transition-colors shrink-0"
                                >
                                  <Icon icon="lucide:mail" width={13} />
                                </a>
                              </div>
                              <span className="text-xs text-text-muted mt-0.5 truncate">{req.contactEmail}</span>
                              {req.companyName && (
                                <span className="text-[10px] text-indigo-400/80 font-medium uppercase tracking-wider mt-0.5 truncate">
                                  {req.companyName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-xs sm:text-sm text-text-light">{req.workspace?.name || "—"}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-xs text-text-light">
                          {formatQuotaText(req.expectedStorage)}
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-xs text-text-light">
                          {formatQuotaText(req.expectedTraffic)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            req.status === 'PENDING' 
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
                              : req.status === 'APPROVED'
                              ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                              : req.status === 'CONVERTED'
                              ? 'bg-slate-800/40 border-slate-700/50 text-text-muted'
                              : req.status === 'CONTACTED'
                              ? 'bg-sky-500/10 border-sky-500/25 text-sky-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                            {req.status === 'APPROVED' ? 'Offer Sent' : req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3.5">
                            {(req.status === "PENDING" || req.status === "APPROVED" || req.status === "CONTACTED") && (
                              <>
                                <button
                                  className="text-red-500 hover:text-red-400 bg-transparent border-0 hover:underline px-1 py-0.5 font-semibold text-xs cursor-pointer"
                                  onClick={() => handleRejectRequest(req.id)}
                                >
                                  Reject
                                </button>
                                <Button
                                  variant="accent"
                                  className="bg-indigo-650 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                                  onClick={() => handleOpenApproveModal(req)}
                                >
                                  {req.status === "APPROVED" ? "Update Quote" : "Send Quote"}
                                </Button>
                              </>
                            )}

                            {req.status === "APPROVED" && req.stripePaymentLink && (
                              <a
                                href={req.stripePaymentLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-350 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1.5 rounded-lg"
                              >
                                <Icon icon="lucide:external-link" width={12} />
                                <span>Pay Link</span>
                              </a>
                            )}

                            {req.status === "CONVERTED" && (
                              <span className="text-emerald-500/80 flex items-center gap-1 text-xs font-semibold">
                                <Icon icon="lucide:check-circle-2" className="text-emerald-500/70" width={16} />
                                <span>Completed</span>
                              </span>
                            )}
                            {req.status === "DECLINED" && (
                              <span className="text-red-500/70 flex items-center gap-1 text-xs font-semibold">
                                <Icon icon="lucide:ban" className="text-red-500/60" width={15} />
                                <span>Rejected</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: Users & Workspaces Manager */}
      {activeTab === 'workspaces' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-left">
              <h2 className="text-text-light font-bold text-lg">System Directories</h2>
              <p className="text-text-muted text-xs">Review workspace limits, storage consumption, and lock/ban accounts</p>
            </div>
            
            {/* Search and Sub-tabs */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Icon icon="lucide:search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" width={14} />
                <Input
                  variant="text"
                  placeholder={`Search ${managerSubTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#111827] border-slate-800 w-full"
                />
              </div>

              <div className="flex bg-[#111827] p-1 rounded-xl border border-slate-800 shrink-0">
                <button
                  onClick={() => { setManagerSubTab('workspaces'); setSearchQuery(''); }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    managerSubTab === 'workspaces' ? 'bg-indigo-650 text-white' : 'text-text-muted hover:text-text-light'
                  }`}
                >
                  Workspaces
                </button>
                <button
                  onClick={() => { setManagerSubTab('users'); setSearchQuery(''); }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    managerSubTab === 'users' ? 'bg-indigo-650 text-white' : 'text-text-muted hover:text-text-light'
                  }`}
                >
                  Users
                </button>
              </div>
              
              <Button variant="bordered" onClick={fetchWorkspacesAndUsers} disabled={managerLoading} className="border-slate-800 hover:bg-slate-900 shrink-0">
                <Icon icon="lucide:refresh-cw" className={managerLoading ? "animate-spin" : ""} width={14} />
              </Button>
            </div>
          </div>

          {managerLoading ? (
            <div className="flex justify-center items-center py-20">
              <Icon icon="lucide:loader-2" className="animate-spin text-indigo-500" width={36} />
            </div>
          ) : managerSubTab === 'workspaces' ? (
            /* Workspaces list */
            filteredWorkspaces.length === 0 ? (
              <div className="border border-slate-800 bg-[#111827] rounded-2xl p-12 text-center text-text-muted">
                <p className="text-sm">No workspaces match your query.</p>
              </div>
            ) : (
              <div className="border border-slate-800 bg-[#111827] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/40 text-text-muted/70 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                        <th className="px-6 py-4">Workspace Name</th>
                        <th className="px-6 py-4">Plan / Status</th>
                        <th className="px-6 py-4">Storage Usage</th>
                        <th className="px-6 py-4">Traffic (Bandwidth)</th>
                        <th className="px-6 py-4">Storage Bonus</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-sm text-text-light">
                      {filteredWorkspaces.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-900/10 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-text-light text-sm">{w.name}</span>
                              <span className="text-[11px] text-text-muted mt-0.5">slug: <code className="font-mono text-indigo-400">{w.slug}</code></span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                w.plan === 'ENTERPRISE' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                w.plan === 'PRO' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                'bg-slate-800 border-slate-700 text-text-muted'
                              }`}>
                                {w.plan}
                              </span>
                              {w.isBanned ? (
                                <span className="bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded">
                                  SUSPENDED
                                </span>
                              ) : (
                                <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-text-light">{formatBytes(w.storageUsed)}</span>
                              <span className="text-[10px] text-text-muted mt-0.5">
                                limit: {w.plan === 'FREE' ? '1 GB' : w.plan === 'PRO' ? '50 GB' : formatBytes(w.enterpriseStorageBytes || '0')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-text-light">{formatBytes(w.bandwidthUsed)}</span>
                              <span className="text-[10px] text-text-muted mt-0.5">
                                limit: {w.plan === 'FREE' ? '10 GB' : w.plan === 'PRO' ? '500 GB' : formatBytes(w.enterpriseBandwidthBytes || '0')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-text-light font-bold">
                            {Number(w.storageBonusBytes) > 0 ? (
                              <span className="text-indigo-400">+{formatBytes(w.storageBonusBytes)}</span>
                            ) : (
                              <span className="text-text-muted">None</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end items-center gap-3">
                              <button
                                onClick={() => handleOpenBonusModal(w)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-xs font-semibold text-text-light cursor-pointer"
                                title="Grant Custom Storage Bonus"
                              >
                                <Icon icon="lucide:gift" width={13} />
                                <span>Bonus</span>
                              </button>
                              <button
                                onClick={() => handleToggleWorkspaceBan(w)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                                  w.isBanned
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                    : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                                }`}
                              >
                                {w.isBanned ? "Unsuspend" : "Suspend"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            /* Users list */
            filteredUsers.length === 0 ? (
              <div className="border border-slate-800 bg-[#111827] rounded-2xl p-12 text-center text-text-muted">
                <p className="text-sm">No users match your query.</p>
              </div>
            ) : (
              <div className="border border-slate-800 bg-[#111827] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/40 text-text-muted/70 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">User ID</th>
                        <th className="px-6 py-4">Registered Date</th>
                        <th className="px-6 py-4">Account Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-sm text-text-light">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-900/10 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3 text-left">
                              <div className="size-9 rounded-full bg-slate-800 text-text-muted flex items-center justify-center font-bold text-sm tracking-wide shrink-0">
                                {u.name ? u.name[0].toUpperCase() : u.email[0].toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-text-light text-sm truncate">{u.name || "Anonymous User"}</span>
                                <span className="text-xs text-text-muted truncate">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-indigo-400">
                            {u.id}
                          </td>
                          <td className="px-6 py-4 text-text-muted text-xs">
                            {new Date(u.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}
                          </td>
                          <td className="px-6 py-4">
                            {u.isBanned ? (
                              <span className="bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                                SUSPENDED
                              </span>
                            ) : (
                              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                                ACTIVE
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleToggleUserBan(u)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                                u.isBanned
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                  : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                              }`}
                            >
                              {u.isBanned ? "Unsuspend Account" : "Suspend Account"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Tab Contents: API Traffic Monitor */}
      {activeTab === 'traffic' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="text-left">
              <h2 className="text-text-light font-bold text-lg">Live API Traffic Monitor</h2>
              <p className="text-text-muted text-xs">Monitor API transactions, CDN caching performance and response distributions (last 24 hours)</p>
            </div>
            <Button variant="bordered" onClick={fetchTrafficAnalytics} disabled={trafficLoading} className="border-slate-800 hover:bg-slate-900">
              <Icon icon="lucide:refresh-cw" className={trafficLoading ? "animate-spin" : ""} width={14} />
              <span className="ml-1.5">Refresh Data</span>
            </Button>
          </div>

          {/* Aggregate Info Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-slate-800 bg-[#111827] rounded-xl p-5 text-left flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total API Requests</span>
                <h3 className="text-2xl font-black text-text-light mt-1">{totalRequests}</h3>
              </div>
              <div className="size-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Icon icon="lucide:activity" width={20} />
              </div>
            </div>

            <div className="border border-slate-800 bg-[#111827] rounded-xl p-5 text-left flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Successful Requests</span>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">{totalOk}</h3>
              </div>
              <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Icon icon="lucide:check-circle" width={20} />
              </div>
            </div>

            <div className="border border-slate-800 bg-[#111827] rounded-xl p-5 text-left flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Errors (4xx/5xx)</span>
                <h3 className="text-2xl font-black text-red-400 mt-1">{totalErr}</h3>
              </div>
              <div className="size-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                <Icon icon="lucide:shield-alert" width={20} />
              </div>
            </div>

            <div className="border border-slate-800 bg-[#111827] rounded-xl p-5 text-left flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Traffic Saved</span>
                <h3 className="text-2xl font-black text-indigo-400 mt-1">{totalGigabytesSaved} GB</h3>
              </div>
              <div className="size-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Icon icon="lucide:database" width={20} />
              </div>
            </div>
          </div>

          {trafficLoading ? (
            <div className="flex justify-center items-center py-20">
              <Icon icon="lucide:loader-2" className="animate-spin text-indigo-500" width={36} />
            </div>
          ) : trafficData.length === 0 ? (
            <div className="border border-slate-800 bg-[#111827] rounded-2xl p-12 text-center text-text-muted">
              <p className="text-sm">No traffic data log events in the database.</p>
            </div>
          ) : (
            /* Custom Traffic Metric SVG Bar Chart */
            <div className="border border-slate-800 bg-[#111827] rounded-2xl p-6 shadow-xl flex flex-col gap-4 text-left">
              <h3 className="font-semibold text-text-light text-sm">Response Distribution History (Hourly Chart)</h3>
              
              <div className="h-64 w-full flex items-end gap-1.5 sm:gap-2.5 pt-6 border-b border-slate-800 pb-1.5 overflow-x-auto scrollbar-none">
                {trafficData.map((d, index) => {
                  const itemTotal = d.ok + d.clientErr + d.serverErr;
                  // Max requests for scaling height
                  const maxVal = Math.max(...trafficData.map(val => val.ok + val.clientErr + val.serverErr), 1);
                  const heightPercent = (itemTotal / maxVal) * 80; // max 80% height

                  const okPercent = itemTotal > 0 ? (d.ok / itemTotal) * 100 : 0;
                  const errPercent = itemTotal > 0 ? ((d.clientErr + d.serverErr) / itemTotal) * 100 : 0;

                  return (
                    <div key={index} className="flex-1 min-w-[32px] flex flex-col items-center gap-2 group h-full justify-end">
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 bg-slate-900 border border-slate-800 rounded-lg p-2.5 absolute -translate-y-24 shadow-xl z-20 text-[10px] pointer-events-none transition-all flex flex-col gap-1">
                        <span className="font-bold text-text-light">{d.time}</span>
                        <span className="text-emerald-400">Success: {d.ok} requests</span>
                        <span className="text-red-400">Errors: {d.clientErr + d.serverErr} requests</span>
                        <span className="text-indigo-400">Saved: {(d.bytes / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>

                      {/* Stacked Bar */}
                      <div 
                        className="w-full rounded-t-md overflow-hidden bg-slate-800 hover:bg-slate-750 transition-all flex flex-col justify-end"
                        style={{ height: `${Math.max(heightPercent, 3)}%` }}
                      >
                        {errPercent > 0 && <div className="bg-red-500 w-full" style={{ height: `${errPercent}%` }} />}
                        {okPercent > 0 && <div className="bg-indigo-500 w-full" style={{ height: `${okPercent}%` }} />}
                      </div>

                      <span className="text-[9px] font-mono text-text-muted mt-1 rotate-45 sm:rotate-0">{d.time}</span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div className="flex gap-6 justify-center text-xs mt-3">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded bg-indigo-500" />
                  <span className="text-text-muted">Successful requests (2xx)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded bg-red-500" />
                  <span className="text-text-muted">Errors & blocks (4xx / 5xx)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: CDN Cache Purger */}
      {activeTab === 'cdn' && (
        <div className="flex flex-col gap-6 max-w-xl mx-auto w-full">
          <div className="text-left border-b border-slate-800 pb-5">
            <h2 className="text-text-light font-bold text-lg">CDN Edge Cache Controller</h2>
            <p className="text-text-muted text-xs mt-1">Force CDN cache invalidation for updated images or static code assets</p>
          </div>

          <div className="border border-slate-800 bg-[#111827] rounded-2xl p-6 shadow-xl text-left">
            <form onSubmit={handleCdnPurgeSubmit} className="flex flex-col gap-5">
              {/* Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-text-light text-xs font-semibold">Purge Type</label>
                <div className="grid grid-cols-2 gap-3 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { setCdnType('path'); setCdnValue('/*'); }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      cdnType === 'path' ? 'bg-indigo-650 text-white' : 'text-text-muted hover:text-text-light'
                    }`}
                  >
                    Purge by Path
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCdnType('tag'); setCdnValue(''); }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      cdnType === 'tag' ? 'bg-indigo-650 text-white' : 'text-text-muted hover:text-text-light'
                    }`}
                  >
                    Purge by Cache Tag
                  </button>
                </div>
              </div>

              {/* Value Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-text-light text-xs font-semibold">
                  {cdnType === 'path' ? 'Cache Invalidation Path' : 'CDN Cache Tag'}
                </label>
                <Input
                  variant="text"
                  required
                  placeholder={cdnType === 'path' ? 'e.g. /media/*' : 'e.g. user-avatar-123'}
                  value={cdnValue}
                  onChange={(e) => setCdnValue(e.target.value)}
                  className="w-full bg-slate-900 border-slate-800 font-mono text-sm"
                />
                <p className="text-[10px] text-text-muted leading-relaxed mt-1">
                  {cdnType === 'path' 
                    ? 'Invalidates cache for matching URL path. Use wildcard /* at the end to match directory resources.'
                    : 'Invalidates assets tagged with matching key. Highly efficient for cache clearing without path restrictions.'}
                </p>
              </div>

              <div className="border-t border-slate-800 pt-4 mt-2">
                <Button
                  type="submit"
                  variant="accent"
                  disabled={cdnPurging || !cdnValue.trim()}
                  className="w-full bg-indigo-650 hover:bg-indigo-700 text-white py-3 flex items-center justify-center gap-2 rounded-xl"
                >
                  {cdnPurging ? (
                    <>
                      <Icon icon="lucide:loader-2" className="animate-spin" width={16} />
                      <span>Purging Edge CDN Cache...</span>
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:trash-2" width={15} />
                      <span>Purge Edge Cache</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab Contents: Incidents Management */}
      {activeTab === 'incidents' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="text-left">
              <h2 className="text-text-light font-bold text-lg">System Events & Incidents</h2>
              <p className="text-text-muted text-xs">Announce outages, updates, and maintenance status</p>
            </div>
            <div className="flex gap-3">
              <Button variant="bordered" onClick={fetchIncidents} disabled={incidentsLoading} className="border-slate-800 hover:bg-slate-900">
                <Icon icon="lucide:refresh-cw" className={incidentsLoading ? "animate-spin" : ""} width={14} />
              </Button>
              <Button variant="accent" onClick={() => handleOpenIncidentModal(null)} className="bg-indigo-650 hover:bg-indigo-700 text-white">
                <Icon icon="lucide:plus" width={14} />
                <span>New Incident</span>
              </Button>
            </div>
          </div>

          {incidentsLoading ? (
            <div className="flex justify-center items-center py-20">
              <Icon icon="lucide:loader-2" className="animate-spin text-indigo-500" width={36} />
            </div>
          ) : incidents.length === 0 ? (
            <div className="border border-slate-800 bg-[#111827] rounded-2xl p-12 text-center text-text-muted">
              <Icon icon="lucide:check-circle" className="mx-auto text-success/20 mb-3" width={40} />
              <p className="text-sm">All systems clear. No incidents reported.</p>
            </div>
          ) : (
            <div className="border border-slate-800 bg-[#111827] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/40 text-text-muted/70 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">Title</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Active Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-sm text-text-light">
                    {incidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-6 py-4 font-semibold text-text-light">{inc.title}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            inc.status === 'RESOLVED' 
                              ? 'bg-success/15 border-success/20 text-success' 
                              : inc.status === 'MONITORING'
                              ? 'bg-blue-500/15 border-blue-500/20 text-blue-400'
                              : 'bg-error/15 border-error/20 text-error'
                          }`}>
                            {inc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-text-muted max-w-xs truncate" title={inc.description}>
                          {inc.description}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inc.isActive ? 'bg-error/20 text-error animate-pulse' : 'bg-slate-850 text-text-muted border border-slate-800'}`}>
                            {inc.isActive ? 'Active Outage' : 'Closed Event'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleOpenIncidentModal(inc)}
                              className="size-8 rounded-lg border border-slate-800 flex items-center justify-center hover:bg-slate-900 text-text-muted hover:text-text-light transition-colors cursor-pointer"
                            >
                              <Icon icon="lucide:edit-2" width={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteIncident(inc.id)}
                              className="size-8 rounded-lg border border-red-950/40 flex items-center justify-center hover:bg-red-950/20 text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <Icon icon="lucide:trash" width={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approve Enterprise Offer Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Approve Enterprise Limits"
        icon="lucide:check-circle"
        iconColor="text-indigo-400"
        iconBg="bg-indigo-400/15"
      >
        <form onSubmit={handleApproveSubmit} className="flex flex-col gap-4 text-left">
          <div>
            <h4 className="text-text-light font-semibold text-sm">
              Approved limits for {selectedRequest?.workspace?.name}
            </h4>
            <p className="text-text-muted text-xs mt-1">
              Client requested: <strong>{formatQuotaText(selectedRequest?.expectedStorage)}</strong> and <strong>{formatQuotaText(selectedRequest?.expectedTraffic)}</strong>.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">Storage Limit (GB)</label>
            <Input
              variant="number"
              value={limitsForm.storageGb}
              onChange={(e) => setLimitsForm((prev) => ({ ...prev, storageGb: Number(e.target.value) }))}
              required
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">Monthly Traffic Limit (GB)</label>
            <Input
              variant="number"
              value={limitsForm.bandwidthGb}
              onChange={(e) => setLimitsForm((prev) => ({ ...prev, bandwidthGb: Number(e.target.value) }))}
              required
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">Monthly Optimizations Limit</label>
            <Input
              variant="number"
              value={limitsForm.optimizations}
              onChange={(e) => setLimitsForm((prev) => ({ ...prev, optimizations: Number(e.target.value) }))}
              required
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">Monthly Price (USD)</label>
            <Input
              variant="number"
              value={limitsForm.price}
              onChange={(e) => setLimitsForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
              required
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">Stripe Coupon / Promo Code (Optional)</label>
            <Input
              variant="text"
              placeholder="e.g. 50OFF"
              value={limitsForm.couponCode}
              onChange={(e) => setLimitsForm((prev) => ({ ...prev, couponCode: e.target.value }))}
              className="w-full"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-800 mt-2">
            <Button type="button" variant="bordered" onClick={() => setIsApproveModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="accent" className="flex-1 bg-indigo-650 hover:bg-indigo-700" disabled={approveLoading}>
              {approveLoading ? "Processing..." : "Approve & Send Quote"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Incident management Modal */}
      <Modal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        title={selectedIncident ? "Edit Incident Status" : "Create New Status Incident"}
        icon={selectedIncident ? "lucide:edit-2" : "lucide:plus"}
        iconColor="text-indigo-400"
        iconBg="bg-indigo-400/15"
      >
        <form onSubmit={handleIncidentSubmit} className="flex flex-col gap-4 text-left">
          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">Incident Title</label>
            <Input
              variant="text"
              required
              placeholder="e.g. API Gateway Slowdown"
              value={incidentForm.title}
              onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">Severity / Status</label>
            <Input
              variant="select"
              value={incidentForm.status}
              onChange={(val) => setIncidentForm({ ...incidentForm, status: val })}
              options={[
                { value: 'INVESTIGATING', label: 'Investigating' },
                { value: 'MONITORING', label: 'Monitoring' },
                { value: 'RESOLVED', label: 'Resolved' },
              ]}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">Description</label>
            <textarea
              required
              rows={4}
              placeholder="Provide event details, updates or resolution notes..."
              value={incidentForm.description}
              onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-bg px-3 py-2 text-sm text-text-light outline-none focus:border-accent resize-none transition-colors"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-text-light">Active Outage</span>
              <p className="text-[10px] text-text-muted">If checked, the Status Page will indicate an ongoing service alert.</p>
            </div>
            <Switch
              initialChecked={incidentForm.isActive}
              onChange={(checked) => setIncidentForm({ ...incidentForm, isActive: checked })}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-800 mt-2">
            <Button type="button" variant="bordered" onClick={() => setIsIncidentModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="accent" className="flex-1 hover:bg-indigo-700" disabled={incidentSubmitLoading}>
              {incidentSubmitLoading ? "Processing..." : "Save Incident"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Workspace Bonus Grant Modal */}
      <Modal
        isOpen={isBonusModalOpen}
        onClose={() => setIsBonusModalOpen(false)}
        title="Manage Storage Bonus"
        icon="lucide:gift"
        iconColor="text-indigo-400"
        iconBg="bg-indigo-400/15"
      >
        <form onSubmit={handleBonusSubmit} className="flex flex-col gap-4 text-left">
          <div>
            <h4 className="text-text-light font-semibold text-sm">
              Grant Storage Bonus for workspace &quot;{selectedBonusWorkspace?.name}&quot;
            </h4>
            <p className="text-text-muted text-xs mt-1">
              Bonuses add directly to the workspace storage limits, active for any plan.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">Bonus Storage Volume (GB)</label>
            <Input
              variant="number"
              value={bonusForm.bonusGb}
              onChange={(e) => setBonusForm((prev) => ({ ...prev, bonusGb: Number(e.target.value) }))}
              required
              min={0}
              className="w-full"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-800 mt-2">
            <Button type="button" variant="bordered" onClick={() => setIsBonusModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="accent" className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white" disabled={bonusSubmitLoading}>
              {bonusSubmitLoading ? "Saving..." : "Apply Bonus"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
