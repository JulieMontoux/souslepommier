import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'GERANT') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('logo') as File | null

  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Format non supporté (PNG, JPEG, WebP, SVG)' },
      { status: 400 }
    )
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 2 Mo)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'png'
  const filename = `logo-${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos')
  await mkdir(uploadDir, { recursive: true })

  const bytes = await file.arrayBuffer()
  await writeFile(path.join(uploadDir, filename), Buffer.from(bytes))

  const logoUrl = `/uploads/logos/${filename}`
  await prisma.configEntreprise.upsert({
    where: { id: 'default' },
    update: { logoUrl },
    create: { id: 'default', raisonSociale: 'Mon entreprise', logoUrl },
  })

  return NextResponse.json({ logoUrl })
}
