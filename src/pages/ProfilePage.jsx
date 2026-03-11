import { useAuth } from '@/store/AuthContext'

export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Profile Page</h1>
        <p className="text-lg">User: {user?.email}</p>
      </div>
    </div>
  )
}
