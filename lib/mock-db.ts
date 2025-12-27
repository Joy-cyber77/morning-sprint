// Mock database using localStorage for the prototype
export interface User {
  id: string
  email: string
  password: string // In production, this would be hashed
  name: string
  createdAt: string
  isAdmin: boolean
}

export interface Task {
  id: string
  userId: string
  userName: string
  content: string
  category: "learning" | "meditation" | "reading" | "academy" | "workout" | "other"
  completed: boolean
  isShared: boolean // Added isShared field to separate private tasks from shared ones
  createdAt: string
  completedAt?: string
  likes: string[] // array of user IDs who liked
}

export interface Post {
  id: string
  userId: string
  userName: string
  content: string
  category: "reading" | "workout" | "meditation" | "learning" | "other"
  createdAt: string
  likes: string[] // array of user IDs who liked
}

export interface SprintHistory {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  tasksCount: number
  tasksCompleted: number
}

export interface FeedbackComment {
  id: string
  feedbackId: string
  fromUserId: string
  fromUserName: string
  content: string
  createdAt: string
}

export interface Feedback {
  id: string
  toUserId: string
  fromUserId: string
  fromUserName: string
  content: string
  createdAt: string
  comments: FeedbackComment[]
}

// Storage keys
const USERS_KEY = "morning_sprint_users"
const TASKS_KEY = "morning_sprint_tasks"
const POSTS_KEY = "morning_sprint_posts"
const HISTORY_KEY = "morning_sprint_history"
const CURRENT_USER_KEY = "morning_sprint_current_user"
const FEEDBACKS_KEY = "morning_sprint_feedbacks"

// Helper functions
export const getUsers = (): User[] => {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(USERS_KEY)
  return data ? JSON.parse(data) : []
}

export const setUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export const getTasks = (): Task[] => {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(TASKS_KEY)
  return data ? JSON.parse(data) : []
}

export const setTasks = (tasks: Task[]) => {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

export const getPosts = (): Post[] => {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(POSTS_KEY)
  return data ? JSON.parse(data) : []
}

export const setPosts = (posts: Post[]) => {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts))
}

export const getHistory = (): SprintHistory[] => {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(HISTORY_KEY)
  return data ? JSON.parse(data) : []
}

export const setHistory = (history: SprintHistory[]) => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export const getFeedbacks = (): Feedback[] => {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(FEEDBACKS_KEY)
  return data ? JSON.parse(data) : []
}

export const setFeedbacks = (feedbacks: Feedback[]) => {
  localStorage.setItem(FEEDBACKS_KEY, JSON.stringify(feedbacks))
}

const safeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const addFeedback = (params: { toUserId: string; fromUserId: string; fromUserName: string; content: string }) => {
  const newFeedback: Feedback = {
    id: safeId(),
    toUserId: params.toUserId,
    fromUserId: params.fromUserId,
    fromUserName: params.fromUserName,
    content: params.content.trim(),
    createdAt: new Date().toISOString(),
    comments: [],
  }
  const feedbacks = getFeedbacks()
  setFeedbacks([newFeedback, ...feedbacks])
  return newFeedback
}

export const addFeedbackComment = (params: {
  feedbackId: string
  fromUserId: string
  fromUserName: string
  content: string
}) => {
  const feedbacks = getFeedbacks()
  const idx = feedbacks.findIndex((f) => f.id === params.feedbackId)
  if (idx === -1) return null

  const next = [...feedbacks]
  const target = { ...next[idx] }
  const newComment: FeedbackComment = {
    id: safeId(),
    feedbackId: params.feedbackId,
    fromUserId: params.fromUserId,
    fromUserName: params.fromUserName,
    content: params.content.trim(),
    createdAt: new Date().toISOString(),
  }
  target.comments = [...(target.comments ?? []), newComment]
  next[idx] = target
  setFeedbacks(next)
  return newComment
}

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null
  const data = localStorage.getItem(CURRENT_USER_KEY)
  return data ? JSON.parse(data) : null
}

export const setCurrentUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(CURRENT_USER_KEY)
  }
}

// Initialize with mock admin user if empty
export const initializeDB = () => {
  const users = getUsers()
  if (users.length === 0) {
    const adminUser: User = {
      id: "1",
      email: "admin@morningsprint.com",
      password: "admin123", // Mock password
      name: "Admin User",
      createdAt: new Date().toISOString(),
      isAdmin: true,
    }
    setUsers([adminUser])
  }
}
