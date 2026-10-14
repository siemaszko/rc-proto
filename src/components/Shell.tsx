import { BarChart3, FlaskConical, LayoutGrid, Menu, PanelsTopLeft, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Overview", icon: LayoutGrid, active: true },
  { label: "Charts", icon: BarChart3 },
  { label: "Customers", icon: Users },
  { label: "Paywalls", icon: PanelsTopLeft },
  { label: "Experiments", icon: FlaskConical },
  { label: "Settings", icon: Settings },
];

function Brand() {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-white">
      <span className="grid size-6 place-items-center rounded-md bg-indigo-600 text-xs">rc</span>
      rc-proto
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-[220px] shrink-0 bg-neutral-900 md:block">
      <div className="sticky top-0 flex flex-col gap-6 px-3 py-5">
        <div className="px-2"><Brand /></div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ label, icon: Icon, active }) => (
            <a
              key={label}
              href="#"
              onClick={(e) => e.preventDefault()}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100",
                active && "bg-neutral-800 text-white",
              )}
            >
              <Icon className={cn("size-4", active && "text-indigo-400")} />
              {label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export function TopBar() {
  return (
    <header className="flex h-12 items-center justify-between bg-neutral-900 px-4 md:hidden">
      <Brand />
      <button aria-label="Menu" className="text-neutral-300"><Menu className="size-5" /></button>
    </header>
  );
}
