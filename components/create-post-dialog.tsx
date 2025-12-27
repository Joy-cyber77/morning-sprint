"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { type Post, getPosts, setPosts } from "@/lib/mock-db"

interface CreatePostDialogProps {
  onPostCreated?: () => void
}

export function CreatePostDialog({ onPostCreated }: CreatePostDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [category, setCategory] = useState<Post["category"]>("reading")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !content.trim()) return

    const newPost: Post = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      content: content.trim(),
      category,
      createdAt: new Date().toISOString(),
      likes: [],
    }

    const posts = getPosts()
    setPosts([newPost, ...posts])

    setContent("")
    setCategory("reading")
    setOpen(false)
    onPostCreated?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Share Your Morning
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Your Morning Activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">
              Category
            </label>
            <Select value={category} onValueChange={(value) => setCategory(value as Post["category"])}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="workout">Workout</SelectItem>
                <SelectItem value="meditation">Meditation</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              What did you accomplish?
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your morning win..."
              rows={4}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!content.trim()}>
              Post
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
