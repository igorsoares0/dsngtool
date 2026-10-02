"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "../store/toast-store";
import { useEntitlementStore } from "../store/entitlement-store";
import { numberProjects } from "../lib/project-number";
import Toaster from "../components/editor/toaster";
import UpgradeModal from "../components/editor/upgrade-modal";
import DashboardTopbar from "../components/dashboard/dashboard-topbar";
import ProjectsView from "../components/dashboard/projects-view";
import AccountView, { RESUME_DELETE_PARAM } from "../components/dashboard/account-view";
import type { Me, Nav, ProjectRow } from "../components/dashboard/types";

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const router = useRouter();
  // Set when a provider re-authentication was started from the danger zone
  // (see DangerZone). Read as a prop rather than off `location` in an effect,
  // so the account panel is the one already rendered on the way back — no
  // flash of the projects tab and no setState cascade on mount.
  const resumeDelete = use(searchParams)[RESUME_DELETE_PARAM] !== undefined;
  const [me, setMe] = useState<Me | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [numbers, setNumbers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [nav, setNav] = useState<Nav>(resumeDelete ? "account" : "projects");

  const load = useCallback(async () => {
    try {
      const [meRes, projRes] = await Promise.all([fetch("/api/me"), fetch("/api/projects")]);
      if (meRes.status === 401) {
        router.push("/login?redirect=/dashboard");
        return;
      }
      const meData = (await meRes.json()) as Me;
      const projData = (await projRes.json()) as { projects: ProjectRow[] };
      const rows = projData.projects ?? [];
      setMe(meData);
      // The topbar meter, the upgrade modal and the account menu all read the
      // shared entitlement store — seed it from the same response rather than
      // fetching /api/me twice.
      useEntitlementStore.setState({
        pro: meData.pro,
        storage: meData.storage,
        ai: meData.ai ?? null,
        hydrated: true,
      });
      // Numbered over every row, tombstones included, so deleting a project
      // never renumbers the rest.
      setNumbers(numberProjects(rows));
      setProjects(
        rows
          .filter((p) => !p.deletedAt)
          .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
      );
    } catch {
      toast.error("Couldn't load your dashboard. Try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const del = async (id: string) => {
    const name = projects.find((p) => p.id === id)?.name;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      toast.show({ type: "info", message: "Project deleted", sub: name ? `“${name}”` : undefined });
    } catch {
      toast.error("Couldn't delete project");
      load();
    }
  };

  // `body { overflow: hidden }` is global for the editor's sake, so this page
  // has to own its own scroll container.
  return (
    <div className="h-full flex flex-col overflow-hidden bg-surface-0 text-text-primary">
      <DashboardTopbar nav={nav} onNav={setNav} />
      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {nav === "account" ? (
          <AccountView me={me} projectCount={projects.length} resumeDelete={resumeDelete} />
        ) : (
          <ProjectsView me={me} projects={projects} numbers={numbers} loading={loading} onDelete={del} />
        )}
      </main>

      {/* The dashboard fires toasts too — before this, every one of them was
          dropped because <Toaster /> only existed inside the editor. */}
      <Toaster />
      <UpgradeModal />
    </div>
  );
}
