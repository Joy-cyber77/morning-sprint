"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { addTask } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AddTaskForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const disabled = useMemo(() => !name.trim(), [name])

  async function onSubmit() {
    await addTask(name)
    setName("")
    router.refresh()
  }

  return (
    <form action={onSubmit} className="flex items-center gap-2">
      <Input
        autoFocus
        name="name"
        placeholder="새 task 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button type="submit" disabled={disabled}>
        추가
      </Button>
    </form>
  )
}


