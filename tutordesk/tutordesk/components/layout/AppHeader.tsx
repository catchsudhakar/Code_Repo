import { Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AppHeader({ onMenuClick, userName }: { onMenuClick: () => void; userName?: string }) {
  const initials = userName?.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "TD";
  return (
    <header className="sticky top-0 z-20 flex h-[58px] items-center gap-3 border-b border-[#dce5f4] bg-white px-4 sm:px-7">
      <Button aria-label="Open navigation" className="lg:hidden" onClick={onMenuClick} size="icon" variant="ghost"><Menu /></Button>
      <div className="ml-auto flex items-center gap-2">
        {userName ? <span className="hidden text-xs font-semibold text-slate-600 sm:inline">{userName}</span> : null}
        <Avatar size="sm"><AvatarFallback className="bg-[#10233f] text-[10px] font-bold text-white">{initials}</AvatarFallback></Avatar>
      </div>
    </header>
  );
}
