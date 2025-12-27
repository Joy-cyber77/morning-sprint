"use client"

import { Card } from "@/components/ui/card"
import { SignUp } from "@clerk/nextjs"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex justify-center">
          <SignUp />
        </div>
      </Card>
    </div>
  )
}
