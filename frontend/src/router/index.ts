import { createRouter, createWebHistory } from 'vue-router'
import {
  HomeView,
  CreateView,
  JoinView,
} from '@/features/public'
import {
  BoardHomeView,
  BoardInviteView,
  BoardCalendarView,
  BoardKanbanView,
  BoardChatView,
  BoardConfigView,
} from '@/features/board'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      children: [
        { path: '', name: 'home', component: HomeView },
        { path: 'create', name: 'create', component: CreateView },
        { path: 'join', name: 'join', component: JoinView },
      ],
    },
    {
      path: '/board/:id',
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'board-home', component: BoardHomeView },
        { path: 'invite', name: 'board-invite', component: BoardInviteView },
        { path: 'calendar', name: 'board-calendar', component: BoardCalendarView },
        { path: 'kanban', name: 'board-kanban', component: BoardKanbanView },
        { path: 'chat', name: 'board-chat', component: BoardChatView },
        { path: 'config', name: 'board-config', component: BoardConfigView },
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
