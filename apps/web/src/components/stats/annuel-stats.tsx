'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import { Button } from '@/components/ui/button'
import type { YearStats } from '@/types/stats'

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const COLORS = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0891b2']

function fmt(v: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)
}

function fmtShort(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k€`
  return `${v.toFixed(0)}€`
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

function Heatmap({ parJour, year }: { parJour: YearStats['parJour']; year: number }) {
  const byDate = new Map(parJour.map((d) => [d.date, d]))
  const maxVentes = Math.max(1, ...parJour.map((d) => d.nbVentes))

  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  const days: { date: string; nbVentes: number; caTTC: number }[] = []

  // Pad start to Monday
  const startDow = start.getDay() === 0 ? 6 : start.getDay() - 1
  for (let i = 0; i < startDow; i++) days.push({ date: '', nbVentes: 0, caTTC: 0 })

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    const data = byDate.get(key)
    days.push({ date: key, nbVentes: data?.nbVentes ?? 0, caTTC: data?.caTTC ?? 0 })
  }

  const weeks: (typeof days)[] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  function intensity(nbVentes: number) {
    if (nbVentes === 0) return 'bg-zinc-100'
    const pct = nbVentes / maxVentes
    if (pct < 0.25) return 'bg-green-200'
    if (pct < 0.5) return 'bg-green-400'
    if (pct < 0.75) return 'bg-green-600'
    return 'bg-green-800'
  }

  return (
    <div>
      <div className="mb-2 flex gap-1 text-xs text-zinc-400">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} className="w-3 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="flex gap-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, di) => (
              <div
                key={di}
                title={day.date ? `${day.date} — ${day.nbVentes} vente(s) — ${fmt(day.caTTC)}` : ''}
                className={`h-3 w-3 rounded-sm ${day.date ? intensity(day.nbVentes) : 'bg-transparent'}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-zinc-400">
        <span>Moins</span>
        {['bg-zinc-100', 'bg-green-200', 'bg-green-400', 'bg-green-600', 'bg-green-800'].map(
          (c, i) => (
            <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />
          )
        )}
        <span>Plus</span>
      </div>
    </div>
  )
}

export function AnnuelStats({
  initial,
  initialPrev,
  currentYear,
}: {
  initial: YearStats
  initialPrev: YearStats
  currentYear: number
}) {
  const [year, setYear] = useState(initial.year)
  const [stats, setStats] = useState(initial)
  const [prevStats, setPrevStats] = useState(initialPrev)
  const [isPending, start] = useTransition()

  const [exportFrom, setExportFrom] = useState(`${currentYear}-01-01`)
  const [exportTo, setExportTo] = useState(`${currentYear}-12-31`)

  function changeYear(delta: number) {
    const newYear = year + delta
    start(async () => {
      const [curr, prev] = await Promise.all([
        fetch(`/api/stats/year/${newYear}`).then((r) => r.json()),
        fetch(`/api/stats/year/${newYear - 1}`).then((r) => r.json()),
      ])
      setStats(curr as YearStats)
      setPrevStats(prev as YearStats)
      setYear(newYear)
    })
  }

  // Merge N and N-1 for comparison chart
  const comparisonData = stats.parMois.map((m, i) => ({
    mois: MOIS[i],
    [year]: m.caTTC,
    [year - 1]: prevStats.parMois[i]?.caTTC ?? 0,
  }))

  const totalTVA = stats.parTVA.reduce((s, t) => s + t.montantTVA, 0)
  const pctVsN1 =
    prevStats.caTTC > 0
      ? (((stats.caTTC - prevStats.caTTC) / prevStats.caTTC) * 100).toFixed(1)
      : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Statistiques annuelles</h1>
          <p className="text-sm text-zinc-500">
            {stats.nbVentes} vente{stats.nbVentes !== 1 ? 's' : ''} finalisée
            {stats.nbVentes !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeYear(-1)}
            disabled={isPending}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-16 text-center font-semibold text-zinc-800">{year}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeYear(1)}
            disabled={isPending || year >= currentYear}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="CA TTC"
          value={fmt(stats.caTTC)}
          sub={pctVsN1 ? `${pctVsN1 > '0' ? '+' : ''}${pctVsN1}% vs ${year - 1}` : undefined}
        />
        <KpiCard label="CA HT" value={fmt(stats.caHT)} />
        <KpiCard
          label="Nb ventes"
          value={stats.nbVentes.toString()}
          sub={`vs ${prevStats.nbVentes} en ${year - 1}`}
        />
        <KpiCard
          label="Panier moyen"
          value={fmt(stats.panierMoyen)}
          sub={`vs ${fmt(prevStats.panierMoyen)} en ${year - 1}`}
        />
      </div>

      {/* Comparaison N vs N-1 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 font-semibold text-zinc-800">
          CA mensuel — {year} vs {year - 1}
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={comparisonData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [fmt(Number(v ?? 0)), '']} />
            <Legend />
            <Line
              type="monotone"
              dataKey={String(year)}
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey={String(year - 1)}
              stroke="#94a3b8"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 font-semibold text-zinc-800">Activité journalière {year}</h2>
        <Heatmap parJour={stats.parJour} year={year} />
      </div>

      {/* Top produits + TVA */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top produits */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 font-semibold text-zinc-800">Top produits {year}</h2>
          {stats.topProduits.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={stats.topProduits.slice(0, 8)}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
                <YAxis dataKey="nom" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v, name) => [
                    name === 'caTTC' ? fmt(Number(v ?? 0)) : `${v}%`,
                    name === 'caTTC' ? 'CA TTC' : '% CA',
                  ]}
                />
                <Bar dataKey="caTTC" radius={[0, 3, 3, 0]}>
                  {stats.topProduits.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* TVA */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 font-semibold text-zinc-800">TVA collectée {year}</h2>
          {stats.parTVA.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucune donnée</p>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={stats.parTVA}
                    dataKey="montantTVA"
                    nameKey="taux"
                    cx="50%"
                    cy="50%"
                    outerRadius={64}
                    label={({ name }) => `${name}%`}
                  >
                    {stats.parTVA.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [fmt(Number(v ?? 0)), 'TVA']} />
                </PieChart>
              </ResponsiveContainer>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    <th className="pb-1 text-left">Taux</th>
                    <th className="pb-1 text-right">Base HT</th>
                    <th className="pb-1 text-right">TVA</th>
                    <th className="pb-1 text-right">% du total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {stats.parTVA.map((t) => (
                    <tr key={t.taux}>
                      <td className="py-1 font-medium text-zinc-700">{t.taux} %</td>
                      <td className="py-1 text-right font-mono text-xs text-zinc-500">
                        {fmt(t.montantHT)}
                      </td>
                      <td className="py-1 text-right font-mono text-xs text-zinc-700">
                        {fmt(t.montantTVA)}
                      </td>
                      <td className="py-1 text-right text-xs text-zinc-400">
                        {totalTVA > 0 ? ((t.montantTVA / totalTVA) * 100).toFixed(1) : '0'} %
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-zinc-200 font-semibold">
                    <td className="pt-1 text-zinc-800">Total</td>
                    <td className="pt-1 text-right font-mono text-xs text-zinc-600">
                      {fmt(stats.parTVA.reduce((s, t) => s + t.montantHT, 0))}
                    </td>
                    <td className="pt-1 text-right font-mono text-xs text-zinc-800">
                      {fmt(totalTVA)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Export CSV */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-zinc-800">Export CSV</h2>
        <p className="mb-3 text-sm text-zinc-500">
          CA, quantités et TVA par produit sur une période personnalisée
        </p>
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Du</label>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Au</label>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <a
            href={`/api/stats/export?from=${exportFrom}&to=${exportTo}`}
            download
            onClick={() => {
              if (!exportFrom || !exportTo) {
                toast.error('Sélectionnez une période')
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <Download className="h-4 w-4" />
            Télécharger CSV
          </a>
        </div>
      </div>
    </div>
  )
}
