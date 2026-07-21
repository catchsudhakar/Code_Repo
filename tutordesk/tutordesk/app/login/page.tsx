"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirect: false });
    setIsSubmitting(false);
    if (result?.error) { setError("Email or password is incorrect."); return; }
    router.push("/"); router.refresh();
  }

  return <main className="grid min-h-screen place-items-center bg-[#f7f9ff] px-4 py-10"><div className="w-full max-w-md"><div className="mb-7 flex justify-center"><div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-[#0764ce] text-lg font-bold text-white">T</div><div><p className="text-2xl font-extrabold leading-6 tracking-tight text-[#0560bd]">TutorDesk</p><p className="text-xs font-semibold text-slate-500">Management Portal</p></div></div></div><Card className="gap-0 border-0 bg-white py-0 shadow-[0_8px_30px_rgba(15,35,65,0.10)]"><CardContent className="px-7 py-8 sm:px-9"><h1 className="text-2xl font-bold text-[#10233f]">Welcome back</h1><p className="mt-2 text-sm text-slate-500">Sign in to manage your tuition business.</p><form className="mt-7 space-y-5" onSubmit={submit}><label className="block"><span className="text-xs font-bold text-[#10233f]">Email</span><div className="relative mt-2"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input autoComplete="email" className="h-11 border-slate-200 pl-10" name="email" required type="email" /></div></label><label className="block"><span className="text-xs font-bold text-[#10233f]">Password</span><div className="relative mt-2"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input autoComplete="current-password" className="h-11 border-slate-200 pl-10" minLength={8} name="password" required type="password" /></div></label>{error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</div> : null}<Button className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700" disabled={isSubmitting} type="submit">{isSubmitting ? "Signing in..." : "Sign in"}</Button></form></CardContent></Card></div></main>;
}
