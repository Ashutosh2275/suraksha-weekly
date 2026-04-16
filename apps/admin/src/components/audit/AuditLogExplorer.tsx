"use client";

import { useMemo, useState } from "react";

import { AuditRow } from "@/lib/adminApi";

interface AuditLogExplorerProps {
  rows: AuditRow[];
}

const PAGE_SIZE = 10;

export function AuditLogExplorer({ rows }: AuditLogExplorerProps) {
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (entityFilter && !row.entity_type.toLowerCase().includes(entityFilter.toLowerCase())) {
        return false;
      }
      if (actionFilter && !row.action.toLowerCase().includes(actionFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [rows, entityFilter, actionFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function exportCsv(): void {
    const headers = ["entity_type", "entity_id", "action", "actor", "timestamp"];
    const lines = [headers.join(",")].concat(
      filtered.map((row) => [row.entity_type, row.entity_id, row.action, row.actor, row.timestamp].join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "audit_logs.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          onChange={(event) => setEntityFilter(event.target.value)}
          placeholder="Filter entity_type"
          value={entityFilter}
        />
        <input
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          onChange={(event) => setActionFilter(event.target.value)}
          placeholder="Filter action"
          value={actionFilter}
        />
        <button className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white" onClick={exportCsv} type="button">
          Export to CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs text-slate-200">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="px-2 py-2">entity_type</th>
              <th className="px-2 py-2">entity_id</th>
              <th className="px-2 py-2">action</th>
              <th className="px-2 py-2">actor</th>
              <th className="px-2 py-2">timestamp</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr key={row.id} className="border-b border-slate-800/70">
                <td className="px-2 py-2">{row.entity_type}</td>
                <td className="px-2 py-2">{row.entity_id}</td>
                <td className="px-2 py-2">{row.action}</td>
                <td className="px-2 py-2">{row.actor}</td>
                <td className="px-2 py-2">{new Date(row.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <p>Page {page} / {pageCount}</p>
        <div className="flex gap-2">
          <button className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)} type="button">
            Prev
          </button>
          <button className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40" disabled={page >= pageCount} onClick={() => setPage((prev) => prev + 1)} type="button">
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
