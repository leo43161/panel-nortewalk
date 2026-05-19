import { cn } from "@/lib/utils"

type Props = {
  className?: string
  /** When true, draws on a brand background tile. */
  tile?: boolean
}

/**
 * Norte Walk mark: two mountain ridges with a sun, matching the public site identity.
 */
export function BrandLogo({ className, tile = false }: Props) {
  if (tile) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-xl bg-[#40513B] shadow-sm",
          className
        )}
      >
        <BrandMark className="size-[60%]" />
      </span>
    )
  }
  return <BrandMark className={className} />
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="349.678" cy="140.613" r="40.211" fill="#E67E22" />
      <path
        d="M 24.889 403.536 L 148.617 217.945 L 241.414 295.274 L 318.745 202.477 L 457.94 403.536"
        stroke="#E5D9B6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeWidth="22"
      />
    </svg>
  )
}
