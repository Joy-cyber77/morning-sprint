import { type User, getUsers, setUsers, getCurrentUser, setCurrentUser, initializeDB } from "./mock-db"

export const signup = async (
  email: string,
  password: string,
  name: string,
): Promise<{ user?: User; error?: string }> => {
  initializeDB()
  const users = getUsers()

  if (users.find((u) => u.email === email)) {
    return { error: "Email already exists" }
  }

  const newUser: User = {
    id: Date.now().toString(),
    email,
    password, // In production, this would be hashed
    name,
    createdAt: new Date().toISOString(),
    isAdmin: false,
  }

  setUsers([...users, newUser])
  setCurrentUser(newUser)

  return { user: newUser }
}

export const login = async (email: string, password: string): Promise<{ user?: User; error?: string }> => {
  initializeDB()
  const users = getUsers()
  const user = users.find((u) => u.email === email && u.password === password)

  if (!user) {
    return { error: "Invalid email or password" }
  }

  setCurrentUser(user)
  return { user }
}

export const logout = () => {
  setCurrentUser(null)
}

export const getAuthUser = (): User | null => {
  return getCurrentUser()
}
