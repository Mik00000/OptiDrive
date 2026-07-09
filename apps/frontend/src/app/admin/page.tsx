"use client";

import { useState, useEffect } from "react";
import PageHeading from "@/components/PageHeading";
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
  AdminEnterpriseRequest,
  AdminIncident,
} from "@/features/admin/api";
import { toast } from "react-toastify";

export default function AdminConsolePage() {
  const [activeTab, setActiveTab] = useState<'requests' | 'incidents'>('requests');
  
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

  useEffect(() => {
    fetchRequests();
    fetchIncidents();
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
    } catch (err: any) {
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
        // Edit Incident
        const res = await updateIncidentApi(selectedIncident.id, incidentForm);
        if (res.success) {
          toast.success("Incident updated successfully!");
          setIsIncidentModalOpen(false);
          fetchIncidents();
        }
      } else {
        // Create Incident
        const res = await createIncidentApi(incidentForm);
        if (res.success) {
          toast.success("New incident created!");
          setIsIncidentModalOpen(false);
          fetchIncidents();
        }
      }
    } catch (err: any) {
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
    } catch (err) {
      toast.error("Failed to delete incident.");
    }
  };

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-8 w-full max-w-7xl mx-auto">
      {/* Page Heading & Tabs selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="font-headings font-bold text-2xl text-text-light">Admin Control Console</h1>
          <p className="text-text-muted text-xs mt-1">Manage global enterprise contracts and platform status events</p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-[#0c1220] border border-slate-850 p-1.5 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'requests' ? 'bg-indigo-650 text-white shadow-md shadow-indigo-650/15' : 'text-text-muted hover:text-text-light'
            }`}
          >
            <Icon icon="lucide:building-2" width={14} />
            <span>Enterprise Requests ({requests.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'incidents' ? 'bg-indigo-650 text-white shadow-md shadow-indigo-650/15' : 'text-text-muted hover:text-text-light'
            }`}
          >
            <Icon icon="lucide:activity" width={14} />
            <span>Status Incidents ({incidents.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Contents: Enterprise Requests */}
      {activeTab === 'requests' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
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
              <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={36} />
            </div>
          ) : requests.length === 0 ? (
            <div className="border border-slate-800 bg-[#0c1220] rounded-2xl p-12 text-center text-text-muted">
              <Icon icon="lucide:building-2" className="mx-auto text-text-muted/20 mb-3" width={40} />
              <p className="text-sm">No Enterprise requests found.</p>
            </div>
          ) : (
            <div className="border border-slate-800 bg-[#0c1220] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/40 text-text-muted text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">Client Info</th>
                      <th className="px-6 py-4">Workspace</th>
                      <th className="px-6 py-4">Required Storage</th>
                      <th className="px-6 py-4">Required Traffic</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-sm text-text-light">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-text-light flex items-center gap-1.5">
                            <span>{req.contactName}</span>
                            <a
                              href={`mailto:${req.contactEmail}?subject=OptiDrive Enterprise Offer Details`}
                              className="text-text-muted hover:text-indigo-400 transition-colors"
                            >
                              <Icon icon="lucide:mail" width={14} />
                            </a>
                          </div>
                          <div className="text-xs text-text-muted">{req.contactEmail}</div>
                          {req.companyName && (
                            <div className="text-[10px] text-indigo-400 font-semibold uppercase mt-1">
                              {req.companyName}
                            </div>
                          )}
                          {req.status === "APPROVED" && req.stripePaymentLink && (
                            <a
                              href={req.stripePaymentLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 text-[10px] flex items-center gap-1 mt-1 font-semibold"
                            >
                              <Icon icon="lucide:external-link" width={11} />
                              <span>Stripe Payment Link</span>
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-xs sm:text-sm">{req.workspace?.name || "—"}</div>
                          <div className="text-[10px] text-text-muted uppercase">
                            Plan: {req.workspace?.plan || "UNKNOWN"}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-xs">{req.expectedStorage}</td>
                        <td className="px-6 py-4 font-mono font-semibold text-xs">{req.expectedTraffic}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            req.status === 'PENDING' 
                              ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                              : req.status === 'APPROVED'
                              ? 'bg-purple-500/10 border-purple-500/20 text-purple-500'
                              : req.status === 'CONVERTED'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                              : 'bg-red-500/10 border-red-500/20 text-red-500'
                          }`}>
                            {req.status === 'APPROVED' ? 'Offer Sent' : req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {req.status === "PENDING" || req.status === "APPROVED" ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="bordered"
                                className="text-red-400 border-red-500/10 hover:bg-red-500/5 px-2.5 py-1.5 rounded-lg text-xs"
                                onClick={() => handleRejectRequest(req.id)}
                              >
                                Reject
                              </Button>
                              <Button
                                variant="accent"
                                className="bg-indigo-650 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs"
                                onClick={() => handleOpenApproveModal(req)}
                              >
                                {req.status === "APPROVED" ? "Update Quote" : "Send Quote"}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-text-muted text-xs font-semibold">—</span>
                          )}
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

      {/* Tab Contents: Incidents Management */}
      {activeTab === 'incidents' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
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
              <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={36} />
            </div>
          ) : incidents.length === 0 ? (
            <div className="border border-slate-800 bg-[#0c1220] rounded-2xl p-12 text-center text-text-muted">
              <Icon icon="lucide:check-circle" className="mx-auto text-success/20 mb-3" width={40} />
              <p className="text-sm">All systems clear. No incidents reported.</p>
            </div>
          ) : (
            <div className="border border-slate-800 bg-[#0c1220] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/40 text-text-muted text-xs font-semibold uppercase tracking-wider">
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
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inc.isActive ? 'bg-error/20 text-error animate-pulse' : 'bg-slate-800 text-text-muted'}`}>
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
              Client requested: <strong>{selectedRequest?.expectedStorage}</strong> and <strong>{selectedRequest?.expectedTraffic}</strong>.
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
            <Button type="submit" variant="accent" className="flex-1 bg-indigo-650 hover:bg-indigo-700" disabled={incidentSubmitLoading}>
              {incidentSubmitLoading ? "Processing..." : "Save Incident"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
