import { useEffect, useState } from "react";
import { ArrowLeft, Clock3, Loader2, Search, ShieldCheck, Trash2, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Admin() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"users" | "incidents" | "suspects" | "vehicles">("users");
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const usersQuery = trpc.admin.users.list.useQuery({ search: search || undefined }, { enabled: meQuery.data?.role === "admin" && view === "users" });
  const auditQuery = trpc.admin.audit.useQuery(undefined, { enabled: meQuery.data?.role === "admin" });
  const incidentsQuery = trpc.admin.incidents.useQuery(undefined, { enabled: meQuery.data?.role === "admin" && view === "incidents" });
  const suspectsQuery = trpc.admin.suspectsList.useQuery(undefined, { enabled: meQuery.data?.role === "admin" && view === "suspects" });
  const vehiclesQuery = trpc.admin.vehiclesList.useQuery(undefined, { enabled: meQuery.data?.role === "admin" && view === "vehicles" });
  const setRole = trpc.admin.users.setRole.useMutation({ onSuccess: () => { usersQuery.refetch(); auditQuery.refetch(); toast.success("Role updated"); } });
  const remove = trpc.admin.users.remove.useMutation({ onSuccess: () => { usersQuery.refetch(); auditQuery.refetch(); toast.success("User deleted"); } });

  useEffect(() => { if (!meQuery.isLoading && meQuery.data?.role !== "admin") navigate("/"); }, [meQuery.data, meQuery.isLoading, navigate]);
  if (meQuery.isLoading || usersQuery.isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#fbf8f7]"><Loader2 className="animate-spin text-rose-600" /></div>;
  if (meQuery.data?.role !== "admin") return null;
  const currentUserId = meQuery.data.id;

  return <main className="min-h-screen bg-[#fbf8f7] text-slate-900"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600 text-white"><ShieldCheck size={21} /></div><div><p className="font-display text-lg font-bold">SurakshaShe</p><p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">Admin control</p></div></div><button type="button" onClick={() => navigate("/")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:border-slate-400"><ArrowLeft size={16} /> Back to app</button></div></header><div className="mx-auto max-w-7xl px-5 py-10 sm:px-8"><div className="mb-8"><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-rose-600"><UserRoundCog size={15} /> Administration</div><h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950">User management</h1><p className="mt-3 text-slate-500">Review accounts, role access, verification state, and recent activity without exposing private location history.</p></div>
      <div className="mb-6 flex overflow-x-auto rounded-2xl bg-slate-100 p-1">
        {(["users", "incidents", "suspects", "vehicles"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setView(tab)}
            className={`flex-1 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition ${
              view === tab
                ? "bg-white text-rose-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {view === "users" && (
        <>
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <Search className="text-slate-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-bold">User</th>
                    <th className="px-5 py-4 font-bold">Contact</th>
                    <th className="px-5 py-4 font-bold">Status</th>
                    <th className="px-5 py-4 font-bold">Role</th>
                    <th className="px-5 py-4 font-bold">Joined</th>
                    <th className="px-5 py-4 font-bold">Last login</th>
                    <th className="px-5 py-4 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(usersQuery.data ?? []).map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 font-bold text-rose-700">
                            {user.name?.[0]?.toUpperCase() ?? "U"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{user.name ?? "Unnamed user"}</p>
                            <p className="text-xs text-slate-400">#{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-700">{user.email ?? "—"}</p>
                        <p className="mt-1 text-xs text-slate-400">{user.phone ?? "No phone"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                          {user.emailVerifiedAt ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Email verified</span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Email unverified</span>
                          )}
                          {user.phoneVerifiedAt ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Phone verified</span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">Phone unverified</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={user.role}
                          disabled={user.id === currentUserId || setRole.isPending}
                          onChange={(event) =>
                            setRole.mutate({ id: user.id, role: event.target.value as "user" | "admin" })
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-rose-400"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          disabled={user.id === currentUserId || remove.isPending}
                          onClick={() =>
                            window.confirm(`Delete ${user.name ?? "this user"}? This removes their saved safety data.`) &&
                            remove.mutate({ id: user.id })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === "incidents" && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-bold">Incident ID</th>
                  <th className="px-5 py-4 font-bold">Location</th>
                  <th className="px-5 py-4 font-bold">Status</th>
                  <th className="px-5 py-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(incidentsQuery.data ?? []).map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">#{incident.id}</td>
                    <td className="px-5 py-4">{incident.latitude}, {incident.longitude}</td>
                    <td className="px-5 py-4">{incident.status}</td>
                    <td className="px-5 py-4 text-slate-500">{new Date(incident.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "suspects" && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-bold">Name</th>
                  <th className="px-5 py-4 font-bold">Description</th>
                  <th className="px-5 py-4 font-bold">Details</th>
                  <th className="px-5 py-4 font-bold">Location</th>
                  <th className="px-5 py-4 font-bold">Date Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(suspectsQuery.data ?? []).map((suspect) => (
                  <tr key={suspect.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-medium text-slate-800">{suspect.name}</td>
                    <td className="px-5 py-4 text-slate-600">{suspect.description || "—"}</td>
                    <td className="px-5 py-4 text-slate-500">{suspect.gender || "—"}, {suspect.ageApprox || "—"}</td>
                    <td className="px-5 py-4 text-slate-600">{suspect.lastKnownLocation || "—"}</td>
                    <td className="px-5 py-4 text-slate-500">{new Date(suspect.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "vehicles" && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-bold">Registration</th>
                  <th className="px-5 py-4 font-bold">Make/Model</th>
                  <th className="px-5 py-4 font-bold">Type/Color</th>
                  <th className="px-5 py-4 font-bold">Description</th>
                  <th className="px-5 py-4 font-bold">Date Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(vehiclesQuery.data ?? []).map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-medium text-slate-800">{vehicle.registrationNumber || "—"}</td>
                    <td className="px-5 py-4 text-slate-600">{vehicle.makeModel || "—"}</td>
                    <td className="px-5 py-4 text-slate-500">{vehicle.type || "—"} / {vehicle.color || "—"}</td>
                    <td className="px-5 py-4 text-slate-600">{vehicle.description || "—"}</td>
                    <td className="px-5 py-4 text-slate-500">{new Date(vehicle.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Clock3 className="text-rose-600" size={19} /><h2 className="font-semibold text-slate-950">Recent administrative audit</h2></div><div className="mt-4 divide-y divide-slate-100">{(auditQuery.data ?? []).slice(0, 8).map((event) => <div key={event.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-medium text-slate-700">{event.action} · {event.targetType} #{event.targetId}</span><span className="text-slate-400">{new Date(event.createdAt).toLocaleString()}</span></div>)}{!auditQuery.data?.length && <p className="py-3 text-sm text-slate-500">No administrative events yet.</p>}</div></section></div></main>;
}
