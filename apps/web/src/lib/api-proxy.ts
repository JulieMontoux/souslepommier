import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'

export async function apiProxy<T>(
  path: string,
  {
    method = 'GET',
    body,
    headers = {},
  }: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  } = {}
): Promise<T> {
  const cookieStore = cookies()
  const cookieHeader = cookieStore.toString()

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      cookie: cookieHeader,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
