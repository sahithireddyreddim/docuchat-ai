"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "../../lib/auth";
import { Navbar } from "../../components/Navbar";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import {
  Users, FileText, MessageSquare, BarChart3, RefreshCw,
  CheckCircle, XCircle, Loader2, Shield,
} from "lucide-react";
import toast from "react-hot-toast";

interface Stats {
  users: number;
  documents: { total: number; processed: number };
  chats: { sessions: number; messages: number };
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: any; label: string; value: number | string; sub?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-blue-600" />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const user = getUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return; }
    if (!user?.is_admin) { router.replace("/chat"); toast.error("Admin access required"); return; }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        api.admin.stats(),
        api.admin.users(),
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  async function toggleUser(userId: number) {
    setTogglingId(userId);
    try {
      const result = await api.admin.toggleUser(userId);
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, is_active: result.is_active } : u)
      );
      toast.success(`User ${result.is_active ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Failed to update user");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
                <p className="text-sm text-gray-500">Platform management</p>
              </div>
            </div>
            <button onClick={loadData} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Stats grid */}
              {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <StatCard icon={Users} label="Total Users" value={stats.users} />
                  <StatCard
                    icon={FileText}
                    label="Documents"
                    value={stats.documents.total}
                    sub={`${stats.documents.processed} processed`}
                  />
                  <StatCard icon={MessageSquare} label="Chat Sessions" value={stats.chats.sessions} />
                  <StatCard
                    icon={BarChart3}
                    label="Total Messages"
                    value={stats.chats.messages}
                  />
                </div>
              )}

              {/* Users table */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Users</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        {["Username", "Email", "Joined", "Status", "Actions"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                            {u.username}
                            {u.is_admin && (
                              <span className="ml-2 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded-full">
                                admin
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{u.email}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {u.created_at ? formatDate(u.created_at) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <CheckCircle className="w-3.5 h-3.5" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-red-500">
                                <XCircle className="w-3.5 h-3.5" /> Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleUser(u.id)}
                              disabled={togglingId === u.id || u.id === user?.id}
                              className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors disabled:opacity-40 ${
                                u.is_active
                                  ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                                  : "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                              }`}
                            >
                              {togglingId === u.id ? "..." : u.is_active ? "Deactivate" : "Activate"}
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
        </div>
      </main>
    </div>
  );
}
