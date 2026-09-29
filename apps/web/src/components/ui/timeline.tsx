import * as React from "react"
import { cn } from "@/lib/utils"

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Timeline({ className, ...props }: TimelineProps) {
  return (
    <div className={cn("relative border-l-2 border-muted pl-4 ml-2 space-y-6", className)} {...props} />
  )
}

export interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  date?: string
  icon?: React.ReactNode
  isActive?: boolean
}

export function TimelineItem({ className, title, description, date, icon, isActive, ...props }: TimelineItemProps) {
  return (
    <div className={cn("relative", className)} {...props}>
      <div className={cn(
        "absolute -left-[25px] flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background",
        isActive ? "border-primary text-primary" : "border-muted text-muted-foreground"
      )}>
        {icon || <div className={cn("h-2 w-2 rounded-full", isActive ? "bg-primary" : "bg-muted-foreground")} />}
      </div>
      <div className="flex flex-col gap-1">
        <h4 className={cn("text-sm font-semibold leading-none", isActive && "text-primary")}>{title}</h4>
        {date && <span className="text-xs text-muted-foreground">{date}</span>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}
