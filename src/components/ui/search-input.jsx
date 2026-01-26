import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoaderCircle, Mic, Search, X } from "lucide-react"
import { useId } from "react"
import { cn } from "@/lib/utils"

/**
 * Search input with optional loading indicator, clear button, and mic button.
 * Use for all search bars across the app.
 *
 * @param {string} [label] - Optional label (uses useId if id not provided)
 * @param {string} [id] - Input id for label
 * @param {boolean} [loading] - Show loader instead of search icon
 * @param {function} [onClear] - If provided, show clear button when value is non-empty
 * @param {function} [onMicClick] - If provided, show mic button on the right
 * @param {string} [className] - Wrapper class (e.g. for min-w)
 * @param {string} [inputClassName] - Input element class (e.g. peer pe-9 ps-9)
 */
function SearchInput({
  label,
  id: idProp,
  value,
  onChange,
  placeholder = "Search...",
  loading = false,
  onClear,
  onMicClick,
  className,
  inputClassName,
  disabled,
  ...rest
}) {
  const generatedId = useId()
  const id = idProp ?? generatedId

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn("peer pe-9 pl-10", inputClassName)}
          {...rest}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-muted-foreground/80",
            disabled && "opacity-50",
          )}
        >
          {loading ? (
            <LoaderCircle
              className="animate-spin"
              size={16}
              strokeWidth={2}
              role="status"
              aria-label="Loading..."
            />
          ) : (
            <Search size={16} strokeWidth={2} aria-hidden="true" />
          )}
        </div>
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70"
            aria-label="Clear search"
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
        {onMicClick && !(onClear && value) && (
          <button
            type="button"
            onClick={onMicClick}
            className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Press to speak"
          >
            <Mic size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

export { SearchInput }
