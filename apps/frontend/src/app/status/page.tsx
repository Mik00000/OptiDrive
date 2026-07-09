"use client";

import { useEffect, useState } from 'react';
import LandingNav from '@/components/LandingNav';
import Footer from '@/components/Footer';
import { Icon } from '@iconify/react';

interface Incident {
  id: string;
  createdAt: string;
  title: string;
  status: string;
  description: string;
  isActive: boolean;
}

interface UptimeDay {
  date: string;
  uptimePercent: number;
}

export default function StatusPage() {
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<'operational' | 'degraded' | 'major_outage'>('operational');
  const [services, setServices] = useState({
    api_gateway: { status: 'checking', latency: '0ms' },
    compression_engine: { status: 'checking', latency: '0ms' },
    asset_cdn: { status: 'checking', latency: '0ms' },
    dashboard: { status: 'operational', latency: '3ms' },
  });
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [uptimeHistory, setUptimeHistory] = useState<{
    api_gateway: UptimeDay[];
    compression_engine: UptimeDay[];
    asset_cdn: UptimeDay[];
    dashboard: UptimeDay[];
  }>({
    api_gateway: [],
    compression_engine: [],
    asset_cdn: [],
    dashboard: [],
  });

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const startTime = performance.now();
      
      const response = await fetch('/api/public/status');
      const data = await response.json();
      
      const endTime = performance.now();
      const gatewayLatency = `${Math.round(endTime - startTime)}ms`;

      // Check CDN latency separately by pinging static assets
      const cdnStart = performance.now();
      let cdnStatus = 'operational';
      try {
        await fetch('/images/logo.svg', { method: 'HEAD' });
      } catch (err) {
        cdnStatus = 'degraded';
      }
      const cdnEnd = performance.now();
      const cdnLatency = `${Math.round(cdnEnd - cdnStart)}ms`;

      if (data.success) {
        setSystemStatus(data.status);
        setServices({
          api_gateway: { status: data.services.api_gateway, latency: gatewayLatency },
          compression_engine: { status: data.services.compression_engine, latency: gatewayLatency },
          asset_cdn: { status: cdnStatus, latency: cdnLatency },
          dashboard: { status: 'operational', latency: '3ms' },
        });
        setIncidents(data.incidents);
        setUptimeHistory(data.uptimeHistory);
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      setSystemStatus('major_outage');
      setServices({
        api_gateway: { status: 'outage', latency: '—' },
        compression_engine: { status: 'outage', latency: '—' },
        asset_cdn: { status: 'degraded', latency: '—' },
        dashboard: { status: 'operational', latency: '3ms' },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const renderUptimeBars = (history: UptimeDay[], status: string) => {
    if (!history || history.length === 0) {
      return Array.from({ length: 35 }).map((_, idx) => (
        <div
          key={idx}
          className="h-6 w-1 rounded-full bg-slate-800 opacity-60 animate-pulse"
        />
      ));
    }

    return history.map((day, idx) => {
      let barColor = 'bg-success';
      let formattedPercent = `${day.uptimePercent.toFixed(2)}%`;
      let tooltip = `${day.date}: ${formattedPercent} uptime`;

      if (day.uptimePercent < 95.0) {
        barColor = 'bg-error';
      } else if (day.uptimePercent < 99.9) {
        barColor = 'bg-amber-500';
      }

      // Live override for the last bar (today)
      if (idx === history.length - 1) {
        if (status === 'outage') {
          barColor = 'bg-error';
          tooltip = `Today: Major Outage`;
        } else if (status === 'degraded') {
          barColor = 'bg-amber-500';
          tooltip = `Today: Degraded Performance`;
        }
      }

      return (
        <div
          key={idx}
          className={`h-6 w-1 rounded-full ${barColor} opacity-85 hover:opacity-100 transition-opacity cursor-pointer`}
          title={tooltip}
        />
      );
    });
  };

  const getAverageUptime = (history: UptimeDay[]) => {
    if (!history || history.length === 0) return '100.0%';
    const sum = history.reduce((acc, curr) => acc + curr.uptimePercent, 0);
    const avg = sum / history.length;
    return `${avg.toFixed(2)}%`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <span className="text-xs text-success font-semibold uppercase tracking-wider bg-success/15 px-2.5 py-1 rounded border border-success/20">Operational</span>;
      case 'degraded':
        return <span className="text-xs text-amber-500 font-semibold uppercase tracking-wider bg-amber-500/15 px-2.5 py-1 rounded border border-amber-500/20">Degraded Performance</span>;
      case 'checking':
        return <span className="text-xs text-text-muted font-semibold uppercase tracking-wider bg-slate-800 px-2.5 py-1 rounded border border-border/40 animate-pulse">Checking...</span>;
      default:
        return <span className="text-xs text-error font-semibold uppercase tracking-wider bg-error/15 px-2.5 py-1 rounded border border-error/20">Major Outage</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="flex flex-col bg-bg text-text-light font-sans w-full min-h-screen overflow-x-hidden selection:bg-accent selection:text-white">
      <LandingNav />

      <section className="relative px-6 md:px-16 pt-16 pb-20 flex flex-col items-center max-w-7xl mx-auto w-full z-10">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-accent/10 opacity-55 blur-3xl pointer-events-none" />
        
        {/* Banner: Uptime Status */}
        <div className={`max-w-3xl w-full border rounded-2xl p-6 mb-12 flex items-center justify-between shadow-lg transition-all duration-300 ${
          systemStatus === 'operational' 
            ? 'bg-success/10 border-success/30 shadow-success/5' 
            : systemStatus === 'degraded'
            ? 'bg-amber-500/10 border-amber-500/30 shadow-amber-500/5'
            : 'bg-error/10 border-error/30 shadow-error/5'
        }`}>
          <div className="flex items-center gap-4">
            <div className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                systemStatus === 'operational' ? 'bg-success' : systemStatus === 'degraded' ? 'bg-amber-500' : 'bg-error'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                systemStatus === 'operational' ? 'bg-success' : systemStatus === 'degraded' ? 'bg-amber-500' : 'bg-error'
              }`}></span>
            </div>
            <div className="text-left">
              <h2 className={`font-headings font-bold text-lg leading-snug ${
                systemStatus === 'operational' ? 'text-success' : systemStatus === 'degraded' ? 'text-amber-500' : 'text-error'
              }`}>
                {systemStatus === 'operational' 
                  ? 'All Systems Operational' 
                  : systemStatus === 'degraded'
                  ? 'Some Services Face Degraded Performance'
                  : 'Major System Outage'}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {loading ? 'Refreshing service metrics...' : `Real-time platform status check completed.`}
              </p>
            </div>
          </div>
          <button 
            onClick={fetchStatus}
            disabled={loading}
            className="size-8 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-text-light hover:border-text-muted transition-colors cursor-pointer"
            title="Refresh Status"
          >
            <Icon icon="lucide:refresh-cw" className={loading ? 'animate-spin' : ''} width={14} />
          </button>
        </div>

        {/* System Cards */}
        <div className="max-w-3xl w-full flex flex-col gap-6 mb-16">
          <h3 className="font-headings font-bold text-lg text-text-light text-left self-start">Active Service Nodes</h3>
          
          <div className="grid grid-cols-1 gap-4 w-full">
            {/* API Gateway */}
            <div className="bg-sidebar border border-border/80 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <span className="font-semibold text-sm text-text-light">Media API Gateway</span>
                  <p className="text-xs text-text-muted mt-0.5">Public image processing & optimization endpoints</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-text-muted bg-slate-900 px-2 py-0.5 border border-border/40 rounded">
                    {services.api_gateway.latency}
                  </span>
                  {getStatusBadge(services.api_gateway.status)}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-4 gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 flex-1 max-w-[350px]">
                  {renderUptimeBars(uptimeHistory.api_gateway, services.api_gateway.status)}
                </div>
                <div className="text-right text-[10px] text-text-muted">
                  <span className="font-semibold text-text-light text-xs block">{getAverageUptime(uptimeHistory.api_gateway)}</span>
                  <span>35 days uptime</span>
                </div>
              </div>
            </div>

            {/* Compression Engine */}
            <div className="bg-sidebar border border-border/80 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <span className="font-semibold text-sm text-text-light">Image Compression Engine</span>
                  <p className="text-xs text-text-muted mt-0.5">Real-time WebP & AVIF transcoding queues</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-text-muted bg-slate-900 px-2 py-0.5 border border-border/40 rounded">
                    {services.compression_engine.latency}
                  </span>
                  {getStatusBadge(services.compression_engine.status)}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-4 gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 flex-1 max-w-[350px]">
                  {renderUptimeBars(uptimeHistory.compression_engine, services.compression_engine.status)}
                </div>
                <div className="text-right text-[10px] text-text-muted">
                  <span className="font-semibold text-text-light text-xs block">{getAverageUptime(uptimeHistory.compression_engine)}</span>
                  <span>35 days uptime</span>
                </div>
              </div>
            </div>

            {/* Global CDN */}
            <div className="bg-sidebar border border-border/80 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <span className="font-semibold text-sm text-text-light">Global Asset Delivery CDN</span>
                  <p className="text-xs text-text-muted mt-0.5">Edge nodes & regional cache layers</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-text-muted bg-slate-900 px-2 py-0.5 border border-border/40 rounded">
                    {services.asset_cdn.latency}
                  </span>
                  {getStatusBadge(services.asset_cdn.status)}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-4 gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 flex-1 max-w-[350px]">
                  {renderUptimeBars(uptimeHistory.asset_cdn, services.asset_cdn.status)}
                </div>
                <div className="text-right text-[10px] text-text-muted">
                  <span className="font-semibold text-text-light text-xs block">{getAverageUptime(uptimeHistory.asset_cdn)}</span>
                  <span>35 days uptime</span>
                </div>
              </div>
            </div>

            {/* Management Console */}
            <div className="bg-sidebar border border-border/80 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <span className="font-semibold text-sm text-text-light">Management Dashboard</span>
                  <p className="text-xs text-text-muted mt-0.5">User workspace dashboard & developer client console</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-text-muted bg-slate-900 px-2 py-0.5 border border-border/40 rounded">
                    {services.dashboard.latency}
                  </span>
                  {getStatusBadge(services.dashboard.status)}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-4 gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 flex-1 max-w-[350px]">
                  {renderUptimeBars(uptimeHistory.dashboard, services.dashboard.status)}
                </div>
                <div className="text-right text-[10px] text-text-muted">
                  <span className="font-semibold text-text-light text-xs block">{getAverageUptime(uptimeHistory.dashboard)}</span>
                  <span>35 days uptime</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Incidents History */}
        <div className="max-w-3xl w-full flex flex-col gap-6 text-left">
          <h3 className="font-headings font-bold text-lg text-text-light">Incidents & Events</h3>
          
          {incidents.length === 0 ? (
            <div className="border border-border bg-sidebar rounded-2xl p-8 text-center text-text-muted text-xs">
              <Icon icon="lucide:check-circle" className="mx-auto text-success/45 mb-2.5" width={32} />
              <span>No recorded incidents over the past 90 days. All systems are operational.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {incidents.map((incident) => (
                <div key={incident.id} className="border-l-2 border-border pl-6 relative">
                  <div className={`absolute -left-1.5 top-1 size-3 rounded-full ${incident.isActive ? 'bg-error animate-pulse' : 'bg-success'}`} />
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-text-muted">{formatDate(incident.createdAt)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      incident.status === 'RESOLVED' 
                        ? 'bg-success/10 border-success/20 text-success' 
                        : incident.status === 'MONITORING'
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        : 'bg-error/10 border-error/20 text-error'
                    }`}>
                      {incident.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-text-light mt-2">{incident.title}</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-2xl">{incident.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
