import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronRight, Clock3, Download, ExternalLink,
  History, Loader2, LogOut, MapPin, Menu, Pencil, Phone, PhoneCall, PhoneOutgoing, Plus,
  Shield, ShieldAlert, ShieldCheck, Siren, Trash2, Users, X, UserMinus, CarFront,
  Navigation, Radio, MessageSquare, Star, Copy, Share2, AlertCircle, Camera, CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { LeafletMap } from "@/components/Map";

const formatDate = (value: Date | string | number | null | undefined) => value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
type View = "overview" | "location" | "contacts" | "travel" | "nearby" | "community" | "fakecall" | "alerts" | "checkins" | "privacy" | "reportPerson" | "reportVehicle";
type LocationState = { latitude: number; longitude: number; accuracy?: number; timestamp: number };
type ContactForm = { name: string; phone: string; email: string; relationship: string; priority: number; notifySms: boolean; notifyEmail: boolean; notifyWhatsApp: boolean; isNextOfKin: boolean };

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-200">
        <ShieldCheck size={22} strokeWidth={2.5} />
      </div>
      <div>
        <div className="font-display text-lg font-bold tracking-tight text-slate-950">SurakshaShe</div>
        {!compact && <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-600">Your safety, your circle</div>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
      />
    </label>
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [login, setLogin] = useState({ email: "", password: "" });
  const [register, setRegister] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const loginMutation = trpc.auth.login.useMutation({ onSuccess: onAuthenticated });
  const registerMutation = trpc.auth.register.useMutation({ onSuccess: onAuthenticated });
  const error = loginMutation.error?.message || registerMutation.error?.message;
  const pending = loginMutation.isPending || registerMutation.isPending;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (tab === "login") {
      loginMutation.mutate(login);
    } else {
      if (register.password !== register.confirm) {
        toast.error("Passwords do not match");
        return;
      }
      registerMutation.mutate({ name: register.name, email: register.email, phone: register.phone, password: register.password });
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbf8f7] text-slate-900">
      <div className="fixed right-5 top-5 z-10 flex gap-3 text-xs font-bold text-slate-500">
        <Link href="/welcome" className="hover:text-rose-700">About SurakshaShe</Link>
        <Link href="/privacy" className="hover:text-rose-700">Privacy</Link>
      </div>
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-rose-600/30 blur-3xl" />
          <div className="absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-violet-500/20 blur-3xl" />
          <Brand />
          <div className="relative max-w-xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-200">
              <Shield size={15} /> Built for everyday confidence
            </p>
            <h1 className="font-display text-6xl font-semibold leading-[0.98] tracking-[-0.05em] text-white xl:text-7xl">
              Safety is stronger when your circle is ready.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-slate-300">
              Keep the people you trust close, share your location when it matters, and make a clear plan before you need it.
            </p>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                { icon: Siren, label: "SOS alerts" },
                { icon: MapPin, label: "Live location" },
                { icon: Users, label: "Trusted contacts" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <Icon className="mb-8 text-rose-300" size={20} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="relative text-sm text-slate-400">A calm plan for the moments that need clarity.</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden"><Brand /></div>
            <div className="mb-8">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-rose-600">Private safety workspace</p>
              <h2 className="font-display text-4xl font-semibold tracking-tight text-slate-950">Take your safety with you.</h2>
              <p className="mt-3 leading-7 text-slate-500">Create an account to set up your emergency circle and access your safety tools.</p>
            </div>
            <div className="mb-6 flex rounded-2xl bg-slate-100 p-1">
              {(["login", "register"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${tab === item ? "bg-white text-rose-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {item === "login" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="space-y-4">
              {tab === "register" && (
                <Field label="Full name" value={register.name} onChange={(value) => setRegister({ ...register, name: value })} placeholder="e.g. Ananya Sharma" />
              )}
              <Field label="Email address" type="email" value={tab === "login" ? login.email : register.email} onChange={(value) => tab === "login" ? setLogin({ ...login, email: value }) : setRegister({ ...register, email: value })} placeholder="you@example.com" />
              {tab === "register" && (
                <Field label="Phone number" type="tel" value={register.phone} onChange={(value) => setRegister({ ...register, phone: value })} placeholder="Your reachable number" />
              )}
              <Field label="Password" type="password" value={tab === "login" ? login.password : register.password} onChange={(value) => tab === "login" ? setLogin({ ...login, password: value }) : setRegister({ ...register, password: value })} placeholder="At least 8 characters with a number" />
              {tab === "register" && (
                <Field label="Confirm password" type="password" value={register.confirm} onChange={(value) => setRegister({ ...register, confirm: value })} placeholder="Repeat your password" />
              )}
              {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
              <button
                type="submit"
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
              >
                {pending ? <Loader2 className="animate-spin" size={18} /> : tab === "login" ? <ArrowRight size={18} /> : <ShieldCheck size={18} />}
                {tab === "login" ? "Enter my safety space" : "Create my account"}
              </button>
            </form>
            {tab === "login" && (
              <Link href="/forgot-password" className="mt-4 block text-center text-sm font-bold text-rose-700 hover:text-rose-900">Forgot password?</Link>
            )}
            <p className="mt-8 flex items-start gap-2 text-xs leading-5 text-slate-400">
              <Shield size={15} className="mt-0.5 shrink-0 text-emerald-600" /> SurakshaShe complements—not replaces—local emergency services.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function Home() {
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const user = meQuery.data;
  const [view, setView] = useState<View>("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [locationError, setLocationError] = useState("");
  const [calling, setCalling] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [emergencyLink, setEmergencyLink] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>({ name: "", phone: "", email: "", relationship: "", priority: 1, notifySms: true, notifyEmail: true, notifyWhatsApp: false, isNextOfKin: false });
  const [activeIncidentId, setActiveIncidentId] = useState<number | null>(null);

  const contactsQuery = trpc.contacts.list.useQuery(undefined, { enabled: Boolean(user), refetchOnWindowFocus: false });
  const alertsQuery = trpc.sos.list.useQuery(undefined, { enabled: Boolean(user), refetchOnWindowFocus: false });
  const checkInsQuery = trpc.checkIns.list.useQuery(undefined, { enabled: Boolean(user), refetchOnWindowFocus: false });
  const addContact = trpc.contacts.create.useMutation({ onSuccess: () => { contactsQuery.refetch(); resetContact(); toast.success("Emergency contact added"); } });
  const updateContact = trpc.contacts.update.useMutation({ onSuccess: () => { contactsQuery.refetch(); resetContact(); toast.success("Contact updated"); } });
  const removeContact = trpc.contacts.remove.useMutation({ onSuccess: () => { contactsQuery.refetch(); toast.success("Contact removed"); } });
  const toggleNextOfKin = trpc.contacts.toggleNextOfKin.useMutation({ onSuccess: () => { contactsQuery.refetch(); toast.success("Next of Kin updated"); } });
  const createSos = trpc.sos.create.useMutation({ onSuccess: (result) => { setEmergencyLink(result.emergencyLink); setActiveIncidentId(result.alert.id); alertsQuery.refetch(); toast.success(result.alert.notificationStatus === "failed" ? "SOS saved, but no notification provider is configured." : "SOS saved; notifications are queued for delivery."); } });
  const updateLocation = trpc.sos.updateLocation.useMutation({ onSuccess: () => { alertsQuery.refetch(); toast.success("Incident location updated"); } });
  const markSafe = trpc.sos.markSafe.useMutation({ onSuccess: () => { alertsQuery.refetch(); setEmergencyLink(""); setActiveIncidentId(null); toast.success("You are marked safe"); } });
  const cancelSos = trpc.sos.cancel.useMutation({ onSuccess: () => { alertsQuery.refetch(); setEmergencyLink(""); setActiveIncidentId(null); toast.success("SOS cancelled"); } });
  const resolveAlert = trpc.sos.resolve.useMutation({ onSuccess: () => { alertsQuery.refetch(); toast.success("Alert marked resolved"); } });
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => { utils.auth.me.setData(undefined, null); setView("overview"); } });
  const activeIncident = alertsQuery.data?.find((alert) => alert.status === "active" || alert.status === "acknowledged");

  useEffect(() => { if (!calling) return; const timer = window.setTimeout(() => setCalling(false), 45000); return () => window.clearTimeout(timer); }, [calling]);
  useEffect(() => { if (activeIncident?.id && !activeIncidentId) setActiveIncidentId(activeIncident.id); }, [activeIncident?.id, activeIncidentId]);
  useEffect(() => { if (countdown === null) return; if (countdown === 0) { setCountdown(null); void activateSOS(); return; } const timer = window.setTimeout(() => setCountdown((value) => value === null ? null : value - 1), 1000); return () => window.clearTimeout(timer); });

  const requestLocation = () => new Promise<LocationState>((resolve, reject) => {
    if (!navigator.geolocation) {
      const error = new Error("Location is not supported by this browser.");
      setLocationError(error.message);
      reject(error);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: Date.now() };
        setLocation(next);
        setLocationError("");
        resolve(next);
      },
      (error) => {
        const message = error.code === 1 ? "Location permission was denied. You can still call emergency services, but this browser cannot share GPS." : error.code === 2 ? "GPS is currently unavailable. Try again when you have a clearer signal." : error.code === 3 ? "Location timed out. Check your connection and try again." : "Location could not be obtained in this browser.";
        setLocationError(message);
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10_000 }
    );
  });

  const openView = (next: View) => {
    setView(next);
    setMobileNav(false);
    if (next === "location" && !location) void requestLocation().catch(() => undefined);
  };

  const activateSOS = async () => {
    try {
      const current = location ?? await requestLocation();
      createSos.mutate({ latitude: current.latitude, longitude: current.longitude, accuracy: current.accuracy, address: `${current.latitude.toFixed(5)}, ${current.longitude.toFixed(5)}` });
    } catch {
      toast.error("Unable to obtain your location. Please enable location permission or use emergency calling.");
    }
  };

  const handleSOS = () => {
    if (activeIncident) {
      toast.error("You already have an active SOS. Use I’m Safe before starting another.");
      return;
    }
    setCountdown(5);
  };

  const refreshActiveLocation = async () => {
    if (!activeIncidentId) return;
    try {
      const current = await requestLocation();
      updateLocation.mutate({ id: activeIncidentId, ...current });
    } catch {
      toast.error("Unable to update your location. Please check browser permission.");
    }
  };

  useEffect(() => {
    if (!activeIncidentId) return;
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const current = await requestLocation();
          updateLocation.mutate({ id: activeIncidentId, ...current });
        } catch {
          /* latest location remains visible */
        }
      })();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [activeIncidentId]);

  const resetContact = () => {
    setContactForm({ name: "", phone: "", email: "", relationship: "", priority: 1, notifySms: true, notifyEmail: true, notifyWhatsApp: false, isNextOfKin: false });
    setEditingId(null);
  };

  const submitContact = (event: React.FormEvent) => {
    event.preventDefault();
    if (editingId) updateContact.mutate({ id: editingId, ...contactForm });
    else addContact.mutate(contactForm);
  };

  const editContact = (contact: any) => setContactForm({
    name: contact.name,
    phone: contact.phone,
    email: contact.email ?? "",
    relationship: contact.relationship ?? "",
    priority: contact.priority ?? 1,
    notifySms: contact.notifySms ?? true,
    notifyEmail: contact.notifyEmail ?? true,
    notifyWhatsApp: contact.notifyWhatsApp ?? false,
    isNextOfKin: contact.isNextOfKin ?? false,
  });

  const beginEdit = (contact: any) => { setEditingId(contact.id); editContact(contact); };

  if (meQuery.isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#fbf8f7]"><Loader2 className="animate-spin text-rose-600" /></div>;
  if (!user) return <AuthScreen onAuthenticated={() => { utils.auth.me.invalidate(); }} />;

  const navItems: { id: View; label: string; icon: typeof MapPin }[] = [
    { id: "overview", label: "Overview", icon: ShieldCheck },
    { id: "location", label: "My location", icon: MapPin },
    { id: "contacts", label: "Trusted contacts", icon: Users },
    { id: "travel", label: "Travel safety", icon: Navigation },
    { id: "nearby", label: "Nearby alerts", icon: Radio },
    { id: "community", label: "Community safety", icon: MessageSquare },
    { id: "checkins", label: "Safety check-in", icon: Clock3 },
    { id: "fakecall", label: "Fake call", icon: PhoneCall },
    { id: "alerts", label: "Alert history", icon: History },
    { id: "reportPerson", label: "Report person", icon: UserMinus },
    { id: "reportVehicle", label: "Report vehicle", icon: CarFront },
    { id: "privacy", label: "Privacy & data", icon: Shield },
  ];

  const activeAlerts = alertsQuery.data?.filter((alert) => alert.status === "active" || alert.status === "acknowledged").length ?? 0;

  return (
    <div className="min-h-screen bg-[#fbf8f7] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#fbf8f7]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Brand compact />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-700">{user.name?.[0]?.toUpperCase() ?? "U"}</div>
              <span className="max-w-32 truncate text-sm font-semibold text-slate-700">{user.name}</span>
            </div>
            <button type="button" onClick={() => setMobileNav(!mobileNav)} aria-label="Open navigation" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 lg:hidden">
              <Menu size={19} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-5 py-7 sm:px-8 lg:py-10">
        <aside className={`${mobileNav ? "block" : "hidden"} fixed inset-x-4 top-[76px] z-20 max-h-[calc(100vh-90px)] overflow-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-xl lg:static lg:block lg:w-60 lg:shrink-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
          <div className="mb-6 hidden px-3 lg:block">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Safety workspace</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Your calm plan, ready when you need it.</p>
          </div>
          <nav className="space-y-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                onClick={() => openView(id)}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${view === id ? "bg-rose-600 text-white shadow-lg shadow-rose-200" : "text-slate-500 hover:bg-white hover:text-slate-900"}`}
              >
                <span className="flex items-center gap-3"><Icon size={18} />{label}</span>
                {id === "alerts" && activeAlerts > 0 && <span className={`rounded-full px-2 py-0.5 text-xs ${view === id ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700"}`}>{activeAlerts}</span>}
              </button>
            ))}
          </nav>
          <div className="mt-8 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => logout.mutate()} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-900">
              <LogOut size={18} /> Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {countdown !== null && <Countdown value={countdown} onCancel={() => setCountdown(null)} />}
          {emergencyLink && activeIncidentId && (
            <ActiveIncidentBanner
              link={emergencyLink}
              onSafe={() => window.confirm("Are you safe now? This will resolve the active incident.") && markSafe.mutate({ id: activeIncidentId })}
              onCancel={() => window.confirm("Cancel this SOS?") && cancelSos.mutate({ id: activeIncidentId })}
              onRefresh={refreshActiveLocation}
              pending={markSafe.isPending || cancelSos.isPending}
            />
          )}
          {view === "overview" && <Overview user={user} contactsCount={contactsQuery.data?.length ?? 0} alertsCount={alertsQuery.data?.length ?? 0} activeAlerts={activeAlerts} onSOS={handleSOS} sosPending={createSos.isPending} onView={openView} />}
          {view === "location" && <LocationPanel location={location} locationError={locationError} onRefresh={() => void requestLocation()} />}
          {view === "contacts" && (
            <ContactsPanel
              contacts={contactsQuery.data ?? []}
              form={contactForm}
              editingId={editingId}
              onChange={setContactForm}
              onSubmit={submitContact}
              onEdit={beginEdit}
              onRemove={(id) => { if (window.confirm("Remove this trusted contact?")) removeContact.mutate({ id }); }}
              onToggleNextOfKin={(id) => toggleNextOfKin.mutate({ id })}
              onCancel={resetContact}
              pending={addContact.isPending || updateContact.isPending}
            />
          )}
          {view === "travel" && <TravelSafetyPanel contacts={contactsQuery.data ?? []} />}
          {view === "nearby" && <NearbyAlertsPanel />}
          {view === "community" && <CommunitySafetyPanel />}
          {view === "checkins" && <CheckInsPanel checkIns={checkInsQuery.data ?? []} onRefresh={() => checkInsQuery.refetch()} />}
          {view === "fakecall" && <FakeCallPanel calling={calling} onStart={() => setCalling(true)} onAnswer={() => { setCalling(false); toast.success("Call answered. Take the time you need to get somewhere safe."); }} onReject={() => { setCalling(false); toast("Call ended"); }} />}
          {view === "alerts" && <AlertsPanel alerts={alertsQuery.data ?? []} onResolve={(id) => resolveAlert.mutate({ id, note: "Resolved from alert history." })} onSafe={(id) => window.confirm("Mark yourself safe?") && markSafe.mutate({ id })} />}
          {view === "reportPerson" && <ReportPersonPanel />}
          {view === "reportVehicle" && <ReportVehiclePanel />}
          {view === "privacy" && <PrivacyPanel />}
        </main>
      </div>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-slate-200 px-5 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>SurakshaShe is a personal safety companion.</span>
        <span className="flex items-center gap-2"><Phone size={13} /> <a href="tel:112" className="font-bold text-rose-600">Call India 112</a> for immediate danger.</span>
      </footer>
    </div>
  );
}

function Countdown({ value, onCancel }: { value: number; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-5 backdrop-blur-sm">
      <div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-[2rem] bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
          <ShieldAlert size={31} />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-rose-600">SOS preparing</p>
        <h2 className="mt-2 font-display text-3xl font-semibold text-slate-950">Sending in {value}s</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">We will request your current location and create an emergency incident. Cancel if this was accidental.</p>
        <button type="button" onClick={onCancel} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
          <X size={17} /> Cancel SOS
        </button>
      </div>
    </div>
  );
}

function ActiveIncidentBanner({ link, onSafe, onCancel, onRefresh, pending }: { link: string; onSafe: () => void; onCancel: () => void; onRefresh: () => void; pending: boolean }) {
  return (
    <div className="mb-7 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-950">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white">
            <Siren size={19} />
          </div>
          <div>
            <p className="font-bold">Active SOS incident</p>
            <p className="mt-1 text-sm leading-6 text-rose-800">Trusted contacts can use your secure emergency link. Notifications show their actual provider status.</p>
            <a href={link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 underline">
              Open emergency view <ExternalLink size={13} />
            </a>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onRefresh} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">Update location</button>
          <button type="button" onClick={onCancel} disabled={pending} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">Cancel</button>
          <button type="button" onClick={onSafe} disabled={pending} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">I’m Safe</button>
        </div>
      </div>
    </div>
  );
}

function Overview({ user, contactsCount, alertsCount, activeAlerts, onSOS, sosPending, onView }: { user: { name?: string | null; email?: string | null; phone?: string | null; emailVerifiedAt?: Date | string | null; phoneVerifiedAt?: Date | string | null }; contactsCount: number; alertsCount: number; activeAlerts: number; onSOS: () => void; sosPending: boolean; onView: (view: View) => void }) {
  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl shadow-slate-200 sm:px-10 sm:py-10">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-rose-600/25 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Your safety space is ready
            </p>
            <h1 className="font-display max-w-xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Good to see you, {user.name?.split(" ")[0] ?? "friend"}.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
              Keep your plan simple: know where you are, who you trust, and how to get their attention quickly.
            </p>
          </div>
          <button type="button" onClick={onSOS} disabled={sosPending} className="group flex items-center gap-3 rounded-2xl bg-rose-600 px-5 py-4 text-left font-bold shadow-lg shadow-rose-950/30 transition hover:bg-rose-500 disabled:opacity-70">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              {sosPending ? <Loader2 className="animate-spin" size={22} /> : <Siren size={22} />}
            </span>
            <span>
              <span className="block text-base">Send an SOS</span>
              <span className="block text-xs font-medium text-rose-100">5-second cancellation window</span>
            </span>
            <ChevronRight className="ml-2 transition group-hover:translate-x-1" size={18} />
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={Users} label="Trusted contacts" value={contactsCount} accent="rose" />
        <Metric icon={History} label="Alerts recorded" value={alertsCount} accent="violet" />
        <Metric icon={Siren} label="Active incidents" value={activeAlerts} accent="amber" />
      </div>

      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">Your toolkit</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">Small actions, meaningful support.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard icon={Navigation} title="Travel safety log" text="Start monitored journeys with verification code and vehicle photos." onClick={() => onView("travel")} tone="rose" />
          <FeatureCard icon={Radio} title="Nearby responder alerts" text="Receive privacy-safe alerts within 5 km when an SOS is triggered." onClick={() => onView("nearby")} tone="amber" />
          <FeatureCard icon={MessageSquare} title="Community safety board" text="Share tips, cautious areas, and safe zones with other users." onClick={() => onView("community")} tone="violet" />
          <FeatureCard icon={MapPin} title="Share your location" text="Capture coordinates, accuracy and raster map with no WebGL issues." onClick={() => onView("location")} tone="rose" />
          <FeatureCard icon={Users} title="Build your trusted circle" text="Designate Next of Kin and configure notification channels." onClick={() => onView("contacts")} tone="violet" />
          <FeatureCard icon={Clock3} title="Start a safety check-in" text="Tell your circle where you are going and when you expect to arrive." onClick={() => onView("checkins")} tone="slate" />
        </div>
      </section>

      <VerificationPanel user={user} />

      <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
        <p><strong>Safety notice:</strong> SurakshaShe does not replace police, ambulance, fire, or government emergency services. <a href="tel:112" className="font-bold underline">Call 112 in India</a> when immediate help is needed.</p>
      </div>
    </div>
  );
}

function VerificationPanel({ user }: { user: { email?: string | null; phone?: string | null; emailVerifiedAt?: Date | string | null; phoneVerifiedAt?: Date | string | null } }) {
  const [pending, setPending] = useState<"email" | "phone" | null>(null);
  const request = trpc.auth.requestVerification.useMutation({ onSuccess: (result) => result.status === "failed" ? toast.error(result.message || "Verification provider is not configured.") : toast.success(result.message) });
  const verify = trpc.auth.verify.useMutation({ onSuccess: () => { setPending(null); toast.success("Your contact channel is verified"); window.location.reload(); } });
  const start = (kind: "email" | "phone") => { setPending(kind); request.mutate({ kind }); };
  const confirm = () => { if (!pending) return; const code = window.prompt(`Enter the 6-digit ${pending} verification code.`); if (code) verify.mutate({ kind: pending, code }); };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">Verification</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-slate-950">Make your contact routes trustworthy.</h2>
          <p className="mt-1 text-sm text-slate-500">Unverified channels are notified on best-effort during an SOS, but verification ensures deliverability.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.emailVerifiedAt ? <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Email verified</span> : user.email && <button type="button" onClick={() => start("email")} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">Verify email</button>}
          {user.phoneVerifiedAt ? <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Phone verified</span> : user.phone && <button type="button" onClick={() => start("phone")} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">Verify phone</button>}
          {pending && <button type="button" onClick={confirm} disabled={verify.isPending} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">Enter code</button>}
        </div>
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: number; accent: "rose" | "violet" | "amber" }) {
  const styles = { rose: "bg-rose-50 text-rose-600", violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600" };
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-2xl ${styles[accent]}`}><Icon size={19} /></div>
      <p className="text-3xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text, onClick, tone }: { icon: typeof MapPin; title: string; text: string; onClick: () => void; tone: "rose" | "violet" | "amber" | "slate" }) {
  const styles = { rose: "bg-rose-50 text-rose-600", violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600", slate: "bg-slate-100 text-slate-600" };
  return (
    <button type="button" onClick={onClick} className="group flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/70">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles[tone]}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <h3 className="font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
        <span className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-700">Open tool <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
      </div>
    </button>
  );
}

function ToolShell({ eyebrow, title, description, icon: Icon, children }: { eyebrow: string; title: string; description: string; icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <section className="space-y-7">
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-rose-600"><Icon size={15} /> {eyebrow}</div>
        <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] text-slate-950">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof MapPin; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon size={21} /></div>
      <h3 className="mt-4 font-semibold text-slate-800">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function LocationPanel({ location, locationError, onRefresh }: { location: LocationState | null; locationError: string; onRefresh: () => void }) {
  return (
    <ToolShell eyebrow="Location" title="Know where you are." description="Location stays in your browser until you choose to use it in an SOS alert." icon={MapPin}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">We use your device location only when you request it.</p>
            <p className="mt-0.5 text-xs text-rose-700">Web browsers update GPS coordinates while this tab remains open in the foreground.</p>
          </div>
          <button type="button" onClick={onRefresh} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700">
            <MapPin size={16} /> Refresh location
          </button>
        </div>
        {location ? (
          <>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              <LeafletMap
                center={{ lat: location.latitude, lng: location.longitude }}
                zoom={16}
                accuracy={location.accuracy}
                markers={[{
                  lat: location.latitude,
                  lng: location.longitude,
                  title: "Your current position",
                  tone: "incident",
                }]}
                height="340px"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Info label="Latitude" value={location.latitude.toFixed(6)} />
              <Info label="Longitude" value={location.longitude.toFixed(6)} />
              <Info label="Accuracy / time" value={`${location.accuracy ? `${Math.round(location.accuracy)}m` : "Unknown"} · ${formatDate(location.timestamp)}`} />
            </div>
            <a href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-rose-700 hover:text-rose-900">
              Open in Google Maps <ExternalLink size={15} />
            </a>
          </>
        ) : (
          <EmptyState icon={MapPin} title="Location not loaded yet" text="Tap refresh location and allow access when your browser asks." />
        )}
        {locationError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{locationError}</p>}
      </div>
    </ToolShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ContactVerificationControls({ contact }: { contact: any }) {
  const [pending, setPending] = useState<"email" | "phone" | null>(null);
  const request = trpc.contacts.requestVerification.useMutation({ onSuccess: (result) => { if (result.status === "failed") toast.error(result.message || "Verification provider is not configured."); else toast.success(result.message); } });
  const verify = trpc.contacts.verify.useMutation({ onSuccess: () => { setPending(null); toast.success("Contact verified"); window.location.reload(); } });
  const start = (kind: "email" | "phone") => { setPending(kind); request.mutate({ id: contact.id, kind }); };
  const confirm = () => { if (!pending) return; const code = window.prompt(`Enter the 6-digit ${pending} verification code.`); if (code) verify.mutate({ id: contact.id, kind: pending, code }); };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
      {contact.phoneVerifiedAt ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Verified ✓ phone</span> : <button type="button" onClick={() => start("phone")} className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Unverified ⚠ phone · verify</button>}
      {contact.email && (contact.emailVerifiedAt ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Verified ✓ email</span> : <button type="button" onClick={() => start("email")} className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Unverified ⚠ email · verify</button>)}
      {pending && <button type="button" onClick={confirm} disabled={verify.isPending} className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">Enter code</button>}
    </div>
  );
}

function ContactsPanel({
  contacts,
  form,
  editingId,
  onChange,
  onSubmit,
  onEdit,
  onRemove,
  onToggleNextOfKin,
  onCancel,
  pending,
}: {
  contacts: any[];
  form: ContactForm;
  editingId: number | null;
  onChange: (form: ContactForm) => void;
  onSubmit: (event: React.FormEvent) => void;
  onEdit: (contact: any) => void;
  onRemove: (id: number) => void;
  onToggleNextOfKin: (id: number) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <ToolShell eyebrow="Trusted contacts" title="Keep your people close." description="Choose who should be notified first and which channels they can receive. Designate Next of Kin for immediate emergency priority." icon={Users}>
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={onSubmit} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold text-slate-950">{editingId ? "Edit contact" : "Add a contact"}</h3>
            {editingId && <button type="button" onClick={onCancel} className="text-xs font-bold text-slate-500 hover:text-slate-900">Cancel</button>}
          </div>
          <div className="space-y-3">
            <SmallField label="Full name" value={form.name} onChange={(value) => onChange({ ...form, name: value })} placeholder="Contact name" required />
            <SmallField label="Phone" type="tel" value={form.phone} onChange={(value) => onChange({ ...form, phone: value })} placeholder="Phone number" required />
            <SmallField label="Email (optional)" type="email" value={form.email} onChange={(value) => onChange({ ...form, email: value })} placeholder="email@example.com" />
            <SmallField label="Relationship" value={form.relationship} onChange={(value) => onChange({ ...form, relationship: value })} placeholder="e.g. Sister, friend, parent" required />
            
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Priority</span>
              <select value={form.priority} onChange={(event) => onChange({ ...form, priority: Number(event.target.value) })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm">
                <option value={1}>Priority 1 — first</option>
                <option value={2}>Priority 2</option>
                <option value={3}>Priority 3</option>
              </select>
            </label>

            {/* Next of Kin Designation */}
            <label className="flex items-start gap-2.5 rounded-2xl bg-white p-3 text-sm text-slate-700 border border-slate-200 cursor-pointer hover:border-rose-300 transition">
              <input
                type="checkbox"
                checked={form.isNextOfKin}
                onChange={(e) => onChange({ ...form, isNextOfKin: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Star size={14} className="text-amber-500 fill-amber-500" /> Designate as Next of Kin
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Next of Kin receives prioritized immediate notifications and journey tracking.
                </span>
              </div>
            </label>

            <div className="space-y-2 rounded-2xl bg-white p-3 text-sm text-slate-600">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Notification channels</p>
              {[["notifySms", "SMS"], ["notifyEmail", "Email"], ["notifyWhatsApp", "WhatsApp"]].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" checked={form[key as keyof ContactForm] as boolean} onChange={(event) => onChange({ ...form, [key]: event.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <button disabled={pending} type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
            {pending ? <Loader2 className="animate-spin" size={16} /> : editingId ? <Check size={16} /> : <Plus size={16} />}
            {editingId ? "Save changes" : "Add trusted contact"}
          </button>
        </form>

        <div>
          {contacts.length ? (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 font-bold text-rose-700">
                      {contact.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-950">{contact.name}</h3>
                        {contact.isNextOfKin && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                            <Star size={11} className="fill-rose-500 text-rose-500" /> Next of Kin
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{contact.phone}{contact.relationship ? ` · ${contact.relationship}` : ""}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Priority {contact.priority} · {[contact.notifySms && "SMS", contact.notifyEmail && "Email", contact.notifyWhatsApp && "WhatsApp"].filter(Boolean).join(", ") || "No channels"}
                      </p>
                      <ContactVerificationControls contact={contact} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => onToggleNextOfKin(contact.id)}
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-bold border transition ${contact.isNextOfKin ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                      title="Toggle Next of Kin priority"
                    >
                      <Star size={13} className={contact.isNextOfKin ? "fill-amber-500 text-amber-500" : "text-slate-400"} />
                      {contact.isNextOfKin ? "Next of Kin ✓" : "Set Next of Kin"}
                    </button>
                    <button type="button" onClick={() => onEdit(contact)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-slate-400">
                      <Pencil size={14} /> Edit
                    </button>
                    <button type="button" onClick={() => onRemove(contact.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} title="Your circle is empty" text="Add one person you trust so your plan is ready." />
          )}
        </div>
      </div>
    </ToolShell>
  );
}

function SmallField({ label, value, onChange, placeholder, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100" />
    </label>
  );
}

function TravelSafetyPanel({ contacts }: { contacts: any[] }) {
  const [destination, setDestination] = useState("");
  const [expectedArrival, setExpectedArrival] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("cab");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleDescription, setVehicleDescription] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoKey, setUploadedPhotoKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const activeTripQuery = trpc.travel.active.useQuery(undefined, { refetchInterval: 12_000 });
  const historyQuery = trpc.travel.history.useQuery();
  const utils = trpc.useUtils();

  const createTrip = trpc.travel.create.useMutation({
    onSuccess: () => {
      utils.travel.active.invalidate();
      utils.travel.history.invalidate();
      toast.success("Travel trip started! Stay safe.");
      setDestination("");
      setExpectedArrival("");
      setVehicleNumber("");
      setVehicleColor("");
      setVehicleDescription("");
      setPhotoPreview(null);
      setUploadedPhotoKey(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateLoc = trpc.travel.updateLocation.useMutation({
    onSuccess: () => utils.travel.active.invalidate(),
  });

  const completeTrip = trpc.travel.complete.useMutation({
    onSuccess: () => {
      utils.travel.active.invalidate();
      utils.travel.history.invalidate();
      toast.success("Trip marked completed. Glad you arrived safely!");
    },
  });

  const cancelTrip = trpc.travel.cancel.useMutation({
    onSuccess: () => {
      utils.travel.active.invalidate();
      utils.travel.history.invalidate();
      toast.success("Trip cancelled.");
    },
  });

  const triggerEmergency = trpc.travel.triggerEmergency.useMutation({
    onSuccess: (res) => {
      utils.travel.active.invalidate();
      utils.sos.list.invalidate();
      toast.error("Emergency SOS triggered for this trip!");
      if (res.emergencyLink) {
        window.open(res.emergencyLink, "_blank");
      }
    },
  });

  const uploadMutation = trpc.upload.uploadFile.useMutation({
    onSuccess: (res) => {
      setUploadedPhotoKey(res.fileKey);
      setIsUploading(false);
      toast.success("Vehicle photo uploaded securely");
    },
    onError: (err) => {
      setIsUploading(false);
      toast.error(`Photo upload failed: ${err.message}`);
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File exceeds 5MB limit");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      const base64Data = result.split(",")[1];
      setIsUploading(true);
      uploadMutation.mutate({
        fileName: file.name,
        mimeType: file.type || "image/jpeg",
        base64Data,
        context: "vehicle",
      });
    };
    reader.readAsDataURL(file);
  };

  const activeTrip = activeTripQuery.data?.trip;
  const locations = activeTripQuery.data?.locations ?? [];

  // Foreground GPS tracking for active trip
  useEffect(() => {
    if (!activeTrip?.id) return;
    const updateCurrentPosition = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateLoc.mutate({
            id: activeTrip.id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        () => {
          /* foreground GPS timeout / no signal handled cleanly */
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );
    };

    updateCurrentPosition();
    const interval = window.setInterval(updateCurrentPosition, 25_000);
    return () => window.clearInterval(interval);
  }, [activeTrip?.id]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Verification code copied to clipboard");
  };

  const shareTrip = (trip: any) => {
    const text = `I'm travelling to ${trip.destination}. My SurakshaShe trip verification code is: ${trip.verificationCode}. Expected arrival: ${new Date(trip.expectedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
    if (navigator.share) {
      navigator.share({ title: "SurakshaShe Trip Verification", text }).catch(() => undefined);
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Trip verification details copied to share!");
    }
  };

  const handleStartTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !expectedArrival) {
      toast.error("Please provide destination and arrival time");
      return;
    }
    createTrip.mutate({
      destination,
      expectedArrival: new Date(expectedArrival),
      vehicleNumber: vehicleNumber || undefined,
      vehicleType: vehicleType || undefined,
      vehicleColor: vehicleColor || undefined,
      vehicleDescription: vehicleDescription || undefined,
      vehiclePhotoKey: uploadedPhotoKey || undefined,
      trustedContactIds: selectedContacts.length ? selectedContacts : undefined,
    });
  };

  return (
    <ToolShell
      eyebrow="Travel Safety"
      title="Safe travels with your circle."
      description="Start a monitored journey with vehicle details, photo verification, and live location tracking for your trusted contacts."
      icon={Navigation}
    >
      <div className="space-y-6">
        {/* Active Trip Banner/Card */}
        {activeTrip ? (
          <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Active Journey</span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">{activeTrip.tripId}</span>
                </div>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">{activeTrip.destination}</h2>
                <p className="text-xs text-slate-500">
                  Started {formatDate(activeTrip.startedAt)} · Expected arrival: {formatDate(activeTrip.expectedArrival)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => completeTrip.mutate({ id: activeTrip.id })}
                  disabled={completeTrip.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
                >
                  <CheckCircle2 size={15} /> Arrived Safely
                </button>
                <button
                  type="button"
                  onClick={() => window.confirm("Cancel this active trip?") && cancelTrip.mutate({ id: activeTrip.id })}
                  disabled={cancelTrip.isPending}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel Trip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Trigger Emergency SOS for this trip? This will notify your emergency circle and responders immediately.")) {
                      navigator.geolocation?.getCurrentPosition(
                        (p) => triggerEmergency.mutate({ id: activeTrip.id, latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
                        () => triggerEmergency.mutate({ id: activeTrip.id, latitude: activeTrip.lastLatitude ?? 28.6139, longitude: activeTrip.lastLongitude ?? 77.2090 })
                      );
                    }
                  }}
                  disabled={triggerEmergency.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-200 hover:bg-rose-700"
                >
                  <Siren size={15} /> Emergency SOS
                </button>
              </div>
            </div>

            {/* Verification Code Box */}
            <div className="mt-5 grid gap-4 rounded-2xl bg-rose-50/70 p-4 sm:grid-cols-[1.2fr_0.8fr] sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Trip Verification Code</p>
                <p className="mt-0.5 text-xs text-rose-900/80">Share this unique code with your trusted contact or driver for verification.</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="font-mono text-2xl font-black tracking-wider text-rose-950">{activeTrip.verificationCode}</span>
                  <button
                    type="button"
                    onClick={() => copyCode(activeTrip.verificationCode)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-rose-700 shadow-sm border border-rose-200 hover:bg-rose-100"
                  >
                    <Copy size={13} /> Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => shareTrip(activeTrip)}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
                  >
                    <Share2 size={13} /> Share
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-white p-3 text-xs text-slate-600 border border-rose-100">
                <span className="font-bold text-slate-800 block">Next of Kin Priority</span>
                Designated Next of Kin contacts are directly alerted with your trip details and live GPS tracking.
              </div>
            </div>

            {/* Vehicle & Trip Info */}
            {(activeTrip.vehicleNumber || activeTrip.vehicleType || activeTrip.vehiclePhotoKey) && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Vehicle Details</p>
                  <p className="font-semibold text-slate-800">
                    {activeTrip.vehicleType?.toUpperCase()} · {activeTrip.vehicleNumber || "No plate provided"}
                  </p>
                  {activeTrip.vehicleColor && <p className="text-xs text-slate-600">Color: {activeTrip.vehicleColor}</p>}
                  {activeTrip.vehicleDescription && <p className="text-xs text-slate-500 italic">"{activeTrip.vehicleDescription}"</p>}
                </div>
                {activeTrip.vehiclePhotoKey && (
                  <div className="flex items-center gap-3">
                    <img
                      src={`/api/files/${activeTrip.vehiclePhotoKey}`}
                      alt="Vehicle photo"
                      className="h-20 w-28 rounded-xl object-cover border border-slate-200 shadow-sm"
                    />
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700 block">Vehicle Photo</span>
                      Verified & stored securely in Supabase storage.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Foreground GPS limitation disclaimer */}
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs leading-relaxed text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <strong>Browser Foreground Location Notice:</strong> Web browsers update GPS coordinates only while this page remains open in the foreground. Never relies on true native background GPS. Keep this tab active while travelling.
                </div>
              </div>
            </div>

            {/* Live Map & Location History */}
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Journey Map</p>
                {activeTrip.lastLatitude && activeTrip.lastLongitude && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${activeTrip.lastLatitude},${activeTrip.lastLongitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900"
                  >
                    Open in Google Maps <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <LeafletMap
                  center={activeTrip.lastLatitude && activeTrip.lastLongitude ? { lat: activeTrip.lastLatitude, lng: activeTrip.lastLongitude } : { lat: 28.6139, lng: 77.2090 }}
                  zoom={15}
                  accuracy={activeTrip.lastAccuracy ?? undefined}
                  markers={activeTrip.lastLatitude && activeTrip.lastLongitude ? [{
                    lat: activeTrip.lastLatitude,
                    lng: activeTrip.lastLongitude,
                    title: `Live trip: ${activeTrip.destination}`,
                    tone: "incident",
                  }] : []}
                  path={locations.length > 1 ? locations.map((loc) => ({ lat: loc.latitude, lng: loc.longitude })) : undefined}
                  height="340px"
                />
              </div>
              <p className="text-right text-[11px] text-slate-400">
                {locations.length} breadcrumb point(s) recorded · Last updated {activeTrip.lastLocationAt ? formatDate(activeTrip.lastLocationAt) : "just now"}
              </p>
            </div>
          </div>
        ) : (
          /* Start New Trip Form */
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <form onSubmit={handleStartTrip} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-display text-xl font-semibold text-slate-950">Start a Travel Safety Trip</h3>
              <p className="text-xs text-slate-500">
                Your destination, vehicle information, and live GPS route will be logged and accessible to your emergency circle.
              </p>

              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Destination *</span>
                <input
                  required
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Connaught Place, New Delhi"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Expected Arrival Time *</span>
                <input
                  required
                  type="datetime-local"
                  value={expectedArrival}
                  onChange={(e) => setExpectedArrival(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Vehicle Type</span>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"
                  >
                    <option value="cab">Cab / Taxi (Uber/Ola)</option>
                    <option value="auto">Auto Rickshaw</option>
                    <option value="bus">Public Bus</option>
                    <option value="metro">Metro / Train</option>
                    <option value="personal_car">Personal Car</option>
                    <option value="bike">Two Wheeler / Bike</option>
                    <option value="other">Other / Walking</option>
                  </select>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Vehicle Number</span>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. DL 1ZA 4321"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Vehicle Color</span>
                  <input
                    type="text"
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    placeholder="e.g. White / Yellow"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Driver / Details</span>
                  <input
                    type="text"
                    value={vehicleDescription}
                    onChange={(e) => setVehicleDescription(e.target.value)}
                    placeholder="e.g. Driver Ramesh / White Dzire"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                  />
                </div>
              </div>

              {/* Vehicle Photo Upload using Supabase Storage */}
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Vehicle Photo (Optional)</span>
                <p className="text-xs text-slate-500 mb-3">Snap or upload a photo of the vehicle plate or exterior.</p>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50">
                    <Camera size={15} className="text-rose-600" />
                    <span>{isUploading ? "Uploading..." : "Select Photo"}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" />
                  </label>
                  {photoPreview && (
                    <div className="relative">
                      <img src={photoPreview} alt="Preview" className="h-12 w-16 rounded-lg object-cover border border-slate-300" />
                      {uploadedPhotoKey && <span className="absolute -top-1.5 -right-1.5 rounded-full bg-emerald-500 p-0.5 text-white"><CheckCheck size={12} /></span>}
                    </div>
                  )}
                  {uploadedPhotoKey && <span className="text-xs font-semibold text-emerald-700">Photo attached ✓</span>}
                </div>
              </div>

              {/* Select Trusted Contacts */}
              {contacts.length > 0 && (
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Share Trip With Circle</span>
                  <div className="space-y-2 max-h-36 overflow-auto">
                    {contacts.map((c) => (
                      <label key={c.id} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedContacts([...selectedContacts, c.id]);
                            else setSelectedContacts(selectedContacts.filter((id) => id !== c.id));
                          }}
                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span>{c.name} ({c.phone})</span>
                        {c.isNextOfKin && <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-full">Next of Kin</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={createTrip.isPending || isUploading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 disabled:opacity-60"
              >
                {createTrip.isPending ? <Loader2 className="animate-spin" size={18} /> : <Navigation size={18} />}
                Start Journey & Generate Code
              </button>
            </form>

            {/* Travel Information & Tips */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                <h4 className="font-semibold text-slate-900">How Travel Safety Protects You</h4>
                <ul className="space-y-2.5 text-xs leading-relaxed text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 text-emerald-600 shrink-0" />
                    <span><strong>Unique Verification Code:</strong> Every trip generates a random cryptographic code (SK-XXXXXX) for verifying ride identity.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 text-emerald-600 shrink-0" />
                    <span><strong>Next of Kin Priority:</strong> Your designated Next of Kin contacts are given prioritized awareness of your active journey.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 text-emerald-600 shrink-0" />
                    <span><strong>One-Tap Emergency Escalation:</strong> If anything feels suspicious, trigger immediate SOS with the trip details and live GPS coordinates.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 text-emerald-600 shrink-0" />
                    <span><strong>Transparent Foreground GPS:</strong> Coordinates are refreshed actively while this browser tab stays open.</span>
                  </li>
                </ul>
              </div>

              {/* Past Trips History */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-3">Recent Journeys</h4>
                {historyQuery.data && historyQuery.data.length > 0 ? (
                  <div className="space-y-2.5 max-h-56 overflow-auto">
                    {historyQuery.data.map((t) => (
                      <div key={t.id} className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{t.destination}</p>
                          <p className="text-[11px] text-slate-400">{formatDate(t.createdAt)} · Code: {t.verificationCode}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${t.status === "completed" ? "bg-emerald-100 text-emerald-800" : t.status === "emergency" ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-700"}`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No past travel logs recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function NearbyAlertsPanel() {
  const settingsQuery = trpc.nearby.getSettings.useQuery();
  const activeAlertsQuery = trpc.nearby.activeAlerts.useQuery(undefined, { refetchInterval: 10_000 });
  const utils = trpc.useUtils();

  const updateSettings = trpc.nearby.updateSettings.useMutation({
    onSuccess: () => {
      utils.nearby.getSettings.invalidate();
      utils.nearby.activeAlerts.invalidate();
      toast.success("Nearby alert settings updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const respondMutation = trpc.nearby.respond.useMutation({
    onSuccess: () => {
      utils.nearby.activeAlerts.invalidate();
      toast.success("Acknowledgement recorded. Help is on the way!");
    },
    onError: (err) => toast.error(err.message),
  });

  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (settingsQuery.data) {
      setEnabled(settingsQuery.data.enabled);
    }
  }, [settingsQuery.data]);

  const handleToggle = (nextVal: boolean) => {
    setEnabled(nextVal);
    if (nextVal) {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        updateSettings.mutate({ enabled: true });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => updateSettings.mutate({ enabled: true, latitude: p.coords.latitude, longitude: p.coords.longitude }),
        () => {
          toast.error("Could not obtain location. Enabled without updated GPS.");
          updateSettings.mutate({ enabled: true });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      updateSettings.mutate({ enabled: false });
    }
  };

  const handleRefreshLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        updateSettings.mutate({ enabled, latitude: p.coords.latitude, longitude: p.coords.longitude });
        toast.success("Updated your location for 5 km nearby responder alert radius");
      },
      () => toast.error("Could not obtain GPS coordinates"),
      { enableHighAccuracy: true }
    );
  };

  const alerts = activeAlertsQuery.data ?? [];

  return (
    <ToolShell
      eyebrow="Nearby Alerts"
      title="5 KM Community Responder Network."
      description="Opt-in to receive privacy-safe alerts when someone within 5 km triggers an active emergency SOS. Never reveals precise location to unauthorized users."
      icon={Radio}
    >
      <div className="space-y-6">
        {/* Opt-in Preference Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Privacy-First Responder</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Receive Nearby Emergency Alerts</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                When active, if a woman or vulnerable person triggers SOS within 5 km of your location, you receive an alert and can acknowledge that help is on the way.
                Default is OFF to respect your battery and privacy.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => handleToggle(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-7 w-14 rounded-full bg-slate-200 after:absolute after:left-[4px] after:top-[4px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-rose-600 peer-checked:after:translate-x-7 peer-focus:outline-none" />
              </label>
            </div>
          </div>

          {enabled && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-600 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Responder mode active (5 km radius) · Last updated: {settingsQuery.data?.lastLocationAt ? formatDate(settingsQuery.data.lastLocationAt) : "just now"}</span>
              </div>
              <button
                type="button"
                onClick={handleRefreshLocation}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50"
              >
                <MapPin size={13} className="text-rose-600" /> Update Responder Coordinates
              </button>
            </div>
          )}
        </div>

        {/* Active Nearby Alerts List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Active Emergencies in 5 km</h3>
            <span className="text-xs text-slate-400">{alerts.length} incident(s) nearby</span>
          </div>

          {!enabled ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
              <Radio size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Nearby alerts are currently turned off</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Turn on the switch above if you would like to be notified when someone triggers an SOS within 5 km of you.
              </p>
            </div>
          ) : alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.map((item) => (
                <div key={item.incidentId} className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-600" />
                        <span className="font-bold text-rose-900 text-sm">Emergency Alert #{item.incidentId}</span>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                          ~{item.distanceKm.toFixed(1)} km away
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Activated {formatDate(item.activatedAt)} · Status: {item.status}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => respondMutation.mutate({ incidentId: item.incidentId, response: "responding" })}
                        disabled={respondMutation.isPending || item.myResponseStatus === "responding"}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold shadow transition ${item.myResponseStatus === "responding" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-rose-600 text-white hover:bg-rose-700"}`}
                      >
                        <ShieldCheck size={15} />
                        {item.myResponseStatus === "responding" ? "Help is on the Way (Recorded)" : "Help is on the Way / I'm Responding"}
                      </button>
                      <button
                        type="button"
                        onClick={() => respondMutation.mutate({ incidentId: item.incidentId, response: "acknowledged" })}
                        disabled={respondMutation.isPending || item.myResponseStatus === "acknowledged"}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-slate-600">
                      Your status: <strong>{item.myResponseStatus === "responding" ? "You stated help is on the way" : item.myResponseStatus === "acknowledged" ? "You acknowledged this alert" : "Notified"}</strong>
                    </span>
                    <span className="text-slate-400">
                      SurakshaShe does not expose the user's private address without authorization.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-slate-800">No active SOS emergencies within 5 km</p>
              <p className="text-xs text-slate-400 mt-1">Your neighborhood appears safe. We will notify you if an alert is activated nearby.</p>
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}

function CommunitySafetyPanel() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"safety_tip" | "alert" | "advice" | "experience" | "general">("safety_tip");
  const [content, setContent] = useState("");
  const [locationName, setLocationName] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");

  const postsQuery = trpc.community.posts.useQuery(
    { category: selectedCategory === "all" ? undefined : (selectedCategory as any), limit: 20 },
    { refetchOnWindowFocus: false }
  );

  const postDetailQuery = trpc.community.getPost.useQuery(
    { id: expandedPostId ?? 0 },
    { enabled: Boolean(expandedPostId) }
  );

  const utils = trpc.useUtils();

  const createPost = trpc.community.createPost.useMutation({
    onSuccess: () => {
      utils.community.posts.invalidate();
      setShowCreate(false);
      setTitle("");
      setContent("");
      setLocationName("");
      toast.success("Community post shared successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const addComment = trpc.community.addComment.useMutation({
    onSuccess: () => {
      utils.community.getPost.invalidate();
      utils.community.posts.invalidate();
      setCommentText("");
      toast.success("Comment added");
    },
    onError: (err) => toast.error(err.message),
  });

  const reportMutation = trpc.community.report.useMutation({
    onSuccess: () => toast.success("Content reported for moderator review"),
    onError: (err) => toast.error(err.message),
  });

  const handleReportPost = (postId: number) => {
    const reason = window.prompt("Reason for report (e.g. spam, inappropriate, false_info):", "inappropriate");
    if (!reason) return;
    reportMutation.mutate({ postId, reason });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    createPost.mutate({
      title,
      category,
      content,
      locationName: locationName || undefined,
    });
  };

  const categories = [
    { id: "all", label: "All Posts" },
    { id: "safety_tip", label: "Safety Tips" },
    { id: "alert", label: "Area Alerts" },
    { id: "advice", label: "Safety Advice" },
    { id: "experience", label: "Experiences" },
    { id: "general", label: "General" },
  ];

  return (
    <ToolShell
      eyebrow="Community Safety"
      title="Shared awareness, safer communities."
      description="Connect with local safety tips, reported zones of caution, and community discussions. Completely separated from emergency SOS."
      icon={MessageSquare}
    >
      <div className="space-y-6">
        {/* Safety Disclaimer Banner */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-950 flex items-start gap-3">
          <AlertCircle size={16} className="mt-0.5 text-amber-600 shrink-0" />
          <p>
            <strong>Notice:</strong> Community Safety is a shared forum for discussion and prevention. In immediate personal danger, <strong>do not post here</strong>; use the <strong>SOS button</strong> or call <strong>112</strong> immediately.
          </p>
        </div>

        {/* Actions bar: Filter & Create button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${selectedCategory === cat.id ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700"
          >
            <Plus size={15} /> {showCreate ? "Close Form" : "Create Safety Post"}
          </button>
        </div>

        {/* Create Post Form */}
        {showCreate && (
          <form onSubmit={handleCreateSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 text-base">New Safety Post</h3>
            <div>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Title</span>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Well-lit route near Metro Gate 3"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
                >
                  <option value="safety_tip">Safety Tip</option>
                  <option value="alert">Area Alert</option>
                  <option value="advice">Safety Advice</option>
                  <option value="experience">Experience</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Location Tag</span>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Indiranagar, Bengaluru"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
              </div>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Content</span>
              <textarea
                required
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe the safety observation, tip, or helpful advice..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              />
            </div>
            <button
              type="submit"
              disabled={createPost.isPending}
              className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {createPost.isPending ? "Posting..." : "Publish Post"}
            </button>
          </form>
        )}

        {/* Posts Feed */}
        <div className="space-y-4">
          {postsQuery.data && postsQuery.data.length > 0 ? (
            postsQuery.data.map((post) => (
              <div key={post.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      {post.category.replace("_", " ")}
                    </span>
                    {post.locationName && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={12} className="text-rose-500" /> {post.locationName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(post.createdAt)}</span>
                </div>

                <h3 className="font-bold text-slate-900 text-lg">{post.title}</h3>
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{post.content}</p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">By {post.authorName || "Anonymous member"}</span>
                    <button
                      type="button"
                      onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                      className="inline-flex items-center gap-1 font-bold text-rose-700 hover:text-rose-900"
                    >
                      <MessageSquare size={13} />
                      Discussion & Comments
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReportPost(post.id)}
                    className="text-slate-400 hover:text-rose-600 transition"
                  >
                    Report
                  </button>
                </div>

                {/* Comments Section */}
                {expandedPostId === post.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 bg-slate-50/70 p-4 rounded-2xl">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500">Comments</h5>
                    {postDetailQuery.data?.comments && postDetailQuery.data.comments.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {postDetailQuery.data.comments.map((c: any) => (
                          <div key={c.id} className="rounded-xl bg-white p-3 text-xs border border-slate-100">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                              <span className="font-semibold text-slate-700">{c.authorName || "Member"}</span>
                              <span>{formatDate(c.createdAt)}</span>
                            </div>
                            <p className="text-slate-800">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No comments yet. Start the conversation.</p>
                    )}

                    {/* Add Comment Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a supportive comment..."
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!commentText.trim()) return;
                          addComment.mutate({ postId: post.id, content: commentText.trim() });
                        }}
                        disabled={addComment.isPending || !commentText.trim()}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {addComment.isPending ? "Adding..." : "Reply"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              <MessageSquare size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No community posts in this category</p>
              <p className="text-xs text-slate-400 mt-1">Be the first to share a safety tip or helpful recommendation.</p>
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}

function FakeCallPanel({ calling, onStart, onAnswer, onReject }: { calling: boolean; onStart: () => void; onAnswer: () => void; onReject: () => void }) {
  return (
    <ToolShell eyebrow="Exit moment" title="Create a little space." description="A simulated incoming call can give you a natural reason to step away from an uncomfortable situation. It never calls a real phone number." icon={PhoneCall}>
      <div className="rounded-3xl bg-slate-950 p-8 text-center text-white sm:p-12">
        {calling ? (
          <div className="mx-auto max-w-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-white/10 text-rose-300">
              <PhoneCall size={32} />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-200">Incoming call</p>
            <p className="mt-3 font-display text-4xl font-semibold">Mum</p>
            <div className="mt-10 flex justify-center gap-3">
              <button type="button" onClick={onAnswer} className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold">Answer</button>
              <button type="button" onClick={onReject} className="rounded-2xl bg-rose-500 px-6 py-3 text-sm font-bold">Reject</button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-rose-200">
              <PhoneCall size={28} />
            </div>
            <h3 className="font-display text-3xl font-semibold">Need a graceful exit?</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">Start a simulated incoming call screen.</p>
            <button type="button" onClick={onStart} className="mt-8 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-950">
              <span className="inline-flex items-center gap-2"><Phone size={17} /> Start fake call</span>
            </button>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function AlertsPanel({ alerts, onResolve, onSafe }: { alerts: any[]; onResolve: (id: number) => void; onSafe: (id: number) => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const detail = trpc.sos.detail.useQuery({ id: selectedId ?? 0 }, { enabled: Boolean(selectedId) });

  return (
    <ToolShell eyebrow="Incident history" title="A clear record, when you need it." description="Review incident locations, provider responses, acknowledgements, and a chronological timeline." icon={History}>
      <div className="space-y-3">
        {alerts.length ? (
          alerts.map((alert) => (
            <div key={alert.id} className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${alert.status === "active" || alert.status === "acknowledged" ? "bg-rose-500" : "bg-emerald-500"}`} />
                    <h3 className="font-semibold text-slate-950">SOS incident #{alert.id}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">{alert.status}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${alert.notificationStatus === "sent" || alert.notificationStatus === "delivered" ? "bg-emerald-50 text-emerald-700" : alert.notificationStatus === "failed" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      Notifications: {alert.notificationStatus}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{alert.address || `${alert.latitude.toFixed(5)}, ${alert.longitude.toFixed(5)}`}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock3 size={13} /> {formatDate(alert.createdAt)} · accuracy {alert.accuracy ? `${Math.round(alert.accuracy)}m` : "unknown"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSelectedId(selectedId === alert.id ? null : alert.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-slate-400">
                    {selectedId === alert.id ? "Hide detail" : "View detail"}
                  </button>
                  {(alert.status === "active" || alert.status === "acknowledged") && (
                    <>
                      <button type="button" onClick={() => onSafe(alert.id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">I’m Safe</button>
                      <button type="button" onClick={() => onResolve(alert.id)} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700">Resolve</button>
                    </>
                  )}
                </div>
              </div>
              {selectedId === alert.id && detail.data && (
                <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Notification history</h4>
                    {detail.data.notifications.length ? (
                      <div className="space-y-2">
                        {detail.data.notifications.map((record) => (
                          <div key={record.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                            <span className="font-semibold text-slate-700">Contact #{record.contactId} · {record.channel.toUpperCase()}</span>
                            <span className={record.status === "failed" ? "text-amber-700" : "text-emerald-700"}>{record.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No channels were configured for this incident.</p>
                    )}
                  </div>
                  <div>
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Incident timeline</h4>
                    <div className="space-y-2">
                      {detail.data.timeline.map((event) => (
                        <div key={event.id} className="flex gap-3 text-xs">
                          <span className="w-20 shrink-0 text-slate-400">{new Date(event.createdAt).toLocaleTimeString()}</span>
                          <span className="text-slate-700">{event.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <EmptyState icon={History} title="No incidents recorded" text="Your alert history will appear here after you use the SOS button." />
        )}
      </div>
    </ToolShell>
  );
}

function CheckInsPanel({ checkIns, onRefresh }: { checkIns: any[]; onRefresh: () => void }) {
  const [message, setMessage] = useState("I’m travelling home.");
  const [expectedArrival, setExpectedArrival] = useState("");
  const policyQuery = trpc.checkIns.policy.useQuery();
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [graceMinutes, setGraceMinutes] = useState(15);

  useEffect(() => {
    if (policyQuery.data) {
      setEscalationEnabled(policyQuery.data.escalationEnabled);
      setGraceMinutes(policyQuery.data.graceMinutes);
    }
  }, [policyQuery.data]);

  const create = trpc.checkIns.create.useMutation({
    onSuccess: () => {
      onRefresh();
      setMessage("I’m travelling home.");
      setExpectedArrival("");
      toast.success("Safety check-in started");
    },
  });

  const updatePolicy = trpc.checkIns.updatePolicy.useMutation({ onSuccess: () => toast.success("Escalation policy saved") });
  const processExpired = trpc.checkIns.processExpired.useMutation({
    onSuccess: (result) => {
      onRefresh();
      toast(result.expired ? `${result.expired} check-in(s) expired and were processed.` : "No check-ins need escalation yet.");
    },
  });
  const markSafe = trpc.checkIns.markSafe.useMutation({ onSuccess: () => { onRefresh(); toast.success("Check-in completed"); } });
  const cancel = trpc.checkIns.cancel.useMutation({ onSuccess: onRefresh });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    create.mutate({ message, expectedArrival: new Date(expectedArrival) });
  };

  return (
    <ToolShell eyebrow="Safety check-in" title="Let your circle know your plan." description="Start a check-in with an expected arrival time. Escalation is off by default and never triggers a dangerous action without your explicit policy." icon={Clock3}>
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-950">Start a check-in</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Example: “I’m travelling home.”</p>
            <label className="mt-5 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Message</span>
              <input required value={message} onChange={(event) => setMessage(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm" />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Expected arrival</span>
              <input required type="datetime-local" value={expectedArrival} onChange={(event) => setExpectedArrival(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm" />
            </label>
            <button type="submit" disabled={create.isPending} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white">
              {create.isPending ? <Loader2 className="animate-spin" size={16} /> : <Clock3 size={16} />} Start check-in
            </button>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 text-emerald-600" size={19} />
              <div>
                <h3 className="font-semibold text-slate-950">Optional escalation</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">When enabled, the scheduled processor can notify priority-1 contacts after the grace period. Providers must be configured first.</p>
              </div>
            </div>
            <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={escalationEnabled} onChange={(event) => setEscalationEnabled(event.target.checked)} /> Enable check-in escalation
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Grace period after arrival</span>
              <select value={graceMinutes} onChange={(event) => setGraceMinutes(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm">
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => updatePolicy.mutate({ escalationEnabled, graceMinutes })} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">Save policy</button>
              <button type="button" onClick={() => processExpired.mutate()} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Check overdue now</button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {checkIns.length ? (
            checkIns.map((checkIn) => (
              <div key={checkIn.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">{checkIn.message}</p>
                    <p className="mt-2 text-sm text-slate-500">Expected {formatDate(checkIn.expectedArrival)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">{checkIn.status}</span>
                </div>
                {checkIn.status === "active" && (
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => markSafe.mutate({ id: checkIn.id })} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">I’m Safe</button>
                    <button type="button" onClick={() => cancel.mutate({ id: checkIn.id })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Cancel</button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <EmptyState icon={Clock3} title="No check-ins yet" text="Start one before a journey so your plan is clear." />
          )}
        </div>
      </div>
    </ToolShell>
  );
}

function PrivacyPanel() {
  const exportQuery = trpc.privacy.exportData.useQuery(undefined, { enabled: false });
  const deleteHistory = trpc.privacy.deleteAlertHistory.useMutation({ onSuccess: () => toast.success("SOS history deleted") });
  const deleteAccount = trpc.privacy.deleteAccount.useMutation({ onSuccess: () => { toast.success("Your account was deleted"); window.location.href = "/"; } });

  const download = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) return;
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "surakshashe-data-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const requestDeleteAccount = () => {
    const confirmation = window.prompt("Type DELETE MY ACCOUNT to permanently delete your profile, contacts, check-ins, SOS history, and sessions.");
    if (confirmation === "DELETE MY ACCOUNT") deleteAccount.mutate({ confirmation });
  };

  return (
    <ToolShell eyebrow="Privacy & data" title="Stay in control of your data." description="Your profile, contacts, safety check-ins and SOS history are tied to your account. Export a copy or delete data when you choose." icon={Shield}>
      <div className="grid gap-4 md:grid-cols-3">
        <button type="button" onClick={download} className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-5 text-left hover:border-slate-400">
          <Download className="text-rose-600" size={22} />
          <span>
            <strong className="block text-slate-900">Download my data</strong>
            <span className="mt-1 block text-sm leading-6 text-slate-500">Export profile, trusted contacts, check-ins, and alert records as JSON.</span>
          </span>
        </button>
        <button type="button" onClick={() => window.confirm("Delete all your SOS history? This cannot be undone.") && deleteHistory.mutate()} className="flex items-start gap-4 rounded-3xl border border-rose-100 bg-rose-50 p-5 text-left hover:bg-rose-100">
          <Trash2 className="text-rose-600" size={22} />
          <span>
            <strong className="block text-rose-900">Delete SOS history</strong>
            <span className="mt-1 block text-sm leading-6 text-rose-800">Remove your saved incidents and notification timeline.</span>
          </span>
        </button>
        <button type="button" onClick={requestDeleteAccount} disabled={deleteAccount.isPending} className="flex items-start gap-4 rounded-3xl border border-rose-300 bg-rose-600 p-5 text-left text-white hover:bg-rose-700">
          <Trash2 size={22} />
          <span>
            <strong className="block">Delete my account</strong>
            <span className="mt-1 block text-sm leading-6 text-rose-100">Permanently erase your account and associated safety data.</span>
          </span>
        </button>
      </div>
      <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
        <strong>Privacy principle:</strong> location is requested only when you ask for it or activate SOS. Emergency links expire after 24 hours and are revoked when you mark yourself safe. Offline mode never claims to deliver SOS.
      </div>
    </ToolShell>
  );
}

function ReportPersonPanel() {
  const [form, setForm] = useState({ name: "", description: "", gender: "", ageApprox: "", notes: "", lastKnownLocation: "" });
  const mutation = trpc.suspects.create.useMutation({ onSuccess: () => { toast.success("Report submitted safely."); setForm({ name: "", description: "", gender: "", ageApprox: "", notes: "", lastKnownLocation: "" }); } });
  return (
    <ToolShell eyebrow="Report Person of Concern" title="Log suspicious individuals." description="Keep a safe, private record of people who make you feel unsafe. This information is only visible to you and system administrators." icon={UserMinus}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4 max-w-xl">
        <Field label="Name or identifier" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. John Doe, or 'Man in red hoodie'" />
        <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Physical appearance, clothing, distinguishing features" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Approximate Age" value={form.ageApprox} onChange={(v) => setForm({ ...form, ageApprox: v })} placeholder="e.g. 30s" />
          <Field label="Gender" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} placeholder="e.g. Male" />
        </div>
        <Field label="Last known location" value={form.lastKnownLocation} onChange={(v) => setForm({ ...form, lastKnownLocation: v })} placeholder="Where did you see them?" />
        <Field label="Additional notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Any specific behaviors or concerns?" />
        <button disabled={mutation.isPending} type="submit" className="w-full rounded-2xl bg-rose-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700">
          {mutation.isPending ? "Submitting..." : "Submit Report"}
        </button>
      </form>
    </ToolShell>
  );
}

function ReportVehiclePanel() {
  const [form, setForm] = useState({ registrationNumber: "", type: "", makeModel: "", color: "", description: "" });
  const mutation = trpc.vehicles.create.useMutation({ onSuccess: () => { toast.success("Vehicle reported successfully."); setForm({ registrationNumber: "", type: "", makeModel: "", color: "", description: "" }); } });
  return (
    <ToolShell eyebrow="Report Vehicle" title="Log suspicious vehicles." description="Record details of vehicles involved in suspicious incidents." icon={CarFront}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4 max-w-xl">
        <Field label="Registration / License Plate" value={form.registrationNumber} onChange={(v) => setForm({ ...form, registrationNumber: v })} placeholder="e.g. MH12AB1234" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vehicle Type" value={form.type} onChange={(v) => setForm({ ...form, type: v })} placeholder="e.g. Car, Bike, Van" />
          <Field label="Make & Model" value={form.makeModel} onChange={(v) => setForm({ ...form, makeModel: v })} placeholder="e.g. White Maruti Swift" />
        </div>
        <Field label="Color" value={form.color} onChange={(v) => setForm({ ...form, color: v })} placeholder="e.g. White" />
        <Field label="Description & Context" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Why are you reporting this vehicle?" />
        <button disabled={mutation.isPending} type="submit" className="w-full rounded-2xl bg-rose-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700">
          {mutation.isPending ? "Submitting..." : "Submit Vehicle"}
        </button>
      </form>
    </ToolShell>
  );
}
