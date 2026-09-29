import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "./input"
import { cn } from "@/lib/utils"

export interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className={cn("relative", className)}>
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          className="pl-9"
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
SearchField.displayName = "SearchField"

export { SearchField }
