"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { buildRouteGeoJSON } from "../../../lib/routeSegments";
import { itineraryRowToStep } from "../../../lib/itinerary-supabase";
import type { ItineraryRow } from "../../../lib/itinerary-supabase";
import type { Step } from "../../../types";

function formatDateFR(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const j = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const a = d.getFullYear();
  return `${j}/${m}/${a}`;
}

function computeNuitees(arrivee: string | null, depart: string | null): number {
  if (!arrivee || !depart) return 0;
  const d1 = new Date(arrivee);
  const d2 = new Date(depart);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function isNuitee(type: string | null | undefined): boolean {
  return type === "van" || type === "airbnb";
}

const CHART_COLORS = {
  culture: "#c98b6a",
  nourriture: "#A55734",
  nuitee: "#7a3d22",
};

export default function DataPage() {
  const [rows, setRows] = useState<ItineraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalKm, setTotalKm] = useState(0);
  const [segments, setSegments] = useState<Array<{ from: string; to: string; km: number; durée: string; péages: number }>>([]);

  useEffect(() => {
    fetch("/api/itinerary")
      .then((r) => r.json())
      .then((data) => {
        const r = data.steps ?? [];
        setRows(r);

        if (r.length > 0) {
          const steps: Step[] = r.map((row: ItineraryRow) => itineraryRowToStep(row));
          const fc = buildRouteGeoJSON(steps);
          let km = 0;
          const segs: typeof segments = [];
          for (const f of fc.features) {
            const p = f.properties;
            if (p) {
              km += p.distanceKm;
              const h = Math.floor(p.durationMin / 60);
              const m = p.durationMin % 60;
              segs.push({
                from: p.fromName,
                to: p.toName,
                km: p.distanceKm,
                durée: h > 0 ? `${h}h ${m}min` : `${m}min`,
                péages: p.tollCost,
              });
            }
          }
          setTotalKm(Math.round(km * 10) / 10);
          setSegments(segs);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const firstDate = rows.length > 0
    ? rows.map((r) => r.date_prevue).filter(Boolean).sort()[0] ?? null
    : null;
  const lastDate = rows.length > 0
    ? rows
        .map((r) => (isNuitee(r.nuitee_type) ? r.date_depart ?? r.date_prevue : r.date_prevue))
        .filter(Boolean)
        .sort()
        .pop() ?? null
    : null;

  const joursVoyage = firstDate && lastDate
    ? Math.max(1, Math.round((new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const kmParJour = joursVoyage > 0 ? Math.round((totalKm / joursVoyage) * 10) / 10 : 0;

  const totalNuitees = rows.reduce((acc, r) => {
    if (!isNuitee(r.nuitee_type)) return acc;
    return acc + computeNuitees(r.date_prevue, r.date_depart ?? r.date_prevue);
  }, 0);
  const totalBudgetNuitee = rows.reduce((acc, r) => acc + (r.budget_nuitee ?? 0), 0);
  const prixNuitMoyen = totalNuitees > 0 ? Math.round((totalBudgetNuitee / totalNuitees) * 10) / 10 : 0;

  const totalCulture = rows.reduce((acc, r) => acc + (r.budget_culture ?? 0), 0);
  const totalNourriture = rows.reduce((acc, r) => acc + (r.budget_nourriture ?? 0), 0);
  const budgetTotal = totalCulture + totalNourriture + totalBudgetNuitee;
  const depensesParJour = joursVoyage > 0 ? Math.round((budgetTotal / joursVoyage) * 10) / 10 : 0;
  const prixAuKm = totalKm > 0 ? Math.round((budgetTotal / totalKm) * 100) / 100 : 0;

  const chartData = rows
    .filter((r) => r.date_prevue)
    .map((r) => ({
      ville: r.nom,
      date: formatDateFR(r.date_prevue),
      dateSort: r.date_prevue ?? "",
      culture: r.budget_culture ?? 0,
      nourriture: r.budget_nourriture ?? 0,
      nuitee: r.nuitee_type === "airbnb" ? (r.budget_nuitee ?? 0) : 0,
      total: (r.budget_culture ?? 0) + (r.budget_nourriture ?? 0) + (r.nuitee_type === "airbnb" ? (r.budget_nuitee ?? 0) : 0),
    }))
    .sort((a, b) => a.dateSort.localeCompare(b.dateSort));

  const repartitionData = [
    { name: "Culture", value: totalCulture, color: CHART_COLORS.culture },
    { name: "Nourriture", value: totalNourriture, color: CHART_COLORS.nourriture },
    { name: "Nuitée", value: totalBudgetNuitee, color: CHART_COLORS.nuitee },
  ].filter((d) => d.value > 0);

  const bigNumbers = [
    { label: "Km totaux", value: totalKm.toLocaleString("fr-FR"), unit: "km" },
    { label: "Km / jour", value: kmParJour.toLocaleString("fr-FR"), unit: "km" },
    { label: "Prix / nuit moyen", value: prixNuitMoyen.toLocaleString("fr-FR"), unit: "€" },
    { label: "Villes", value: String(rows.length), unit: "" },
    { label: "Budget total", value: budgetTotal.toLocaleString("fr-FR"), unit: "€" },
    { label: "Nuitées", value: String(totalNuitees), unit: "" },
    { label: "€ / jour", value: depensesParJour.toLocaleString("fr-FR"), unit: "€" },
    { label: "€ / km", value: prixAuKm.toLocaleString("fr-FR"), unit: "€" },
  ];

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-[#333333]/70">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-light text-[#333333]">
        Data & Logistique
      </h1>
      <p className="mb-10 text-[#333333]/70">
        Vue d’ensemble du voyage Summer 26
      </p>

      {/* Big Numbers */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-normal text-[#333333]">Indicateurs clés</h2>
        <div className="flex flex-wrap gap-3">
          {bigNumbers.map((item) => (
            <div
              key={item.label}
              className="inline-flex items-baseline gap-1.5 rounded-full border-2 border-[#7a3d22]/50 bg-white px-4 py-2 shadow-sm"
            >
              <span className="text-[11px] uppercase tracking-wider text-[#333333]/70">{item.label}</span>
              <span className="font-medium tabular-nums text-[#A55734]">
                {item.value}
                {item.unit && <span className="ml-0.5 text-[12px] text-[#7a3d22]">{item.unit}</span>}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Évolution des dépenses */}
      {chartData.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-normal text-[#333333]">Évolution des dépenses dans le temps</h2>
          <div className="rounded-lg border-2 border-[#7a3d22]/40 bg-white p-4 shadow-sm">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A55734" strokeOpacity={0.2} />
                <XAxis
                  dataKey="ville"
                  tick={{ fontSize: 11, fill: "#333333" }}
                  stroke="#7a3d22"
                  strokeOpacity={0.5}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#333333" }}
                  stroke="#7a3d22"
                  strokeOpacity={0.5}
                  tickFormatter={(v) => `${v} €`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FAF4F0",
                    border: "2px solid #A55734",
                    borderRadius: "4px",
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                  formatter={(value: number) => [`${value} €`, ""]}
                />
                <Legend
                  wrapperStyle={{ fontFamily: "IBM Plex Mono, monospace" }}
                  formatter={(value) => <span className="text-[#333333]">{value}</span>}
                />
                <Line type="monotone" dataKey="culture" stroke={CHART_COLORS.culture} strokeWidth={2} name="Culture" dot={{ fill: CHART_COLORS.culture }} />
                <Line type="monotone" dataKey="nourriture" stroke={CHART_COLORS.nourriture} strokeWidth={2} name="Nourriture" dot={{ fill: CHART_COLORS.nourriture }} />
                <Line type="monotone" dataKey="nuitee" stroke={CHART_COLORS.nuitee} strokeWidth={2} name="Nuitée" dot={{ fill: CHART_COLORS.nuitee }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Répartition du budget */}
      {repartitionData.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-normal text-[#333333]">Répartition du budget</h2>
          <div className="rounded-lg border-2 border-[#7a3d22]/40 bg-white p-4 shadow-sm">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={repartitionData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A55734" strokeOpacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#333333" }} tickFormatter={(v) => `${v} €`} stroke="#7a3d22" strokeOpacity={0.5} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#333333" }} stroke="#7a3d22" strokeOpacity={0.5} width={70} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FAF4F0",
                    border: "2px solid #A55734",
                    borderRadius: "4px",
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                  formatter={(value: number) => [`${value} €`, ""]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {repartitionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Tableau récap par ville */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-normal text-[#333333]">Récapitulatif par ville</h2>
        <div className="overflow-x-auto rounded-lg border-2 border-[#7a3d22]/40 bg-[#FAF4F0] shadow-sm">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b-2 border-[#7a3d22] bg-[#A55734] text-left">
                <th className="px-3 py-2 text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]">Ville</th>
                <th className="px-3 py-2 text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]">Date</th>
                <th className="px-3 py-2 text-center text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]">Culture €</th>
                <th className="px-3 py-2 text-center text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]">Nourr. €</th>
                <th className="px-3 py-2 text-center text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]">Nuit €</th>
                <th className="px-3 py-2 text-right text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]">Sous-total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const culture = r.budget_culture ?? 0;
                const nourr = r.budget_nourriture ?? 0;
                const nuitee = r.nuitee_type === "airbnb" ? (r.budget_nuitee ?? 0) : 0;
                const sousTotal = culture + nourr + nuitee;
                return (
                  <tr
                    key={r.step_id}
                    className={`border-b-2 border-[#7a3d22]/35 ${
                      i % 2 === 1 ? "bg-[#FFF2EB]/40" : "bg-[#FAF4F0]"
                    }`}
                  >
                    <td className="px-3 py-2 text-[13px] font-medium text-[#333333]">{r.nom}</td>
                    <td className="px-3 py-2 text-[12px] text-[#333333]/80">{formatDateFR(r.date_prevue)}</td>
                    <td className="px-3 py-2 text-center text-[12px] tabular-nums text-[#333333]">{culture}</td>
                    <td className="px-3 py-2 text-center text-[12px] tabular-nums text-[#333333]">{nourr}</td>
                    <td className="px-3 py-2 text-center text-[12px] tabular-nums text-[#333333]">{nuitee}</td>
                    <td className="px-3 py-2 text-right text-[12px] font-medium tabular-nums text-[#A55734]">{sousTotal} €</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Trajets */}
      {segments.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-normal text-[#333333]">Trajets</h2>
          <div className="overflow-x-auto rounded-lg border-2 border-[#7a3d22]/40 bg-[#FAF4F0] shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#7a3d22] bg-[#A55734] text-left">
                  <th className="px-3 py-2 text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]">Segment</th>
                  <th className="px-3 py-2 text-right text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]">Km</th>
                  <th className="px-3 py-2 text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]">Durée</th>
                  <th className="px-3 py-2 text-right text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]">Péages</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((s, i) => (
                  <tr
                    key={`${s.from}-${s.to}`}
                    className={`border-b-2 border-[#7a3d22]/25 ${
                      i % 2 === 1 ? "bg-[#FFF2EB]/40" : "bg-[#FAF4F0]"
                    }`}
                  >
                    <td className="px-3 py-2 text-[12px] text-[#A55734]">
                      {s.from} → {s.to}
                    </td>
                    <td className="px-3 py-2 text-right text-[12px] tabular-nums text-[#333333]">{s.km} km</td>
                    <td className="px-3 py-2 text-[12px] text-[#333333]">{s.durée}</td>
                    <td className="px-3 py-2 text-right text-[12px] tabular-nums text-[#333333]">
                      {s.péages > 0 ? `${s.péages.toFixed(1)} €` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rows.length === 0 && (
        <p className="text-[#333333]/70">
          Aucune donnée. Renseigne le planning pour afficher les statistiques.
        </p>
      )}
    </main>
  );
}
