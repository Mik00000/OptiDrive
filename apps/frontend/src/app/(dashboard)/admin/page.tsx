"use client";

import { useState, useEffect } from "react";
import PageHeading from "@/components/PageHeading";
import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Inputs";
import { Modal } from "@/components/Modal";
import {
  getAdminEnterpriseRequestsApi,
  approveEnterpriseRequestApi,
  rejectEnterpriseRequestApi,
  AdminEnterpriseRequest,
} from "@/features/admin/api";
import { toast } from "react-toastify";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AdminEnterpriseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  
  // States for Approve Modal
  const [selectedRequest, setSelectedRequest] = useState<AdminEnterpriseRequest | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [limitsForm, setLimitsForm] = useState({
    storageGb: 250,
    bandwidthGb: 2000,
    optimizations: 100000,
    price: 150,
  });

  const isAdmin = user?.email === 'mikjarkov@gmail.com' || user?.email?.endsWith('@optidrive.app') || user?.email === 'admin@optidrive.app';

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminEnterpriseRequestsApi();
      setRequests(data);
      setIsForbidden(false);
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 403) {
        setIsForbidden(true);
      } else {
        toast.error("Failed to load enterprise requests.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (!isAdmin) {
        setIsForbidden(true);
        setIsLoading(false);
      } else {
        fetchRequests();
      }
    }
  }, [user]);

  const handleOpenApproveModal = (req: AdminEnterpriseRequest) => {
    setSelectedRequest(req);
    
    // Спробуємо розпарсити очікувані значення із запиту
    let parsedStorage = 250;
    let parsedTraffic = 2000;
    
    // Простий парсинг чисел із тексту запиту (напр. "500 GB" -> 500)
    const storageMatch = req.expectedStorage.match(/(\d+)/);
    if (storageMatch) parsedStorage = parseInt(storageMatch[1]);
    
    const trafficMatch = req.expectedTraffic.match(/(\d+)/);
    if (trafficMatch) parsedTraffic = parseInt(trafficMatch[1]);

    // Якщо користувач ввів ТБ, переводимо в ГБ
    if (req.expectedStorage.toLowerCase().includes("tb") || req.expectedStorage.toLowerCase().includes("тб")) {
      parsedStorage *= 1024;
    }
    if (req.expectedTraffic.toLowerCase().includes("tb") || req.expectedTraffic.toLowerCase().includes("тб")) {
      parsedTraffic *= 1024;
    }

    setLimitsForm({
      storageGb: parsedStorage,
      bandwidthGb: parsedTraffic,
      optimizations: parsedStorage >= 1000 ? 500000 : 100000, // автоматична оцінка
      price: parsedStorage >= 1024 ? 300 : 150, // автоматична оцінка ціни
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
      });

      if (res.success) {
        toast.success("Enterprise request approved and checkout session created!");
        setIsApproveModalOpen(false);
        fetchRequests();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to approve request.");
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this request?")) return;
    
    try {
      const res = await rejectEnterpriseRequestApi(id);
      if (res.success) {
        toast.info("Request rejected.");
        fetchRequests();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to reject request.");
    }
  };

  if (isForbidden) {
    return (
      <section className="dashboard-page flex flex-col items-center justify-center p-8 min-h-[60vh] text-center">
        <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center rounded-2xl mb-4">
          <Icon icon="lucide:shield-alert" width={32} />
        </div>
        <h2 className="text-xl font-bold text-text-light mb-2">Access Denied</h2>
        <p className="text-text-muted text-sm max-w-md">
          You must be an administrator to view the Enterprise Request management dashboard.
        </p>
      </section>
    );
  }

  return (
    <section className="dashboard-page relative">
      <PageHeading title="Admin Panel — Enterprise Requests" />

      <div className="p-4 lg:p-8 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-text-light font-bold text-lg">Active Requests</h2>
            <p className="text-text-muted text-xs">Manage inbound quotes and custom plan requests</p>
          </div>
          <Button variant="bordered" onClick={fetchRequests} disabled={isLoading}>
            <Icon icon="lucide:refresh-cw" className={isLoading ? "animate-spin" : ""} width={14} />
            <span className="ml-1.5">Refresh</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={36} />
          </div>
        ) : requests.length === 0 ? (
          <div className="border border-border bg-card rounded-2xl p-12 text-center text-text-muted">
            <Icon icon="lucide:building-2" className="mx-auto text-text-muted/30 mb-3" width={40} />
            <p className="text-sm">No Enterprise requests found.</p>
          </div>
        ) : (
          <div className="border border-border bg-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-bg/50 text-text-muted text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Client Info</th>
                    <th className="px-6 py-4">Workspace</th>
                    <th className="px-6 py-4">Requested Storage</th>
                    <th className="px-6 py-4">Requested Traffic</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm text-text-light">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-bg/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-text-light flex items-center gap-1.5">
                          <span>{req.contactName}</span>
                          <a
                            href={`mailto:${req.contactEmail}?subject=OptiDrive Enterprise Offer Details`}
                            title={`Quick email to ${req.contactName}`}
                            className="text-text-muted hover:text-indigo-400 transition-colors ml-1"
                          >
                            <Icon icon="lucide:mail" width={14} />
                          </a>
                        </div>
                        <div className="text-xs text-text-muted">{req.contactEmail}</div>
                        {req.companyName && (
                          <div className="text-[10px] text-indigo-400 font-medium uppercase mt-0.5">
                            {req.companyName}
                          </div>
                        )}
                        {req.status === "APPROVED" && req.stripePaymentLink && (
                          <div className="mt-1 flex items-center gap-1">
                            <a
                              href={req.stripePaymentLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 hover:underline text-[10px] flex items-center gap-1 font-semibold"
                            >
                              <Icon icon="lucide:external-link" width={11} />
                              <span>Payment Link</span>
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{req.workspace?.name || "—"}</div>
                        <div className="text-[10px] text-text-muted uppercase">
                          Current Plan: {req.workspace?.plan || "UNKNOWN"}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold">{req.expectedStorage}</td>
                      <td className="px-6 py-4 font-mono font-semibold">{req.expectedTraffic}</td>
                      <td className="px-6 py-4">
                        {req.status === "PENDING" && (
                          <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded text-xs font-medium">
                            Pending
                          </span>
                        )}
                        {req.status === "APPROVED" && (
                          <span className="bg-purple-500/10 text-purple-500 border border-purple-500/20 px-2 py-0.5 rounded text-xs font-medium">
                            Quote Sent
                          </span>
                        )}
                        {req.status === "CONTACTED" && (
                          <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-medium">
                            Contacted
                          </span>
                        )}
                        {req.status === "CONVERTED" && (
                          <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded text-xs font-medium">
                            Approved
                          </span>
                        )}
                        {req.status === "DECLINED" && (
                          <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-xs font-medium">
                            Declined
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {req.status === "PENDING" || req.status === "CONTACTED" || req.status === "APPROVED" ? (
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="bordered"
                              className="text-red-400 border-red-500/20 hover:bg-red-500/10"
                              onClick={() => handleReject(req.id)}
                            >
                              Reject
                            </Button>
                            <Button
                              variant="accent"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => handleOpenApproveModal(req)}
                            >
                              {req.status === "APPROVED" ? "Edit Quote" : "Approve"}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
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

      {/* Approve & Set Custom Limits Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Approve Enterprise & Set Limits"
        icon="lucide:check-circle"
        iconColor="text-indigo-400"
        iconBg="bg-indigo-400/15"
      >
        <form onSubmit={handleApproveSubmit} className="flex flex-col gap-4">
          <div>
            <h4 className="text-text-light font-semibold text-sm">
              Limits for {selectedRequest?.workspace?.name}
            </h4>
            <p className="text-text-muted text-xs mt-1">
              Client requested: <strong>{selectedRequest?.expectedStorage}</strong> storage and{" "}
              <strong>{selectedRequest?.expectedTraffic}</strong> traffic.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">Storage Limit (GB)</label>
            <Input
              type="number"
              value={limitsForm.storageGb}
              onChange={(e) => setLimitsForm((prev) => ({ ...prev, storageGb: Number(e.target.value) }))}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">Monthly Traffic Limit (GB)</label>
            <Input
              type="number"
              value={limitsForm.bandwidthGb}
              onChange={(e) => setLimitsForm((prev) => ({ ...prev, bandwidthGb: Number(e.target.value) }))}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">Monthly Optimizations Limit</label>
            <Input
              type="number"
              value={limitsForm.optimizations}
              onChange={(e) => setLimitsForm((prev) => ({ ...prev, optimizations: Number(e.target.value) }))}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">Monthly Price (USD)</label>
            <Input
              type="number"
              value={limitsForm.price}
              onChange={(e) => setLimitsForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
              required
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-border mt-2">
            <Button type="button" variant="bordered" onClick={() => setIsApproveModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="accent" className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={approveLoading}>
              {approveLoading ? "Processing..." : "Approve & Send Quote"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
