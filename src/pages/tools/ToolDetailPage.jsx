import { useParams } from 'react-router-dom'

export default function ToolDetailPage() {
  const { id } = useParams()

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Tool Detail Page</h1>
        <p className="text-lg">Tool ID: {id}</p>
      </div>
    </div>
  )
}
