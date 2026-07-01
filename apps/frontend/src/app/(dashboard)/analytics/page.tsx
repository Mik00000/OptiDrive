'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import PageHeading from '@/components/PageHeading';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import { getWorkspaceStatsApi, WorkspaceStats } from '@/features/dashboard/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, parseISO, subDays } from 'date-fns';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7' | '30' | 'custom'>('7');
  
  // Custom Date range state (defaults to last 30 days)
  const [startDateStr, setStartDateStr] = useState<string>(
    format(subDays(new Date(), 29), 'yyyy-MM-dd')
  );
  const [endDateStr, setEndDateStr] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await getWorkspaceStatsApi();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatBytes = (bytesStr?: string | number, decimals = 2) => {
    if (bytesStr === undefined) return '0 B';
    const bytes = typeof bytesStr === 'string' ? Number(bytesStr) : bytesStr;
    if (bytes === 0) return '0 B';
    
    const isNegative = bytes < 0;
    const absBytes = Math.abs(bytes);
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(absBytes) / Math.log(k));
    const formattedValue = parseFloat((absBytes / Math.pow(k, i)).toFixed(dm));
    const formatted = formattedValue + ' ' + sizes[i];
    return (isNegative && formattedValue !== 0) ? `-${formatted}` : formatted;
  };

  // 1. Process Raw Data from the backend
  const allData = stats?.analytics?.map(item => ({
    rawDate: item.date,
    date: format(parseISO(item.date), 'MMM d'),
    requests: item.requests,
    successRequests: item.successRequests || 0,
    errorRequests: item.errorRequests || 0,
    bytesSaved: item.bytesSaved,
    bytesSavedFormatted: formatBytes(item.bytesSaved, 1)
  })) || [];

  // 2. Filter data by date range
  const getFilteredChartData = () => {
    if (timeRange === '7') {
      return allData.slice(-7);
    }
    if (timeRange === '30') {
      return allData.slice(-30);
    }
    // Custom filter
    return allData.filter(
      d => d.rawDate >= startDateStr && d.rawDate <= endDateStr
    );
  };

  const chartData = getFilteredChartData();

  // 3. Re-calculate metrics based on the filtered range
  const filteredMetrics = (() => {
    let requests = 0;
    let success = 0;
    let error = 0;
    let savedBytes = 0;

    chartData.forEach(d => {
      requests += d.requests;
      success += d.successRequests;
      error += d.errorRequests;
      savedBytes += Number(d.bytesSaved);
    });

    const rate = requests > 0 ? (success / requests) * 100 : 100;

    return {
      requests,
      success,
      error,
      savedBytes: Math.max(0, savedBytes),
      successRate: rate
    };
  })();

  // Format breakdown data (from distribution)
  const pieData = stats?.formatDistribution?.map((item) => ({
    name: item.format.toUpperCase(),
    value: item.count,
    originalBytes: Number(item.originalSize),
    optimizedBytes: Number(item.optimizedSize),
    savingsBytes: Number(item.originalSize) - Number(item.optimizedSize)
  })).filter(item => item.value > 0) || [];

  const totalOriginal = stats ? Number(stats.totalOriginalBytes) : 0;
  const totalOptimized = stats ? Number(stats.totalOptimizedBytes) : 0;
  const savingsPercent = totalOriginal > 0 ? ((totalOriginal - totalOptimized) / totalOriginal) * 100 : 0;

  // Exporters
  const handleExportCSV = () => {
    if (!stats) return;
    const rows = [
      ["OptiDrive Workspace Analytics Report"],
      ["Workspace Name", stats.name],
      ["Workspace Slug", stats.slug],
      ["Plan", stats.plan],
      ["Report Range", timeRange === 'custom' ? `${startDateStr} to ${endDateStr}` : `${timeRange} Days`],
      ["Generated At", new Date().toLocaleString()],
      [],
      ["OVERALL METRICS (FILTERED RANGE)"],
      ["Total Requests", filteredMetrics.requests.toString()],
      ["Successful Requests", filteredMetrics.success.toString()],
      ["Failed Requests", filteredMetrics.error.toString()],
      ["Success Rate", `${filteredMetrics.successRate.toFixed(2)}%`],
      ["Bandwidth Saved (Bytes)", filteredMetrics.savedBytes.toString()],
      [],
      ["DAILY TRENDS"],
      ["Date", "Total Requests", "Success Requests", "Error Requests", "Bytes Saved"]
    ];

    chartData.forEach(row => {
      rows.push([
        row.rawDate,
        row.requests.toString(),
        row.successRequests.toString(),
        row.errorRequests.toString(),
        row.bytesSaved.toString()
      ]);
    });

    rows.push([]);
    rows.push(["FORMAT BREAKDOWN (TOTAL FILES)"]);
    rows.push(["Format", "Files Count", "Original Size (Bytes)", "Optimized Size (Bytes)", "Bytes Saved (Bytes)"]);

    pieData.forEach(item => {
      rows.push([
        item.name,
        item.value.toString(),
        item.originalBytes.toString(),
        item.optimizedBytes.toString(),
        item.savingsBytes.toString()
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `optidrive_analytics_${stats.slug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!stats) return;
    const reportData = {
      workspace: {
        id: stats.id,
        name: stats.name,
        slug: stats.slug,
        plan: stats.plan,
      },
      range: timeRange === 'custom' ? { start: startDateStr, end: endDateStr } : { type: `${timeRange} days` },
      generatedAt: new Date().toISOString(),
      summary: {
        totalRequests: filteredMetrics.requests,
        successRequests: filteredMetrics.success,
        errorRequests: filteredMetrics.error,
        successRate: filteredMetrics.successRate,
        bytesSavedBytes: filteredMetrics.savedBytes,
        totalFiles: stats.totalFiles,
      },
      dailyTrends: chartData.map(d => ({
        date: d.rawDate,
        totalRequests: d.requests,
        successRequests: d.successRequests,
        errorRequests: d.errorRequests,
        bytesSavedBytes: d.bytesSaved
      })),
      formatBreakdown: pieData.map(p => ({
        format: p.name,
        filesCount: p.value,
        originalBytes: p.originalBytes,
        optimizedBytes: p.optimizedBytes,
        savingsBytes: p.savingsBytes
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `optidrive_analytics_${stats.slug}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <section className="dashboard-page relative pb-12 print:p-0 print:m-0 print:bg-white print:text-black">
      {/* Printable Report Header (Visible only when printing) */}
      <div className="hidden print:flex flex-col gap-2 border-b border-gray-300 pb-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-black">OptiDrive</span>
          </div>
          <span className="text-xs text-gray-500">Workspace Analytics Report</span>
        </div>
        <h1 className="text-2xl font-extrabold text-black mt-2">
          {stats?.name || 'Workspace'} Analytics
        </h1>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Period: {timeRange === 'custom' ? `${startDateStr} to ${endDateStr}` : `Last ${timeRange} Days`}</span>
          <span>Generated At: {new Date().toLocaleString()}</span>
        </div>
      </div>

      <div className="print:hidden">
        <PageHeading title="Analytics & Insights">
          <div className="flex flex-nowrap sm:flex-wrap items-center gap-3 w-max sm:w-auto pb-1 sm:pb-0">
            {/* Preset Ranges */}
            <div className="inline-flex rounded-lg border border-border bg-slate-900/50 p-1">
              <button
                onClick={() => setTimeRange('7')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${timeRange === '7' ? 'bg-accent text-text-light' : 'text-text-muted hover:text-text-light'}`}
              >
                7d
              </button>
              <button
                onClick={() => setTimeRange('30')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${timeRange === '30' ? 'bg-accent text-text-light' : 'text-text-muted hover:text-text-light'}`}
              >
                30d
              </button>
              <button
                onClick={() => setTimeRange('custom')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${timeRange === 'custom' ? 'bg-accent text-text-light' : 'text-text-muted hover:text-text-light'}`}
              >
                Custom
              </button>
            </div>

            {/* Custom Date Picker Fields */}
            {timeRange === 'custom' && (
              <div className="flex items-center gap-2 bg-slate-900/40 border border-border px-3 py-1 rounded-lg animate-fadeIn text-xs text-text-muted">
                <Input
                  variant="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="bg-transparent border-0 outline-none text-text-light cursor-pointer text-xs p-0"
                />
                <span>to</span>
                <Input
                  variant="date"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="bg-transparent border-0 outline-none text-text-light cursor-pointer text-xs p-0"
                />
              </div>
            )}

            {/* Action Exporters */}
            <div className="flex items-center gap-2">
              <Button
                variant="bordered"
                onClick={handleExportCSV}
                className="px-3 h-9 text-xs font-semibold gap-1.5 border-border bg-card hover:bg-slate-800 text-text-muted hover:text-text-light"
                title="Download CSV report"
              >
                <Icon icon="lucide:file-spreadsheet" width={14} />
                <span className="hidden sm:inline">CSV</span>
              </Button>

              <Button
                variant="bordered"
                onClick={handleExportJSON}
                className="px-3 h-9 text-xs font-semibold gap-1.5 border-border bg-card hover:bg-slate-800 text-text-muted hover:text-text-light"
                title="Download JSON report"
              >
                <Icon icon="lucide:braces" width={14} />
                <span className="hidden sm:inline">JSON</span>
              </Button>

              <Button
                variant="bordered"
                onClick={handlePrintPDF}
                className="px-3 h-9 text-xs font-semibold gap-1.5 border-border bg-card hover:bg-slate-800 text-text-muted hover:text-text-light"
                title="Print PDF report"
              >
                <Icon icon="lucide:printer" width={14} />
                <span className="hidden sm:inline">PDF</span>
              </Button>

              <Button 
                variant="bordered" 
                onClick={fetchStats} 
                className="p-2.5 h-9 w-9 flex items-center justify-center border-border bg-card hover:bg-slate-800 text-text-muted hover:text-text-light"
              >
                <Icon icon="lucide:refresh-cw" className={isLoading ? 'animate-spin' : ''} width={16} />
              </Button>
            </div>
          </div>
        </PageHeading>
      </div>

      <div className="flex flex-col gap-6 p-8 print:p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 print:hidden">
            <Icon icon="line-md:loading-twotone-loop" className="text-accent" width={48} />
            <span className="text-sm font-semibold text-text-muted">Loading Analytics...</span>
          </div>
        ) : stats ? (
          <>
            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Card 1: API Request count */}
              <div className="p-6 bg-card border border-border rounded-2xl flex flex-col gap-3 shadow-lg print:border-gray-300 print:shadow-none">
                <div className="flex justify-between items-center print:hidden">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Request volume</span>
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Icon icon="lucide:zap" width={16} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-500 hidden print:block uppercase">Total Requests</span>
                  <span className="text-3xl font-extrabold text-text-light print:text-black font-mono">
                    {filteredMetrics.requests}
                  </span>
                  <span className="text-[11px] text-text-muted mt-1 leading-normal print:text-gray-500">
                    Total optimization requests in range.
                  </span>
                </div>
              </div>

              {/* Card 2: Success Rate */}
              <div className="p-6 bg-card border border-border rounded-2xl flex flex-col gap-3 shadow-lg print:border-gray-300 print:shadow-none">
                <div className="flex justify-between items-center print:hidden">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Success Rate</span>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${
                    filteredMetrics.successRate >= 99 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : filteredMetrics.successRate >= 95
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    <Icon icon="lucide:check-circle-2" width={16} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-500 hidden print:block uppercase">Success Rate</span>
                  <span className={`text-3xl font-extrabold font-mono ${
                    filteredMetrics.successRate >= 99 
                      ? 'text-emerald-400 print:text-green-600' 
                      : filteredMetrics.successRate >= 95
                      ? 'text-amber-400 print:text-yellow-600'
                      : 'text-rose-400 print:text-red-600'
                  }`}>
                    {filteredMetrics.successRate.toFixed(2)}%
                  </span>
                  <span className="text-[11px] text-text-muted mt-1 leading-normal print:text-gray-500">
                    {filteredMetrics.success} OK / {filteredMetrics.error} Failures
                  </span>
                </div>
              </div>

              {/* Card 3: Bandwidth Saved */}
              <div className="p-6 bg-card border border-border rounded-2xl flex flex-col gap-3 shadow-lg print:border-gray-300 print:shadow-none">
                <div className="flex justify-between items-center print:hidden">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Data savings</span>
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Icon icon="lucide:arrow-down-wide-narrow" width={16} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-500 hidden print:block uppercase">Total Bytes Saved</span>
                  <span className="text-3xl font-extrabold text-text-light print:text-black font-mono">
                    {formatBytes(filteredMetrics.savedBytes)}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1.5 leading-normal print:text-green-600">
                    <Icon icon="lucide:sparkles" width={12} className="print:hidden" />
                    Overall efficiency: {savingsPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Card 4: Active Files */}
              <div className="p-6 bg-card border border-border rounded-2xl flex flex-col gap-3 shadow-lg print:border-gray-300 print:shadow-none">
                <div className="flex justify-between items-center print:hidden">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Active Files</span>
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Icon icon="lucide:image" width={16} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-500 hidden print:block uppercase">Total Files</span>
                  <span className="text-3xl font-extrabold text-text-light print:text-black font-mono">
                    {stats.totalFiles}
                  </span>
                  <span className="text-[11px] text-text-muted mt-1 leading-normal print:text-gray-500">
                    Total files currently active in storage.
                  </span>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 print:grid-cols-1">
              {/* Requests Graph */}
              <div className="p-6 bg-card border border-border rounded-2xl shadow-lg print:border-gray-300 print:shadow-none break-inside-avoid">
                <h3 className="text-sm font-semibold text-text-light print:text-black mb-4">Request Status Breakdown</h3>
                <div className="h-64">
                  <ResponsiveContainer width="99%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                        </linearGradient>
                        <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#1e293b" opacity={0.3} className="print:hidden" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}
                      />
                      <Area type="monotone" name="Success" dataKey="successRequests" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSuccess)" />
                      <Area type="monotone" name="Errors" dataKey="errorRequests" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorError)" />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bandwidth Saved Graph */}
              <div className="p-6 bg-card border border-border rounded-2xl shadow-lg print:border-gray-300 print:shadow-none break-inside-avoid">
                <h3 className="text-sm font-semibold text-text-light print:text-black mb-4">Bytes Saved Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="99%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#1e293b" opacity={0.3} className="print:hidden" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(val) => formatBytes(val, 0)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}
                        formatter={(value) => [formatBytes(Number(value)), 'Saved']}
                      />
                      <Area type="monotone" name="Bytes Saved" dataKey="bytesSaved" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSaved)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Breakdown Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 print:grid-cols-1 print:gap-12 break-before-page">
              {/* Format distribution pie chart */}
              <div className="p-6 bg-card border border-border rounded-2xl shadow-lg xl:col-span-1 flex flex-col justify-between print:border-gray-300 print:shadow-none break-inside-avoid">
                <h3 className="text-sm font-semibold text-text-light print:text-black mb-4">Format Distribution</h3>
                {pieData.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <div className="h-48 w-full flex justify-center items-center">
                      <ResponsiveContainer width="99%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                            formatter={(value, name, props) => [
                              `${value} files (${formatBytes(props.payload.optimizedBytes)})`,
                              name
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legends */}
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-4">
                      {pieData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="font-semibold text-text-light print:text-black">{entry.name}</span>
                          <span className="text-text-muted">({entry.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48">
                    <Icon icon="lucide:image-off" className="text-text-muted" width={32} />
                    <span className="text-xs text-text-muted mt-2">No files uploaded yet</span>
                  </div>
                )}
              </div>

              {/* Format breakdown table */}
              <div className="p-6 bg-card border border-border rounded-2xl shadow-lg xl:col-span-2 print:border-gray-300 print:shadow-none break-inside-avoid">
                <h3 className="text-sm font-semibold text-text-light print:text-black mb-4">Savings by Format</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-text-muted print:text-gray-600 font-bold">
                        <th className="py-2.5">Format</th>
                        <th className="py-2.5">Files Count</th>
                        <th className="py-2.5">Original Size</th>
                        <th className="py-2.5">Optimized Size</th>
                        <th className="py-2.5 text-right">Bytes Saved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {pieData.length > 0 ? (
                        pieData.map((item, index) => {
                          const savingsPercent = item.originalBytes > 0 ? ((item.originalBytes - item.optimizedBytes) / item.originalBytes) * 100 : 0;
                          return (
                            <tr key={item.name} className="hover:bg-slate-900/30 print:hover:bg-transparent transition-colors">
                              <td className="py-3 flex items-center gap-2 font-bold text-text-light print:text-black">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                {item.name}
                              </td>
                              <td className="py-3 text-text-muted print:text-black font-semibold">{item.value}</td>
                              <td className="py-3 text-text-muted print:text-black font-mono">{formatBytes(item.originalBytes)}</td>
                              <td className="py-3 text-text-muted print:text-black font-mono">{formatBytes(item.optimizedBytes)}</td>
                              <td className={`py-3 text-right font-mono font-bold ${item.savingsBytes >= 0 ? 'text-emerald-400 print:text-green-600' : 'text-amber-400 print:text-yellow-600'}`}>
                                {formatBytes(item.savingsBytes)} ({savingsPercent >= 0 ? `-${savingsPercent.toFixed(0)}%` : `+${Math.abs(savingsPercent).toFixed(0)}%`})
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-text-muted">No data available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-text-muted py-20">Failed to load statistics</div>
        )}
      </div>
    </section>
  );
}
