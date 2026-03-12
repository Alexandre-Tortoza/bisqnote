import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/components/layout/PublicLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/features/public/views/HomeView.vue') },
        {
          path: 'create',
          name: 'create',
          component: () => import('@/features/public/views/CreateView.vue'),
        },
        {
          path: 'join',
          name: 'join',
          component: () => import('@/features/public/views/JoinView.vue'),
        },
      ],
    },
    {
      path: '/board/:id',
      children: [
        {
          path: 'enter',
          name: 'board-enter',
          component: () => import('@/features/board/enter/views/BoardEnterView.vue'),
        },
        {
          path: '',
          component: () => import('@/components/layout/PrivateLayout.vue'),
          meta: { requiresAuth: true },
          children: [
            {
              path: '',
              name: 'board-home',
              component: () => import('@/features/board/home/views/BoardHomeView.vue'),
            },
            {
              path: 'invite',
              name: 'board-invite',
              component: () => import('@/features/board/invite/views/BoardInviteView.vue'),
            },
            {
              path: 'calendar',
              name: 'board-calendar',
              component: () => import('@/features/board/calendar/views/BoardCalendarView.vue'),
            },
            {
              path: 'kanban',
              name: 'board-kanban',
              component: () => import('@/features/board/kanban/views/BoardKanbanView.vue'),
            },
            {
              path: 'chat',
              name: 'board-chat',
              component: () => import('@/features/board/chat/views/BoardChatView.vue'),
            },
            {
              path: 'config',
              name: 'board-config',
              component: () => import('@/features/board/config/views/BoardConfigView.vue'),
            },
          ],
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const session = useSessionStore()
    const boardId = to.params['id'] as string
    if (!session.hasSession(boardId)) {
      return { name: 'board-enter', params: { id: boardId } }
    }
  }
})

export default router
