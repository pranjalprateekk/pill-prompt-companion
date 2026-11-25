import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pill, Bell, LogOut, Plus, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "My medicines — MediMinder" }, { name: "description", content: "Your medicine schedule and reminders." }] }),
  component: Dashboard,
});

const today = () => new Date().toLocaleDateString("en-CA");
const nowHM = () => new Date().toTimeString().slice(0, 5);

function Dashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const meds = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("medicines").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const logs = useQuery({
    queryKey: ["logs", today()],
    queryFn: async () => {
      const { data, error } = await supabase.from("dose_logs").select("*").eq("taken_on", today());
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [notes, setNotes] = useState("");
  const [perm, setPerm] = useState<string>("default");
  const fired = useRef(new Set<string>());

  useEffect(() => { if ("Notification" in window) setPerm(Notification.permission); }, []);

  // reminder loop
  useEffect(() => {
    const tick = () => {
      const hm = nowHM();
      for (const m of meds.data ?? []) {
        for (const t of m.times) {
          const key = `${m.id}-${t}-${today()}`;
          const taken = logs.data?.some((l) => l.medicine_id === m.id && l.dose_time === t);
          if (t === hm && !taken && !fired.current.has(key)) {
            fired.current.add(key);
            const msg = `Time to take ${m.name}${m.dosage ? ` (${m.dosage})` : ""}`;
            toast(msg, { duration: 60000 });
            if ("Notification" in window && Notification.permission === "granted") new Notification("MediMinder", { body: msg });
          }
        }
      }
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [meds.data, logs.data]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const clean = times.filter(Boolean).sort();
    const { error } = await supabase.from("medicines").insert({ name, dosage, times: clean, notes });
    if (error) { toast.error(error.message); return; }
    setName(""); setDosage(""); setTimes(["08:00"]); setNotes("");
    toast.success("Medicine added");
    qc.invalidateQueries({ queryKey: ["medicines"] });
  }

  async function remove(id: string) {
    await supabase.from("medicines").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["medicines"] });
  }

  async function toggle(medId: string, t: string) {
    const existing = logs.data?.find((l) => l.medicine_id === medId && l.dose_time === t);
    if (existing) await supabase.from("dose_logs").delete().eq("id", existing.id);
    else await supabase.from("dose_logs").insert({ medicine_id: medId, dose_time: t, taken_on: today() });
    qc.invalidateQueries({ queryKey: ["logs"] });
  }

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const doses = (meds.data ?? []).flatMap((m) => m.times.map((t) => ({ m, t }))).sort((a, b) => a.t.localeCompare(b.t));
  const takenCount = doses.filter(({ m, t }) => logs.data?.some((l) => l.medicine_id === m.id && l.dose_time === t)).length;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-xl font-bold text-primary"><Pill className="h-6 w-6 text-accent" /> MediMinder</div>
        <div className="flex gap-2">
          {perm !== "granted" && (
            <Button variant="outline" size="sm" onClick={async () => setPerm(await Notification.requestPermission())}>
              <Bell className="h-4 w-4" /> Enable alerts
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-8 px-6 pb-16 md:grid-cols-[1fr_340px]">
        <section>
          <h1 className="text-4xl font-bold">Today</h1>
          <p className="mt-1 text-muted-foreground">{takenCount} of {doses.length} doses taken</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-success transition-all" style={{ width: `${doses.length ? (takenCount / doses.length) * 100 : 0}%` }} />
          </div>
          <ul className="mt-6 space-y-3">
            {doses.length === 0 && <li className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">No medicines yet — add your first one.</li>}
            {doses.map(({ m, t }) => {
              const taken = logs.data?.some((l) => l.medicine_id === m.id && l.dose_time === t);
              return (
                <li key={m.id + t} className={`flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft ${taken ? "opacity-60" : ""}`}>
                  <div className="w-16 text-lg font-bold text-primary">{t}</div>
                  <div className="flex-1">
                    <div className={`font-semibold ${taken ? "line-through" : ""}`}>{m.name}</div>
                    <div className="text-sm text-muted-foreground">{[m.dosage, m.notes].filter(Boolean).join(" · ")}</div>
                  </div>
                  <Button size="sm" variant={taken ? "outline" : "default"} onClick={() => toggle(m.id, t)}>
                    <Check className="h-4 w-4" /> {taken ? "Taken" : "Mark taken"}
                  </Button>
                </li>
              );
            })}
          </ul>
          {(meds.data?.length ?? 0) > 0 && (
            <>
              <h2 className="mt-10 text-2xl font-bold">My medicines</h2>
              <ul className="mt-4 space-y-2">
                {meds.data!.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                    <span><b>{m.name}</b> <span className="text-sm text-muted-foreground">{m.times.join(", ")}</span></span>
                    <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <aside>
          <form onSubmit={add} className="space-y-4 rounded-3xl border bg-card p-6 shadow-soft">
            <h2 className="text-2xl font-bold">Add medicine</h2>
            <div><Label htmlFor="n">Name</Label><Input id="n" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Paracetamol" /></div>
            <div><Label htmlFor="d">Dose</Label><Input id="d" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="1 tablet, 500mg" /></div>
            <div>
              <Label>Times</Label>
              <div className="mt-1 space-y-2">
                {times.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <Input type="time" required value={t} onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))} />
                    {times.length > 1 && <Button type="button" size="icon" variant="ghost" aria-label="Remove time" onClick={() => setTimes(times.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setTimes([...times, "20:00"])}><Plus className="h-4 w-4" /> Add time</Button>
              </div>
            </div>
            <div><Label htmlFor="no">Notes</Label><Input id="no" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="After food" /></div>
            <Button type="submit" className="w-full">Save medicine</Button>
          </form>
        </aside>
      </main>
    </div>
  );
}
