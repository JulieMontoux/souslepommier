'use client'

import { useState } from 'react'
import { X, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ProduitComplet } from '@/types/produits'

const EMBALLAGE_LABELS: Record<string, string> = {
  VRAC: 'Vrac',
  BARQUETTE: 'Barquette',
  FILET: 'Filet',
  SAC: 'Sac',
  CAISSE: 'Caisse',
  PLATEAU: 'Plateau',
}

interface LabelPrintModalProps {
  produit: ProduitComplet
  raisonSociale?: string
  onClose: () => void
}

type FormatLabel = 'thermal' | 'a4'

export function LabelPrintModal({
  produit,
  raisonSociale = 'Sous le Pommier',
  onClose,
}: LabelPrintModalProps) {
  const variantesActives = produit.variantes.filter((v) => v.actif)

  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(variantesActives.map((v) => [v.id, true]))
  )
  const [copies, setCopies] = useState<Record<string, number>>(
    Object.fromEntries(variantesActives.map((v) => [v.id, 1]))
  )
  const [format, setFormat] = useState<FormatLabel>('thermal')

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function buildLabelHtml(
    nom: string,
    varianteLabel: string,
    prix: string,
    tva: number,
    entreprise: string
  ) {
    return `<div class="label">
  <div class="entreprise">${entreprise}</div>
  <div class="nom">${nom}</div>
  <div class="variante">${varianteLabel}</div>
  <div class="prix">${prix} <span class="tva">TVA ${tva}%</span></div>
</div>`
  }

  function handlePrint() {
    const labelsToRender: string[] = []

    for (const v of variantesActives) {
      if (!selected[v.id]) continue
      const count = copies[v.id] ?? 1
      const parts: string[] = []
      if (v.poids) parts.push(`${v.poids} kg`)
      parts.push(EMBALLAGE_LABELS[v.emballage] ?? v.emballage)
      const varianteLabel = parts.join(' · ')
      const prix = v.prixTTC.toFixed(2).replace('.', ',') + ' €'
      const block = buildLabelHtml(
        produit.nom,
        varianteLabel,
        prix,
        v.tauxTVA.taux,
        raisonSociale
      )
      for (let i = 0; i < count; i++) labelsToRender.push(block)
    }

    if (labelsToRender.length === 0) return

    const isThermal = format === 'thermal'

    const css = isThermal
      ? `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;width:58mm}
.label{width:58mm;height:38mm;padding:3mm;display:flex;flex-direction:column;justify-content:space-between;page-break-after:always;border:1px solid #ccc}
.entreprise{font-size:7pt;color:#555;text-transform:uppercase;letter-spacing:0.5px}
.nom{font-size:11pt;font-weight:bold;line-height:1.2}
.variante{font-size:8pt;color:#444}
.prix{font-size:13pt;font-weight:bold;margin-top:auto}
.tva{font-size:7pt;font-weight:normal;color:#666}
@media print{@page{margin:0;size:58mm 38mm}}`
      : `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;background:#fff}
.grid{display:flex;flex-wrap:wrap;padding:10mm}
.label{width:58mm;height:38mm;padding:3mm;display:flex;flex-direction:column;justify-content:space-between;border:1px dashed #bbb;margin:1mm}
.entreprise{font-size:6pt;color:#555;text-transform:uppercase;letter-spacing:0.5px}
.nom{font-size:10pt;font-weight:bold;line-height:1.2}
.variante{font-size:7pt;color:#444}
.prix{font-size:12pt;font-weight:bold;margin-top:auto}
.tva{font-size:6pt;font-weight:normal;color:#666}
@media print{@page{margin:0;size:A4 portrait}}`

    const body = isThermal
      ? labelsToRender.join('')
      : `<div class="grid">${labelsToRender.join('')}</div>`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`

    const w = window.open('', '_blank', 'width=400,height=500')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
    w.onafterprint = () => w.close()
  }

  const totalLabels = variantesActives.reduce(
    (s, v) => s + (selected[v.id] ? (copies[v.id] ?? 1) : 0),
    0
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="font-semibold text-zinc-800">Impression étiquettes</p>
            <p className="text-sm text-zinc-500">{produit.nom}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Format */}
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700">Format</p>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('thermal')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  format === 'thermal'
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                Thermique 58×38mm
              </button>
              <button
                onClick={() => setFormat('a4')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  format === 'a4'
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                Grille A4
              </button>
            </div>
          </div>

          {/* Variantes */}
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700">Variantes</p>
            {variantesActives.length === 0 ? (
              <p className="text-sm text-zinc-400">Aucune variante active</p>
            ) : (
              <div className="space-y-2">
                {variantesActives.map((v) => {
                  const parts: string[] = []
                  if (v.poids) parts.push(`${v.poids} kg`)
                  parts.push(EMBALLAGE_LABELS[v.emballage] ?? v.emballage)
                  const label = parts.join(' · ')
                  return (
                    <label
                      key={v.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 hover:border-zinc-300"
                    >
                      <input
                        type="checkbox"
                        checked={selected[v.id] ?? false}
                        onChange={() => toggle(v.id)}
                        className="accent-green-600"
                      />
                      <span className="flex-1 text-sm text-zinc-700">
                        {label} —{' '}
                        <span className="font-medium">
                          {v.prixTTC.toFixed(2).replace('.', ',')} €
                        </span>
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-400">×</span>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={copies[v.id] ?? 1}
                          onChange={(e) =>
                            setCopies((prev) => ({
                              ...prev,
                              [v.id]: Math.max(1, parseInt(e.target.value) || 1),
                            }))
                          }
                          disabled={!selected[v.id]}
                          className="h-7 w-16 text-center text-sm"
                        />
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-4">
          <p className="text-sm text-zinc-500">
            {totalLabels} étiquette{totalLabels !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handlePrint} disabled={totalLabels === 0} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
