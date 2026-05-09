import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import {
  IoHomeOutline,
  IoVideocamOutline,
  IoCameraOutline,
  IoShareSocialOutline,
  IoHeartOutline,
} from "react-icons/io5";
import { cn } from "@/lib/utils";

export interface GradientMenuItem {
  title: string;
  icon: ReactNode;
  gradientFrom: string;
  gradientTo: string;
  /** Stable id for keys and action routing (recommended when using `onAction`) */
  id?: string;
  /** When set with `onNavigate`, activates client navigation */
  path?: string;
  /** When set with `onAction`, calls `onAction(action)` (e.g. toolbar commands) */
  action?: string;
  disabled?: boolean;
}

const defaultMenuItems: GradientMenuItem[] = [
  {
    id: "home",
    title: "Home",
    icon: <IoHomeOutline />,
    gradientFrom: "#a955ff",
    gradientTo: "#ea51ff",
  },
  {
    id: "video",
    title: "Video",
    icon: <IoVideocamOutline />,
    gradientFrom: "#56CCF2",
    gradientTo: "#2F80ED",
  },
  {
    id: "photo",
    title: "Photo",
    icon: <IoCameraOutline />,
    gradientFrom: "#FF9966",
    gradientTo: "#FF5E62",
  },
  {
    id: "share",
    title: "Share",
    icon: <IoShareSocialOutline />,
    gradientFrom: "#80FF72",
    gradientTo: "#7EE8FA",
  },
  {
    id: "tym",
    title: "Tym",
    icon: <IoHeartOutline />,
    gradientFrom: "#ffa9c6",
    gradientTo: "#f434e2",
  },
];

export interface GradientMenuProps {
  items?: GradientMenuItem[];
  /** Outer wrapper; default is full-viewport centered strip */
  className?: string;
  /** Smaller orbits for dense toolbars (e.g. Rentals page) */
  variant?: "default" | "compact";
  onNavigate?: (path: string) => void;
  onAction?: (action: string) => void;
}

function itemKey(item: GradientMenuItem, index: number): string {
  return item.id ?? item.action ?? item.path ?? `${item.title}-${index}`;
}

export default function GradientMenu({
  items = defaultMenuItems,
  className,
  variant = "default",
  onNavigate,
  onAction,
}: GradientMenuProps) {
  const compact = variant === "compact";

  const activate = (item: GradientMenuItem) => {
    if (item.disabled) return;
    if (item.path && onNavigate) {
      onNavigate(item.path);
      return;
    }
    if (item.action && onAction) {
      onAction(item.action);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>, item: GradientMenuItem) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (canActivate(item)) activate(item);
  };

  const canActivate = (item: GradientMenuItem) =>
    !item.disabled &&
    ((item.path && onNavigate !== undefined) ||
      (item.action && onAction !== undefined));

  return (
    <div
      className={cn(
        "flex justify-center items-center min-h-screen bg-neutral-950",
        className
      )}
    >
      <ul
        className={cn(
          "flex flex-wrap justify-center px-2 sm:px-4",
          compact ? "gap-3" : "gap-6"
        )}
      >
        {items.map((item, index) => {
          const { title, icon, gradientFrom, gradientTo } = item;
          const interactive = canActivate(item);

          return (
            <li
              key={itemKey(item, index)}
              role={interactive ? "button" : undefined}
              tabIndex={interactive && !item.disabled ? 0 : undefined}
              aria-disabled={item.disabled ? true : undefined}
              style={
                {
                  "--gradient-from": gradientFrom,
                  "--gradient-to": gradientTo,
                } as CSSProperties
              }
              className={cn(
                "relative bg-white shadow-lg rounded-full flex items-center justify-center transition-all duration-500 group",
                compact
                  ? "w-12 h-12 hover:w-[130px] hover:shadow-none"
                  : "w-[60px] h-[60px] hover:w-[180px] hover:shadow-none",
                item.disabled
                  ? "opacity-40 cursor-not-allowed pointer-events-none"
                  : interactive
                    ? "cursor-pointer"
                    : "cursor-default"
              )}
              onClick={() => interactive && activate(item)}
              onKeyDown={(e) => interactive && !item.disabled && onKeyDown(e, item)}
            >
              <span className="absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] opacity-0 transition-all duration-500 group-hover:opacity-100" />
              <span className="absolute top-[10px] inset-x-0 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] blur-[15px] opacity-0 -z-10 transition-all duration-500 group-hover:opacity-50" />

              <span className="relative z-10 transition-all duration-500 group-hover:scale-0 delay-0 [&_svg]:block">
                <span
                  className={cn(
                    "text-gray-500",
                    compact ? "text-xl" : "text-2xl"
                  )}
                >
                  {icon}
                </span>
              </span>

              <span className="absolute inset-x-1 text-white uppercase tracking-wide text-center transition-all duration-500 scale-0 group-hover:scale-100 delay-150 whitespace-normal leading-tight pointer-events-none text-[10px] sm:text-xs">
                {title}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
