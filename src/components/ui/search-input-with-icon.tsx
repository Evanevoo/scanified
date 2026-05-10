import { Input } from "@/components/ui/input";
import { ArrowRight, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Same pill style as the main nav omnibar (`MainLayout`). Use for all page-level filter searches. */
export const APP_SHELL_SEARCH_INPUT_CLASSNAME =
  "h-11 min-h-[44px] w-full rounded-full border-slate-200/80 bg-white/90 pl-4 pr-4 shadow-[0_10px_36px_rgba(99,102,241,0.09)] transition-shadow placeholder:text-slate-400 focus-visible:shadow-[0_12px_42px_rgba(64,181,173,0.12)]";

interface SearchInputWithIconProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  onClear?: () => void;
  showSubmitButton?: boolean;
  onSubmit?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const SearchInputWithIcon = React.forwardRef<HTMLInputElement, SearchInputWithIconProps>(
  ({ className, onClear, showSubmitButton = false, onSubmit, value, onChange, onKeyPress, onFocus, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const hasValue = value && String(value).length > 0;
    const paddingRight = hasValue && onClear ? 'pe-16' : showSubmitButton ? 'pe-9' : 'pe-9';

    return (
      <div className="relative w-full">
        <Input
          ref={inputRef}
          type="search"
          value={value}
          onChange={onChange}
          onKeyPress={onKeyPress}
          onFocus={onFocus}
          className={cn(
            "peer",
            paddingRight,
            className
          )}
          {...props}
        />
        {onClear && hasValue && (
          <button
            type="button"
            onClick={onClear}
            className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Clear search"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
        {showSubmitButton && (!onClear || !hasValue) && (
          <button
            type="submit"
            onClick={onSubmit}
            className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Submit search"
          >
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    );
  },
);
SearchInputWithIcon.displayName = "SearchInputWithIcon";

/** Nav-matching search field (clear button + omnibar styling). Pass `placeholder`, `value`, `onChange`, optional `onClear`. */
const PageSearchInput = React.forwardRef<
  HTMLInputElement,
  SearchInputWithIconProps & { className?: string }
>(({ className, ...props }, ref) => (
  <SearchInputWithIcon
    ref={ref}
    className={cn(APP_SHELL_SEARCH_INPUT_CLASSNAME, className)}
    {...props}
  />
));
PageSearchInput.displayName = "PageSearchInput";

export { SearchInputWithIcon, PageSearchInput };
