import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, Loader2, MapPin, Navigation, Phone, ShieldAlert, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { LeafletMap } from "@/components/Map";

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function EmergencyView() {
  const [, params] = useRoute("/emergency/:token");
  const token = params?.token ?? "";
  const incident = trpc.emergency.view.useQuery(
    { token },
    {
      enabled: token.length > 0,
      retry: false,
      refetchInterval: (query) => (query.state.data?.alert.status === "active" ? 15_000 : false),
    }
  );
  const acknowledge = trpc.emergency.acknowledge.useMutation({
    onSuccess: () => toast.success("Your response was recorded and shared with the sender."),
  });
  const [form, setForm] = useState({
    contactName: "",
    contactPhone: "",
    response: "responding" as "acknowledged" | "responding",
  });
  const [viewerCoords, setViewerCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Try to obtain viewer's coordinates for straight-line distance calculation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setViewerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  if (incident.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="animate-spin text-rose-400" />
      </div>
    );
  }

  if (incident.error || !incident.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf8f7] p-5">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <ShieldAlert className="mx-auto text-rose-600" size={38} />
          <h1 className="mt-5 font-display text-3xl font-semibold text-slate-950">This emergency link is unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            It may have expired after 24 hours, been revoked when the user marked themselves safe, or been copied incorrectly.
          </p>
        </div>
      </main>
    );
  }

  const { alert, userName, userPhone, timeline } = incident.data;
  const straightLineDist = viewerCoords
    ? calculateDistanceKm(viewerCoords.lat, viewerCoords.lng, alert.latitude, alert.longitude)
    : null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600">
              <ShieldAlert size={21} />
            </div>
            <div>
              <p className="font-display font-bold">SurakshaShe</p>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-300">Secure emergency view</p>
            </div>
          </div>
          <span className="rounded-full bg-rose-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-rose-200">
            {alert.status}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="rounded-[2rem] border border-rose-500/25 bg-gradient-to-br from-rose-950 to-slate-900 p-6 sm:p-9">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-rose-300">
            <AlertTriangle size={16} /> Emergency alert
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {userName ?? "A SurakshaShe user"} may need support.
          </h1>
          <div className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Clock3 size={16} className="text-rose-300" /> Activated {new Date(alert.activatedAt).toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-rose-300" /> Accuracy {alert.accuracy ? `${Math.round(alert.accuracy)}m` : "unknown"}
            </div>
            <div className="flex items-center gap-2">
              <UserRound size={16} className="text-rose-300" /> Last update {alert.lastLocationAt ? new Date(alert.lastLocationAt).toLocaleString() : "—"}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="overflow-hidden rounded-3xl bg-white text-slate-900 shadow-xl">
            {/* Unified WebGL-free Leaflet Raster Map */}
            <LeafletMap
              center={{ lat: alert.latitude, lng: alert.longitude }}
              accuracy={alert.accuracy}
              height="340px"
              markers={[{ lat: alert.latitude, lng: alert.longitude, label: "Emergency Location", tone: "incident" }]}
            />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {alert.address || `${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Coordinates: {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                  </p>
                </div>
                {straightLineDist !== null && (
                  <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                    ~{straightLineDist} km away
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {/* External Navigation link */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <Navigation size={15} /> Navigate in Google Maps
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink size={14} /> View Coordinates
                </a>
                {userPhone && (
                  <a
                    href={`tel:${userPhone}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <Phone size={14} /> Call user
                  </a>
                )}
                <a
                  href="tel:112"
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  <Phone size={14} /> Call 112
                </a>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl bg-white p-5 text-slate-900 shadow-xl">
            <h2 className="font-display text-xl font-semibold">Help is on the way</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Match your trusted-contact details so the sender and family know you are responding.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                acknowledge.mutate({ token, ...form });
              }}
              className="mt-5 space-y-3"
            >
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Your name</span>
                <input
                  required
                  value={form.contactName}
                  onChange={(event) => setForm({ ...form, contactName: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
                  placeholder="Full name as in contacts"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Your phone</span>
                <input
                  required
                  type="tel"
                  value={form.contactPhone}
                  onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
                  placeholder="Your phone number"
                />
              </label>
              <select
                value={form.response}
                onChange={(event) => setForm({ ...form, response: event.target.value as "acknowledged" | "responding" })}
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
              >
                <option value="responding">Help is on the way (Responding)</option>
                <option value="acknowledged">I’ve seen this alert (Acknowledged)</option>
              </select>
              <button
                type="submit"
                disabled={acknowledge.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {acknowledge.isPending ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                Send response
              </button>
            </form>
          </aside>
        </div>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-display text-xl font-semibold">Incident timeline</h2>
          <div className="mt-4 space-y-3">
            {timeline.map((event) => (
              <div key={event.id} className="flex gap-4 text-sm">
                <span className="w-20 shrink-0 text-slate-500">{new Date(event.createdAt).toLocaleTimeString()}</span>
                <span className="text-slate-200">{event.message}</span>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          This page shows only the minimum information needed to respond. It expires automatically and does not replace emergency services.
        </p>
      </div>
    </main>
  );
}
