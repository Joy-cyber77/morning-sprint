export type MorningTaskCategory = "learning" | "meditation" | "reading" | "academy" | "workout" | "other"

export type MorningTask = {
  id: string
  userId: string
  userName: string
  content: string
  category: MorningTaskCategory
  completed: boolean
  completedAt?: string
  isShared: boolean
  sharedAt?: string
  createdAt: string
  updatedAt: string
  legacyId?: string | null
}

export type MorningTaskWithLikes = MorningTask & {
  likesCount: number
  likedByMe: boolean
}

export type MorningFeedbackComment = {
  id: string
  feedbackId: string
  fromUserId: string
  fromUserName: string
  content: string
  createdAt: string
  legacyId?: string | null
}

export type MorningFeedback = {
  id: string
  toUserId: string
  fromUserId: string
  fromUserName: string
  content: string
  createdAt: string
  legacyId?: string | null
  comments: MorningFeedbackComment[]
}


