import { SkeletonRows } from "@/components/states/loading-state"

export default function Loading() {
  return (
    <div className="p-8">
      <SkeletonRows count={4} className="max-w-md" />
    </div>
  )
}
