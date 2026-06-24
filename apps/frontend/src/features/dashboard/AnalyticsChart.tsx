"use client";

import { Input } from "@/components/Inputs";
import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { WorkspaceStats } from "./api";
import { format, parseISO } from "date-fns";

interface AnalyticsChartProps {
  stats?: WorkspaceStats;
}

export default function AnalyticsChart({ stats }: AnalyticsChartProps) {
  const [timeRange, setTimeRange] = React.useState("last_7_days");

  const fullData = stats?.analytics?.map(item => ({
    name: format(parseISO(item.date), 'MMM d'),
    requests: item.requests
  })) || [];

  const daysToShow = timeRange === 'last_7_days' ? 7 : 30;
  const data = fullData.slice(-daysToShow);

  // Calculate max for ticks
  const maxRequests = data.length > 0 ? Math.max(...data.map(d => d.requests)) : 0;
  const tickMax = maxRequests < 10 ? 10 : Math.ceil(maxRequests / 5) * 5;
  const ticks = [0, Math.floor(tickMax / 2), tickMax];

  return (
    <section className="w-full p-6 bg-card rounded-xl border border-border text-text-light shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-text-light">API Request Analytics</h3>
        <Input
          variant="select"
          options={[
            { value: "last_7_days", label: "Last 7 Days" },
            { value: "last_30_days", label: "Last 30 Days" },
          ]}
          value={timeRange}
          onChange={setTimeRange}
          className=" text-text-muted w-fit text-3.5"
        />
      </div>

      <div className="w-full h-64 min-w-0">
        <ResponsiveContainer width="99%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRequests" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                <stop offset="100%" stopColor="#2c277f" stopOpacity={1} />
              </linearGradient>
              
              <linearGradient id="fillRequests" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#2c277f" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="#1f2937" strokeDasharray="3 3" opacity={0.3} />

            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "#6b7280", fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "#6b7280", fontSize: 12 }}
              ticks={ticks}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Area
              type="monotone"
              dataKey="requests"
              stroke="url(#colorRequests)" 
              strokeWidth={6}
              fillOpacity={1}
              fill="url(#fillRequests)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}