import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFiles } from '../composables/useFiles'
import type { BoardFile } from '../composables/useFiles'

const wsInstances: FakeWebSocket[] = []

class FakeWebSocket {
  static OPEN = 1
  readyState = FakeWebSocket.OPEN
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  send = vi.fn()
  close = vi.fn()

  constructor(public readonly url: string) {
    wsInstances.push(this)
  }
}

vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn(),
    postForm: vi.fn(),
    del: vi.fn(),
    get: vi.fn(),
  },
}))

vi.mock('@/utils/crypto', () => ({
  importKeyFromBase64: vi.fn().mockResolvedValue({}),
  encryptFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  decryptFile: vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
}))

const makeFile = (overrides: Partial<BoardFile> = {}): BoardFile => ({
  id: 'file-1',
  boardId: 'board-1',
  uploadedBy: 'member-1',
  type: 'file',
  name: 'report.pdf',
  url: null,
  mimeType: 'application/pdf',
  sizeBytes: 4200000,
  storageKey: 'uuid-1',
  createdAt: new Date().toISOString(),
  ...overrides,
})

const makeLink = (overrides: Partial<BoardFile> = {}): BoardFile =>
  makeFile({ id: 'link-1', type: 'link', name: 'Figma', url: 'https://figma.com', mimeType: null, sizeBytes: null, storageKey: null, ...overrides })

describe('useFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    wsInstances.length = 0
    vi.stubGlobal('WebSocket', FakeWebSocket)
  })

  it('filtered returns all items when search is empty', () => {
    const { files, filtered, search } = useFiles()
    files.value = [makeFile(), makeLink()]
    search.value = ''
    expect(filtered.value).toHaveLength(2)
  })

  it('filtered filters by name (case-insensitive)', () => {
    const { files, filtered, search } = useFiles()
    files.value = [makeFile({ name: 'report.pdf' }), makeLink({ name: 'Figma' })]
    search.value = 'rep'
    expect(filtered.value).toHaveLength(1)
    expect(filtered.value[0]!.name).toBe('report.pdf')
  })

  it('filtered filters by mimeType for file entries', () => {
    const { files, filtered, search } = useFiles()
    files.value = [makeFile({ mimeType: 'application/pdf' }), makeLink()]
    search.value = 'pdf'
    expect(filtered.value).toHaveLength(1)
    expect(filtered.value[0]!.mimeType).toBe('application/pdf')
  })

  it('filtered returns both when query matches link type', () => {
    const { files, filtered, search } = useFiles()
    files.value = [makeFile(), makeLink()]
    search.value = 'link'
    expect(filtered.value).toHaveLength(1)
    expect(filtered.value[0]!.type).toBe('link')
  })

  it('load populates files on success', async () => {
    const { api } = await import('@/services/api')
    vi.mocked(api.post).mockResolvedValueOnce({ files: [makeFile()] })

    const { files, load } = useFiles()
    await load('board-1')

    expect(files.value).toHaveLength(1)
    expect(api.post).toHaveBeenCalledWith('/api/boards/board-1/files/list', {})
  })

  it('load sets error on API failure', async () => {
    const { api } = await import('@/services/api')
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Network error'))

    const { error, load } = useFiles()
    await load('board-1')

    expect(error.value).toBe('Network error')
  })

  it('addLink sends a WebSocket create message', async () => {
    const { files, addLink, connect } = useFiles()
    files.value = [makeFile()]

    await connect('board-1')
    wsInstances[0]!.onmessage?.({ data: JSON.stringify({ type: 'ready' }) } as MessageEvent)
    await addLink('board-1', 'Figma', 'https://figma.com')

    expect(wsInstances[0]!.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'link:create',
      name: 'Figma',
      url: 'https://figma.com',
    }))
  })

  it('deleteFile removes by id from files', async () => {
    const { api } = await import('@/services/api')
    vi.mocked(api.del).mockResolvedValueOnce(undefined)

    const { files, deleteFile } = useFiles()
    files.value = [makeFile(), makeLink()]
    await deleteFile('board-1', 'file-1')

    expect(files.value).toHaveLength(1)
    expect(files.value[0]!.id).toBe('link-1')
  })

  it('getDownloadUrl returns correct URL format', () => {
    const { getDownloadUrl } = useFiles()
    const url = getDownloadUrl('board-1', 'file-1')
    expect(url).toContain('/api/boards/board-1/files/file-1/download')
  })
})
