import { drizzle } from 'drizzle-orm/postgres-js'
import { createClient } from '../connection.js'
import {
  boards, boardMembers, goBackLinks,
  kanbanColumns, kanbanTasks,
  calendarEvents,
  chatMessages,
  muralEntries,
  meetingNotes,
  polls, pollVotes,
  fileAttachments,
  activityLog,
} from '../schema/index.js'

const sql = createClient()
const db = drizzle(sql)

function j(obj: unknown): string {
  return JSON.stringify(obj)
}

async function seed(): Promise<void> {
  await db.transaction(async (tx) => {
    // ── Public board ──────────────────────────────────────────────────────────
    const [publicBoard] = await tx.insert(boards).values({
      is_private:        false,
      encrypted_content: j({ name: 'Team Alpha' }),
    }).returning()

    if (!publicBoard) throw new Error('Failed to insert public board')

    const [pubOwner, pubMember] = await tx.insert(boardMembers).values([
      {
        board_id:          publicBoard.id,
        token_hash:        'hash_pub_owner_token',
        role:              'owner',
        encrypted_content: j({ displayName: 'Alice' }),
      },
      {
        board_id:          publicBoard.id,
        token_hash:        'hash_pub_member_token',
        role:              'member',
        encrypted_content: j({ displayName: 'Bob' }),
      },
    ]).returning()

    if (!pubOwner || !pubMember) throw new Error('Failed to insert public board members')

    await tx.insert(goBackLinks).values({
      board_id:   publicBoard.id,
      member_id:  pubOwner.id,
      token:      'pub-go-back-token-alice',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    const [col1, col2] = await tx.insert(kanbanColumns).values([
      { board_id: publicBoard.id, position: 0, encrypted_content: j({ title: 'To Do' }) },
      { board_id: publicBoard.id, position: 1, encrypted_content: j({ title: 'In Progress' }) },
    ]).returning()

    if (!col1 || !col2) throw new Error('Failed to insert kanban columns')

    const [task1] = await tx.insert(kanbanTasks).values([
      {
        column_id:         col1.id,
        board_id:          publicBoard.id,
        assigned_to:       pubMember.id,
        position:          0,
        encrypted_content: j({ title: 'Set up CI', description: 'Configure GitHub Actions', effort: 'S', dueDate: '2026-03-15' }),
      },
      {
        column_id:         col1.id,
        board_id:          publicBoard.id,
        assigned_to:       null,
        position:          1,
        encrypted_content: j({ title: 'Write docs', description: 'Document API endpoints', effort: 'M', dueDate: null }),
      },
      {
        column_id:         col2.id,
        board_id:          publicBoard.id,
        assigned_to:       pubOwner.id,
        position:          0,
        encrypted_content: j({ title: 'Auth flow', description: 'Token-based auth implementation', effort: 'L', dueDate: '2026-03-10' }),
      },
    ]).returning()

    if (!task1) throw new Error('Failed to insert kanban tasks')

    const [event1] = await tx.insert(calendarEvents).values([
      {
        board_id:                publicBoard.id,
        created_by:              pubOwner.id,
        encrypted_content:       j({ title: 'Sprint Planning', description: 'Plan Q1 sprint' }),
        start_at:                new Date('2026-03-10T09:00:00Z'),
        end_at:                  new Date('2026-03-10T10:00:00Z'),
        notify_start_days_before: 0,
        notify_repeat_daily:      false,
      },
      {
        board_id:                publicBoard.id,
        created_by:              pubMember.id,
        encrypted_content:       j({ title: 'Demo Day', description: 'Show progress to stakeholders' }),
        start_at:                new Date('2026-03-20T14:00:00Z'),
        end_at:                  new Date('2026-03-20T15:00:00Z'),
        notify_start_days_before: 0,
        notify_repeat_daily:      false,
      },
    ]).returning()

    if (!event1) throw new Error('Failed to insert calendar events')

    await tx.insert(chatMessages).values([
      { board_id: publicBoard.id, member_id: pubOwner.id,  encrypted_content: j({ text: 'Hey team!' }) },
      { board_id: publicBoard.id, member_id: pubMember.id, encrypted_content: j({ text: 'Ready to start.' }) },
      { board_id: publicBoard.id, member_id: pubOwner.id,  encrypted_content: j({ text: 'Assigned CI task to you, Bob.' }) },
      { board_id: publicBoard.id, member_id: pubMember.id, encrypted_content: j({ text: 'On it!' }) },
      { board_id: publicBoard.id, member_id: pubOwner.id,  encrypted_content: j({ text: 'Sprint planning tomorrow at 9.' }) },
    ])

    const [mural1] = await tx.insert(muralEntries).values([
      {
        board_id:          publicBoard.id,
        created_by:        pubOwner.id,
        encrypted_content: j({ text: 'Ideas for v2', color: '#FFD700', x: 100, y: 150 }),
      },
      {
        board_id:          publicBoard.id,
        created_by:        pubMember.id,
        encrypted_content: j({ text: 'Improve onboarding UX', color: '#90EE90', x: 300, y: 200 }),
      },
    ]).returning()

    if (!mural1) throw new Error('Failed to insert mural entries')

    const [meeting1] = await tx.insert(meetingNotes).values({
      board_id:          publicBoard.id,
      created_by:        pubOwner.id,
      encrypted_content: j({ title: 'Kickoff Notes', body: 'Decided on tech stack. Next: set up repo.', meetingAt: '2026-03-08T10:00:00Z' }),
    }).returning()

    if (!meeting1) throw new Error('Failed to insert meeting notes')

    const [poll1] = await tx.insert(polls).values({
      board_id:          publicBoard.id,
      created_by:        pubOwner.id,
      encrypted_content: j({ question: 'Which day for standups?', options: ['Monday', 'Wednesday', 'Friday'] }),
    }).returning()

    if (!poll1) throw new Error('Failed to insert poll')

    await tx.insert(pollVotes).values([
      { poll_id: poll1.id, member_id: pubOwner.id,  option_index: '0' },
      { poll_id: poll1.id, member_id: pubMember.id, option_index: '2' },
    ])

    await tx.insert(fileAttachments).values({
      board_id:          publicBoard.id,
      uploaded_by:       pubMember.id,
      target_type:       'task',
      target_id:         task1.id,
      encrypted_content: j({ filename: 'ci-diagram.png', mimeType: 'image/png', sizeBytes: 42000, storageKey: 'uploads/ci-diagram.png' }),
    })

    await tx.insert(activityLog).values([
      { board_id: publicBoard.id, member_id: pubOwner.id,  action: 'created',  target_type: 'board',  target_id: publicBoard.id },
      { board_id: publicBoard.id, member_id: pubOwner.id,  action: 'joined',   target_type: 'member', target_id: pubOwner.id },
      { board_id: publicBoard.id, member_id: pubMember.id, action: 'joined',   target_type: 'member', target_id: pubMember.id },
      { board_id: publicBoard.id, member_id: pubOwner.id,  action: 'created',  target_type: 'task',   target_id: task1.id },
      { board_id: publicBoard.id, member_id: pubOwner.id,  action: 'assigned', target_type: 'task',   target_id: task1.id, meta: j({ to: pubMember.id }) },
    ])

    // ── Private board ─────────────────────────────────────────────────────────
    const [privateBoard] = await tx.insert(boards).values({
      password_hash:     '$2b$12$examplehashedpassword',
      is_private:        true,
      encrypted_content: '[ENCRYPTED]',
    }).returning()

    if (!privateBoard) throw new Error('Failed to insert private board')

    const [privOwner, privMember] = await tx.insert(boardMembers).values([
      {
        board_id:          privateBoard.id,
        token_hash:        'hash_priv_owner_token',
        role:              'owner',
        encrypted_content: '[ENCRYPTED]',
      },
      {
        board_id:          privateBoard.id,
        token_hash:        'hash_priv_member_token',
        role:              'member',
        encrypted_content: '[ENCRYPTED]',
      },
    ]).returning()

    if (!privOwner || !privMember) throw new Error('Failed to insert private board members')

    const [privCol1, privCol2] = await tx.insert(kanbanColumns).values([
      { board_id: privateBoard.id, position: 0, encrypted_content: '[ENCRYPTED]' },
      { board_id: privateBoard.id, position: 1, encrypted_content: '[ENCRYPTED]' },
    ]).returning()

    if (!privCol1 || !privCol2) throw new Error('Failed to insert private kanban columns')

    const [privTask1] = await tx.insert(kanbanTasks).values([
      { column_id: privCol1.id, board_id: privateBoard.id, assigned_to: privMember.id, position: 0, encrypted_content: '[ENCRYPTED]' },
      { column_id: privCol1.id, board_id: privateBoard.id, assigned_to: null,          position: 1, encrypted_content: '[ENCRYPTED]' },
      { column_id: privCol2.id, board_id: privateBoard.id, assigned_to: privOwner.id,  position: 0, encrypted_content: '[ENCRYPTED]' },
    ]).returning()

    if (!privTask1) throw new Error('Failed to insert private kanban tasks')

    await tx.insert(calendarEvents).values([
      { board_id: privateBoard.id, created_by: privOwner.id,  encrypted_content: '[ENCRYPTED]', start_at: new Date('2026-03-01T09:00:00Z') },
      { board_id: privateBoard.id, created_by: privMember.id, encrypted_content: '[ENCRYPTED]', start_at: new Date('2026-03-05T14:00:00Z') },
    ])

    await tx.insert(chatMessages).values([
      { board_id: privateBoard.id, member_id: privOwner.id,  encrypted_content: '[ENCRYPTED]' },
      { board_id: privateBoard.id, member_id: privMember.id, encrypted_content: '[ENCRYPTED]' },
      { board_id: privateBoard.id, member_id: privOwner.id,  encrypted_content: '[ENCRYPTED]' },
      { board_id: privateBoard.id, member_id: privMember.id, encrypted_content: '[ENCRYPTED]' },
      { board_id: privateBoard.id, member_id: privOwner.id,  encrypted_content: '[ENCRYPTED]' },
    ])

    await tx.insert(muralEntries).values([
      { board_id: privateBoard.id, created_by: privOwner.id,  encrypted_content: '[ENCRYPTED]' },
      { board_id: privateBoard.id, created_by: privMember.id, encrypted_content: '[ENCRYPTED]' },
    ])

    const [privMeeting1] = await tx.insert(meetingNotes).values({
      board_id:          privateBoard.id,
      created_by:        privOwner.id,
      encrypted_content: '[ENCRYPTED]',
    }).returning()

    if (!privMeeting1) throw new Error('Failed to insert private meeting notes')

    const [privPoll1] = await tx.insert(polls).values({
      board_id:          privateBoard.id,
      created_by:        privOwner.id,
      encrypted_content: '[ENCRYPTED]',
    }).returning()

    if (!privPoll1) throw new Error('Failed to insert private poll')

    await tx.insert(pollVotes).values([
      { poll_id: privPoll1.id, member_id: privOwner.id,  option_index: '1' },
      { poll_id: privPoll1.id, member_id: privMember.id, option_index: '0' },
    ])

    await tx.insert(fileAttachments).values({
      board_id:          privateBoard.id,
      uploaded_by:       privMember.id,
      target_type:       'task',
      target_id:         privTask1.id,
      encrypted_content: '[ENCRYPTED]',
    })

    await tx.insert(activityLog).values([
      { board_id: privateBoard.id, member_id: privOwner.id,  action: 'created', target_type: 'board',  target_id: privateBoard.id },
      { board_id: privateBoard.id, member_id: privOwner.id,  action: 'joined',  target_type: 'member', target_id: privOwner.id },
      { board_id: privateBoard.id, member_id: privMember.id, action: 'joined',  target_type: 'member', target_id: privMember.id },
      { board_id: privateBoard.id, member_id: privOwner.id,  action: 'created', target_type: 'task',   target_id: privTask1.id },
      { board_id: privateBoard.id, member_id: privOwner.id,  action: 'uploaded', target_type: 'file',  target_id: privTask1.id },
    ])
  })

  console.log('Seed complete.')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => sql.end())
