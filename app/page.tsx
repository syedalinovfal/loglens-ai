"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Bot,
  Activity,
  ArrowRight,
  RefreshCw,
  Code2,
  X,
  Sparkles,
  Check,
  RotateCcw,
  Terminal,
  ShieldAlert,
} from "lucide-react";

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  events_count: number;
  last_seen_at: string;
  root_cause: string | null;
  suggested_fix: string | null;
  impact: string | null;
  stack_trace?: string;
  context?: any;
}

type FilterTab = "ALL" | "OPEN" | "RESOLVED";

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [loading, setLoading] = useState(true);
  const [triaging, setTriaging] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/incidents");
      const data = await res.json();
      if (Array.isArray(data)) setIncidents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleTriage = async (id: string) => {
    try {
      setTriaging(true);
      const res = await fetch(`/api/v1/triage/${id}`, { method: "POST" });
      const diagnosis = await res.json();

      const updateState = (inc: Incident) => ({
        ...inc,
        root_cause: diagnosis.rootCause,
        suggested_fix: diagnosis.suggestedFix,
        impact: diagnosis.impact,
      });

      setIncidents((prev) =>
        prev.map((inc) => (inc.id === id ? updateState(inc) : inc)),
      );
      if (selectedIncident?.id === id) {
        setSelectedIncident((prev) => (prev ? updateState(prev) : null));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTriaging(false);
    }
  };

  const handleStatusChange = async (
    id: string,
    newStatus: "Open" | "Resolved",
  ) => {
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/v1/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (data.success) {
        setIncidents((prev) =>
          prev.map((inc) =>
            inc.id === id ? { ...inc, status: newStatus } : inc,
          ),
        );

        if (selectedIncident?.id === id) {
          setSelectedIncident((prev) =>
            prev ? { ...prev, status: newStatus } : null,
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openCount = incidents.filter((i) => i.status === "Open").length;
  const resolvedCount = incidents.filter((i) => i.status === "Resolved").length;
  const totalEvents = incidents.reduce(
    (acc, curr) => acc + (curr.events_count || 1),
    0,
  );
  const triagedCount = incidents.filter((i) => Boolean(i.root_cause)).length;

  const filteredIncidents = incidents.filter((incident) => {
    if (activeTab === "OPEN") return incident.status === "Open";
    if (activeTab === "RESOLVED") return incident.status === "Resolved";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500/30">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[128px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-900 bg-slate-950/70 backdrop-blur-md px-10 py-5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 bg-gradient-to-tr from-blue-600 via-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/20 text-lg tracking-wider">
            L
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="font-bold text-xl text-white tracking-tight">
              LogLens
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent border border-blue-500/20 px-2.5 py-1 rounded-md bg-blue-500/5">
              AI Triage
            </span>
          </div>
        </div>
        <button
          onClick={fetchIncidents}
          className="group flex items-center space-x-2 text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg border border-slate-800 hover:border-slate-700 hover:text-white transition-all duration-200 shadow-sm"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-slate-400 group-hover:text-white transition-transform duration-500 ${loading ? "animate-spin" : "group-hover:rotate-180"}`}
          />
          <span>Sync Data</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-10 py-8 max-w-7xl mx-auto w-full space-y-10 relative">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative group overflow-hidden bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex items-center space-x-5 transition-all duration-300 hover:border-slate-800/80 hover:bg-slate-900/60 shadow-2xl">
            <div className="p-4 bg-red-500/5 text-red-400 rounded-xl border border-red-500/10 shadow-inner group-hover:bg-red-500/10 group-hover:border-red-500/20 transition-all duration-300">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">
                Open Incidents
              </p>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">
                {openCount}
              </h3>
            </div>
          </div>

          <div className="relative group overflow-hidden bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex items-center space-x-5 transition-all duration-300 hover:border-slate-800/80 hover:bg-slate-900/60 shadow-2xl">
            <div className="p-4 bg-blue-500/5 text-blue-400 rounded-xl border border-blue-500/10 shadow-inner group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all duration-300">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">
                Total Ingested
              </p>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">
                {totalEvents.toLocaleString()}
              </h3>
            </div>
          </div>

          <div className="relative group overflow-hidden bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex items-center space-x-5 transition-all duration-300 hover:border-slate-800/80 hover:bg-slate-900/60 shadow-2xl">
            <div className="p-4 bg-emerald-500/5 text-emerald-400 rounded-xl border border-emerald-500/10 shadow-inner group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all duration-300">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">
                AI Triaged Rate
              </p>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">
                {incidents.length
                  ? Math.round((triagedCount / incidents.length) * 100)
                  : 0}
                %
              </h3>
            </div>
          </div>
        </div>

        {/* Incidents Board */}
        <div className="bg-slate-900/20 border border-slate-900/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          {/* Header & Filter Tabs */}
          <div className="px-8 py-6 border-b border-slate-900/80 flex items-center justify-between flex-wrap gap-5">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>Incident Feed</span>
                <span className="text-xs bg-slate-800 text-slate-400 font-semibold px-2 py-0.5 rounded-md font-mono">
                  {filteredIncidents.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Review, categorize, and triage incoming exceptions.
              </p>
            </div>

            <div className="flex bg-slate-950/80 p-1.5 rounded-xl border border-slate-900 text-xs gap-1">
              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  activeTab === "ALL"
                    ? "bg-slate-800 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("OPEN")}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  activeTab === "OPEN"
                    ? "bg-slate-800 text-red-400 shadow-md"
                    : "text-slate-400 hover:text-red-300"
                }`}
              >
                Open ({openCount})
              </button>
              <button
                onClick={() => setActiveTab("RESOLVED")}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  activeTab === "RESOLVED"
                    ? "bg-slate-800 text-emerald-400 shadow-md"
                    : "text-slate-400 hover:text-emerald-300"
                }`}
              >
                Resolved ({resolvedCount})
              </button>
            </div>
          </div>

          {/* Incident Feed List */}
          <div className="divide-y divide-slate-900/60 p-2">
            {filteredIncidents.length === 0 ? (
              <div className="py-24 text-center text-slate-500 text-sm space-y-3">
                <ShieldAlert className="h-8 w-8 mx-auto text-slate-600 animate-pulse" />
                <p>No {activeTab.toLowerCase()} incidents found.</p>
              </div>
            ) : (
              filteredIncidents.map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  className="mx-2 my-2.5 p-6 rounded-xl border border-transparent hover:border-slate-800 hover:bg-slate-900/30 cursor-pointer transition-all duration-300 flex items-center justify-between gap-6 group hover:shadow-lg"
                >
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`text-[10px] tracking-wider px-2.5 py-1 rounded-md font-mono font-bold uppercase border ${
                          incident.status === "Resolved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {incident.status}
                      </span>
                      <span className="text-[10px] tracking-wider px-2 py-0.5 rounded-md font-mono font-bold uppercase bg-slate-950 text-slate-400 border border-slate-900">
                        {incident.severity}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Seen {incident.events_count}x
                      </span>
                      {incident.root_cause && (
                        <span className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Triaged</span>
                        </span>
                      )}
                    </div>
                    <h4 className="text-[15px] font-semibold text-slate-200 group-hover:text-blue-400 transition font-mono truncate">
                      {incident.title}
                    </h4>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriage(incident.id);
                      }}
                      disabled={triaging}
                      className="flex items-center space-x-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg font-semibold shadow-md shadow-indigo-600/10 transition disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        {incident.root_cause ? "Re-Triage" : "AI Triage"}
                      </span>
                    </button>
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-200 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Slide-over Drawer */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-3xl bg-slate-950 h-full border-l border-slate-900 p-8 flex flex-col space-y-6 overflow-y-auto shadow-2xl">
            {/* Header: Status, ID, Title, Actions */}
            <div className="border-b border-slate-900 pb-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] tracking-widest px-2.5 py-1 rounded font-mono font-bold uppercase border ${
                      selectedIncident.status === "Resolved"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {selectedIncident.status}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ID: {selectedIncident.id}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedIncident.status === "Open" ? (
                    <button
                      onClick={() =>
                        handleStatusChange(selectedIncident.id, "Resolved")
                      }
                      disabled={updatingStatus}
                      className="flex items-center space-x-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      <span>Resolve</span>
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        handleStatusChange(selectedIncident.id, "Open")
                      }
                      disabled={updatingStatus}
                      className="flex items-center space-x-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3.5 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Reopen</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="p-2 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-100 font-mono leading-snug break-words">
                {selectedIncident.title}
              </h3>
            </div>

            {/* AI Diagnosis Card */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                  <Bot className="h-4 w-4" />
                  <span>AI Triage Diagnosis</span>
                </div>
                <button
                  onClick={() => handleTriage(selectedIncident.id)}
                  disabled={triaging}
                  className="flex items-center space-x-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg font-semibold transition disabled:opacity-50 shadow-md shadow-indigo-600/20"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {triaging
                      ? "Diagnosing..."
                      : selectedIncident.root_cause
                        ? "Re-Analyze"
                        : "Analyze Now"}
                  </span>
                </button>
              </div>

              {selectedIncident.root_cause ? (
                <div className="space-y-5">
                  {/* Side-by-side Root Cause & Impact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 bg-slate-950/70 p-4 rounded-xl border border-slate-900">
                      <span className="text-[10px] tracking-wider text-slate-400 font-bold uppercase block">
                        Root Cause
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {selectedIncident.root_cause}
                      </p>
                    </div>

                    <div className="space-y-1.5 bg-slate-950/70 p-4 rounded-xl border border-slate-900">
                      <span className="text-[10px] tracking-wider text-slate-400 font-bold uppercase block">
                        Impact Radius
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {selectedIncident.impact}
                      </p>
                    </div>
                  </div>

                  {/* Git Diff Formatted Suggested Patch */}
                  <div className="space-y-2">
                    <span className="text-[10px] tracking-wider text-slate-400 font-bold uppercase block flex items-center gap-1.5">
                      <Code2 className="h-3.5 w-3.5" /> Suggested Patch
                    </span>
                    <div className="bg-slate-950 rounded-xl border border-slate-900 p-4 font-mono text-xs overflow-x-auto leading-relaxed shadow-inner">
                      {selectedIncident.suggested_fix
                        ?.split("\n")
                        .map((line, idx) => {
                          let lineClass = "text-slate-400";
                          if (line.startsWith("+"))
                            lineClass =
                              "text-emerald-400 bg-emerald-500/10 px-1 rounded block";
                          else if (line.startsWith("-"))
                            lineClass =
                              "text-rose-400 bg-rose-500/10 px-1 rounded block";
                          else if (line.startsWith("@@"))
                            lineClass = "text-indigo-400 font-bold block";

                          return (
                            <div key={idx} className={lineClass}>
                              {line || "\u00A0"}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No diagnosis generated yet. Click "Analyze Now" to trigger
                  Gemini root-cause assessment.
                </p>
              )}
            </div>

            {/* Stack Trace Box */}
            <div className="space-y-2">
              <span className="text-[10px] tracking-wider text-slate-400 font-bold uppercase block flex items-center gap-1.5">
                <Terminal className="h-4 w-4" /> Latest Stack Trace
              </span>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-xs font-mono text-rose-400/90 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-56">
                {selectedIncident.stack_trace || "No stack trace provided"}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
