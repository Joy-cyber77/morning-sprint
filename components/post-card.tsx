"use client"

import type { Post } from "@/lib/mock-db"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/components/auth-provider"
import { getPosts, setPosts } from "@/lib/mock-db"
import { useState } from "react"

const categoryColors = {
  reading: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  workout: "bg-red-500/10 text-red-500 border-red-500/20",
  meditation: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  learning: "bg-green-500/10 text-green-500 border-green-500/20",
  other: "bg-accent/10 text-accent-foreground border-accent/20",
}

interface PostCardProps {
  post: Post
  onUpdate?: () => void
}

export function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth()
  const [isLiked, setIsLiked] = useState(post.likes.includes(user?.id || ""))
  const [likesCount, setLikesCount] = useState(post.likes.length)

  const handleLike = () => {
    if (!user) return

    const posts = getPosts()
    const postIndex = posts.findIndex((p) => p.id === post.id)

    if (postIndex !== -1) {
      const updatedPost = { ...posts[postIndex] }

      if (updatedPost.likes.includes(user.id)) {
        updatedPost.likes = updatedPost.likes.filter((id) => id !== user.id)
        setIsLiked(false)
        setLikesCount((prev) => prev - 1)
      } else {
        updatedPost.likes.push(user.id)
        setIsLiked(true)
        setLikesCount((prev) => prev + 1)
      }

      posts[postIndex] = updatedPost
      setPosts(posts)
      onUpdate?.()
    }
  }

  const handleDelete = () => {
    if (!user) return

    const posts = getPosts()
    const filteredPosts = posts.filter((p) => p.id !== post.id)
    setPosts(filteredPosts)
    onUpdate?.()
  }

  const canDelete = user?.id === post.userId || user?.isAdmin

  return (
    <Card className="p-4 space-y-3 hover:bg-card/80 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{post.userName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm leading-relaxed">{post.content}</p>
          <div
            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${categoryColors[post.category]}`}
          >
            {post.category}
          </div>
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button variant="ghost" size="sm" className={`gap-2 ${isLiked ? "text-red-500" : ""}`} onClick={handleLike}>
          <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500" : ""}`} />
          <span className="text-xs">{likesCount}</span>
        </Button>
      </div>
    </Card>
  )
}
