import { createRouter, createWebHistory } from 'vue-router'

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
      component: () => import('@/components/layout/PrivateLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'board-home',
          component: () => import('@/features/board/views/BoardHomeView.vue'),
        },
        {
          path: 'invite',
          name: 'board-invite',
          component: () => import('@/features/board/views/BoardInviteView.vue'),
        },
        {
          path: 'calendar',
          name: 'board-calendar',
          component: () => import('@/features/board/views/BoardCalendarView.vue'),
        },
        {
          path: 'kanban',
          name: 'board-kanban',
          component: () => import('@/features/board/views/BoardKanbanView.vue'),
        },
        {
          path: 'chat',
          name: 'board-chat',
          component: () => import('@/features/board/views/BoardChatView.vue'),
        },
        {
          path: 'config',
          name: 'board-config',
          component: () => import('@/features/board/views/BoardConfigView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    // TODO: check auth session when implemented
    // return { name: 'home' }
  }
})

export default router
