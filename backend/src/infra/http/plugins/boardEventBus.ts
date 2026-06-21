import type { WebSocket } from '@fastify/websocket'

export interface ConnInfo {
  userId: string
  username: string
  memberId: string
}

const rooms = new Map<string, Map<WebSocket, ConnInfo>>()

export function send(socket: WebSocket, msg: unknown) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(msg))
  }
}

export function broadcast(boardId: string, msg: unknown) {
  const room = rooms.get(boardId)
  if (!room) return
  for (const [socket] of room) {
    send(socket, msg)
  }
}

export function joinRoom(boardId: string, socket: WebSocket, info: ConnInfo) {
  if (!rooms.has(boardId)) rooms.set(boardId, new Map())
  rooms.get(boardId)!.set(socket, info)
}

export function leaveRoom(boardId: string, socket: WebSocket) {
  const room = rooms.get(boardId)
  if (!room) return
  room.delete(socket)
  if (room.size === 0) rooms.delete(boardId)
}

export function getRoomSize(boardId: string): number {
  return rooms.get(boardId)?.size ?? 0
}
