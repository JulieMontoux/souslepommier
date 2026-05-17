'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { DayStats } from '@/types/stats'

const MODE_LABELS: Record<string, string> = {
  ESPECES: 'Espèces',
  CB: 'Carte bancaire',
  CHEQUE: 'Chèque',
  VIREMENT: 'Virement',
  TICKET_RESTO: 'Ticket resto',
}

const PIE_COLORS = ['#18181b', '#52525b', '#a1a1aa', '#d4d4d8', '#e4e4e7']

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

function pct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

function Trend({ current, previous }: { current: number; previous: number }) {
  const p = pct(current, previous)
  if (p === null) return <span className="text-xs text-zinc-400">—</span>
  const positive = p >= 0
  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(p).toFixed(1)}%
    </span>
  )
}

interface DashboardStatsProps {
  initialStats: DayStats
}

export function DashboardStats({ initialStats }: DashboardStatsProps) {
  const [stats, setStats] = useState<DayStats>(initialStats)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [isPending, startTransition] = useTransition()

  function handleDateChange(date: string) {
    setSelectedDate(date)
    startTransition(async () => {
      const res = await fetch(`/api/stats/day/${date}`)
      if (!res.ok) {
        toast.error('Erreur chargement statistiques')
        return
      }
      setStats(await res.json())
    })
  }

  const isToday = selectedDate === new Date().toISOString().slice(0, 10)

  return (
    <div className={`space-y-6 ${isPending ? 'opacity-60 transition-opacity' : ''}`}>
      {/* Sélecteur date + titre */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            {new Date(stats.date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => handleDateChange(e.target.value)}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
        />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="CA TTC"
          value={fmt(stats.caTTC)}
          trend={<Trend current={stats.caTTC} previous={stats.j1CaTTC} />}
          sub={isToday ? `J-1 : ${fmt(stats.j1CaTTC)}` : undefined}
        />
        <KpiCard
          label="Ventes"
          value={String(stats.nbVentes)}
          trend={<Trend current={stats.nbVentes} previous={stats.j1NbVentes} />}
          sub={isToday ? `J-1 : ${stats.j1NbVentes}` : undefined}
        />
        <KpiCard
          label="Panier moyen"
          value={fmt(stats.panierMoyen)}
          trend={<Trend current={stats.panierMoyen} previous={stats.j1PanierMoyen} />}
          sub={isToday ? `J-1 : ${fmt(stats.j1PanierMoyen)}` : undefined}
        />
        <KpiCard
          label="Annulées"
          value={String(stats.nbVentesAnnulees)}
          variant={stats.nbVentesAnnulees > 0 ? 'warn' : 'neutral'}
        />
      </div>

      {stats.nbVentes === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-12 text-center shadow-sm">
          <Minus className="mx-auto mb-2 h-6 w-6 text-zinc-300" />
          <p className="text-sm text-zinc-400">Aucune vente ce jour</p>
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Courbe horaire */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="mb-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                Ventes par heure
              </h2>
              {stats.parHeure.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.parHeure}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis
                      dataKey="heure"
                      tickFormatter={(h) => `${h}h`}
                      tick={{ fontSize: 11, fill: '#a1a1aa' }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} width={40} />
                    <Tooltip
                      formatter={(v) => [fmt(Number(v ?? 0)), 'CA TTC']}
                      labelFormatter={(h) => `${h}h00`}
                    />
                    <Line
                      type="monotone"
                      dataKey="caTTC"
                      stroke="#18181b"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-zinc-300">Aucune donnée</p>
              )}
            </div>

            {/* Donut modes paiement */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                Modes de paiement
              </h2>
              {stats.parModePaiement.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.parModePaiement}
                      dataKey="montant"
                      nameKey="mode"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                    >
                      {stats.parModePaiement.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, _name, entry) => [
                        fmt(Number(v ?? 0)),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        MODE_LABELS[(entry as any)?.payload?.mode ?? ''] ?? String(_name),
                      ]}
                    />
                    <Legend
                      formatter={(value) => MODE_LABELS[value] ?? value}
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-zinc-300">Aucune donnée</p>
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top 5 produits */}
            {stats.topProduits.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  Top produits
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-400">
                      <th className="pb-2 text-left font-medium">Produit</th>
                      <th className="pb-2 text-right font-medium">Qté</th>
                      <th className="pb-2 text-right font-medium">CA TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {stats.topProduits.map((p, i) => (
                      <tr key={p.produitId}>
                        <td className="py-1.5 text-zinc-700">
                          <span className="mr-2 text-xs text-zinc-300">{i + 1}</span>
                          {p.nom}
                        </td>
                        <td className="py-1.5 text-right text-zinc-500">{p.qte}</td>
                        <td className="py-1.5 text-right font-medium text-zinc-900">
                          {fmt(p.caTTC)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Perf vendeurs */}
            {stats.parVendeur.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  Performance vendeurs
                </h2>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(120, stats.parVendeur.length * 48)}
                >
                  <BarChart
                    data={stats.parVendeur.map((v) => ({
                      name: `${v.prenom} ${v.nom}`,
                      caTTC: v.caTTC,
                    }))}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#a1a1aa' }}
                      tickFormatter={(v) => `${v.toFixed(0)} €`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12, fill: '#52525b' }}
                      width={90}
                    />
                    <Tooltip formatter={(v) => [fmt(Number(v ?? 0)), 'CA TTC']} />
                    <Bar dataKey="caTTC" fill="#18181b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  trend,
  sub,
  variant = 'neutral',
}: {
  label: string
  value: string
  trend?: React.ReactNode
  sub?: string
  variant?: 'neutral' | 'warn'
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${variant === 'warn' && value !== '0' ? 'text-amber-600' : 'text-zinc-900'}`}
      >
        {value}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {trend}
        {sub && <span className="text-xs text-zinc-400">{sub}</span>}
      </div>
    </div>
  )
}
