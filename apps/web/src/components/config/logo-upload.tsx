'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'

interface LogoUploadProps {
  currentUrl?: string | null | undefined
  onUpload: (url: string) => void
}

export function LogoUpload({ currentUrl, onUpload }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)

    try {
      const form = new FormData()
      form.append('logo', file)
      const res = await fetch('/api/config/logo', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Erreur upload')
        setPreview(currentUrl ?? null)
        return
      }

      onUpload(data.logoUrl)
      toast.success('Logo mis à jour')
    } finally {
      setUploading(false)
      URL.revokeObjectURL(objectUrl)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50">
        {preview ? (
          <>
            <Image src={preview} alt="Logo" fill className="object-contain p-1" unoptimized />
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute top-1 right-1 rounded-full bg-white/80 p-0.5 text-zinc-600 hover:bg-white"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <span className="text-2xl">🍎</span>
        )}
      </div>

      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Upload…' : 'Choisir un logo'}
        </Button>
        <p className="text-xs text-zinc-400">PNG, JPEG, WebP ou SVG — max 2 Mo</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>
    </div>
  )
}
