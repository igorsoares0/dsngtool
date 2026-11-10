"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSettingsStore } from "../../store/settings-store";
import { useLicenseStore, maskKey } from "../../store/license-store";
import { testApiKey, type GenerateErrorCode } from "../../lib/ai/generate";
import { BACKUP_EXTENSION, downloadBackup, restoreBackup } from "../../lib/backup";
import { toast } from "../../store/toast-store";
import { btnPrimary, btnSecondary } from "../ui/buttons";
import ThemeSelect from "../ui/theme-select";
import { cx } from "../ui/cx";

const KEY_TEST_MESSAGES: Partial<Record<GenerateErrorCode, string>> = {
  invalid_key: "Anthropic rejected this key. Check that you copied all of it.",
  permission: "This key isn't allowed to use the API. Check its workspace in the Anthropic Console.",
  rate_limited: "The key works, but it's rate limited right now.",
  network: "Couldn't reach Anthropic. Check your connection.",
};

const SOURCE_LABEL: Record<string, string> = {
  paddle: "Lifetime license",
  appsumo: "AppSumo lifetime license",
  manual: "Lifetime license",
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-3 py-5 border-t border-border-default first:border-t-0 first:pt-0">
      <h3 className="font-mono text-[10.5px] font-medium uppercase text-text-secondary">{title}</h3>
      {children}
    </section>
  );
}

function AiKeySection() {
  const aiKey = useSettingsStore((s) => s.aiKey);
  const loadAiKey = useSettingsStore((s) => s.loadAiKey);
  const setAiKey = useSettingsStore((s) => s.setAiKey);
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [shown, setShown] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    void loadAiKey();
  }, [loadAiKey]);

  const save = async () => {
    const key = draft.trim();
    if (!key) return;
    setPending(true);
    setMessage(null);
    const result = await testApiKey(key);
    setPending(false);
    // Save unless Anthropic positively rejected it: offline or rate-limited
    // keys are probably fine and can be used later.
    if (result === "invalid_key" || result === "permission") {
      setMessage({ kind: "error", text: KEY_TEST_MESSAGES[result]! });
      return;
    }
    await setAiKey(key);
    setDraft("");
    setMessage(
      result === "ok"
        ? { kind: "ok", text: "Key saved and verified." }
        : { kind: "ok", text: `Key saved. ${KEY_TEST_MESSAGES[result] ?? "It couldn't be verified just now."}` }
    );
  };

  return (
    <>
      <p className="text-[13px] text-text-secondary leading-relaxed">
        AI briefs run on your own Anthropic account. Create a key at{" "}
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-accent decoration-2 underline-offset-[3px] text-text-primary"
        >
          console.anthropic.com
        </a>
        . It is stored on this device and sent only to Anthropic. A brief typically costs about
        a cent.
      </p>

      {aiKey ? (
        <div className="flex items-center justify-between gap-3 h-11 px-3 bg-surface-0 shadow-[inset_0_0_0_1px_var(--border-default)]">
          <span className="font-mono text-[12.5px] text-text-primary truncate">
            {aiKey.slice(0, 10)}…{aiKey.slice(-4)}
          </span>
          <button
            type="button"
            onClick={() => {
              void setAiKey(null);
              setMessage(null);
            }}
            className="font-mono text-[11px] uppercase text-text-tertiary hover:text-danger"
          >
            Remove
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            Anthropic API key
          </label>
          <div className="h-11 flex items-center bg-surface-0 shadow-[inset_0_0_0_1px_var(--border-default)] focus-within:shadow-[inset_0_0_0_1.5px_var(--selection)]">
            <input
              id={inputId}
              type={shown ? "text" : "password"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 min-w-0 h-full px-3 bg-transparent font-mono text-[12.5px] text-text-primary placeholder:text-text-ghost outline-none"
            />
            <button
              type="button"
              onClick={() => setShown((v) => !v)}
              className="px-3 h-full font-mono text-[11px] text-text-tertiary hover:text-text-primary"
            >
              {shown ? "HIDE" : "SHOW"}
            </button>
          </div>
          <button type="submit" disabled={pending || !draft.trim()} className={cx(btnPrimary, "h-10 text-[13px]")}>
            {pending ? "Checking…" : "Save key"}
          </button>
        </form>
      )}

      {message && (
        <p className={cx("text-[12.5px]", message.kind === "error" ? "text-danger" : "text-text-secondary")}>
          {message.text}
        </p>
      )}
    </>
  );
}

function LicenseSection() {
  const license = useLicenseStore((s) => s.license);
  const deactivate = useLicenseStore((s) => s.deactivate);
  const [confirming, setConfirming] = useState(false);
  if (!license) return null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-semibold text-text-primary">
          {SOURCE_LABEL[license.source] ?? "Lifetime license"}
        </span>
        <span className="font-mono text-[11px] text-text-tertiary">
          {maskKey(license.key)} · ACTIVATED {new Date(license.activatedAt).toLocaleDateString()}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(license.key).then(
              () => toast.success("License key copied"),
              () => toast.error("Couldn't copy")
            );
          }}
          className={cx(btnSecondary, "h-9 px-3 text-[12.5px]")}
        >
          Copy key
        </button>
        {confirming ? (
          <button
            type="button"
            onClick={() => void deactivate()}
            className={cx(btnSecondary, "h-9 px-3 text-[12.5px] text-danger border-danger")}
          >
            Remove — I have my key saved
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={cx(btnSecondary, "h-9 px-3 text-[12.5px]")}
          >
            Remove from this device
          </button>
        )}
      </div>
      <p className="text-[12px] text-text-tertiary leading-relaxed">
        Removing the license locks Modo on this device until you activate again. Your designs
        stay where they are.
      </p>
    </>
  );
}

function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);

  return (
    <>
      <p className="text-[13px] text-text-secondary leading-relaxed">
        Your designs and images live only in this browser. Back them up to move to another
        device or keep a copy if this browser&apos;s data is ever cleared.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={async () => {
            setBusy("backup");
            try {
              const n = await downloadBackup();
              toast.success(`Backed up ${n} ${n === 1 ? "project" : "projects"}`);
            } catch {
              toast.error("Backup failed");
            }
            setBusy(null);
          }}
          className={cx(btnSecondary, "h-9 px-3 text-[12.5px]")}
        >
          {busy === "backup" ? "Preparing…" : "Back up everything"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => fileRef.current?.click()}
          className={cx(btnSecondary, "h-9 px-3 text-[12.5px]")}
        >
          {busy === "restore" ? "Restoring…" : "Restore a backup"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={`.${BACKUP_EXTENSION},application/json`}
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy("restore");
            try {
              const r = await restoreBackup(file);
              toast.success(
                `Restored: ${r.added} added, ${r.updated} updated${r.skipped ? `, ${r.skipped} kept as is` : ""}`
              );
              window.dispatchEvent(new Event("modo:projects-changed"));
            } catch (err) {
              toast.error((err as Error).message || "Restore failed");
            }
            setBusy(null);
          }}
        />
      </div>
    </>
  );
}

/** The settings content, shared by the editor's dialog and the dashboard tab. */
export default function SettingsPanel() {
  const focus = useSettingsStore((s) => s.focus);
  useEffect(() => {
    if (focus) document.getElementById(`settings-${focus}`)?.scrollIntoView({ block: "start" });
  }, [focus]);

  return (
    <div className="flex flex-col">
      <Section id="settings-ai" title="AI · Anthropic API key">
        <AiKeySection />
      </Section>
      <Section id="settings-data" title="Your data">
        <DataSection />
      </Section>
      <Section id="settings-license" title="License">
        <LicenseSection />
      </Section>
      <Section id="settings-theme" title="Theme">
        <ThemeSelect />
      </Section>
    </div>
  );
}
