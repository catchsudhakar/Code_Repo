import { Bell, CircleHelp, Menu, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-[58px] items-center gap-3 border-b border-[#dce5f4] bg-white px-4 sm:px-7">
      <Button aria-label="Open navigation" className="lg:hidden" onClick={onMenuClick} size="icon" variant="ghost"><Menu /></Button>
      <div className="relative hidden w-full max-w-[380px] sm:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input aria-label="Search students and batches" className="h-9 rounded-md border-slate-300 bg-white pl-9 text-xs shadow-sm" placeholder="Search students, batches..." /></div>
      <div className="ml-auto flex items-center gap-2">
        <Button aria-label="Search" className="sm:hidden" size="icon" variant="ghost"><Search /></Button>
        <Button aria-label="Notifications" className="text-slate-600" size="icon" variant="ghost"><Bell className="size-[18px]" /></Button>
        <Button aria-label="Help" className="text-slate-600" size="icon" variant="ghost"><CircleHelp className="size-[18px]" /></Button>
        <Avatar size="sm"><AvatarFallback className="bg-[#10233f] text-[10px] font-bold text-white">SM</AvatarFallback></Avatar>
      </div>
    </header>
  );
}
