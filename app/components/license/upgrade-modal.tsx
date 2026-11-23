"use client";

import { useEffect } from "react";
import { useLicenseStore } from "../../store/license-store";
import { usePlanStore, FREE_EXPORTS, type UpgradeReason } from "../../store/plan-store";
import { toast } from "../../store/toast-store";
import { TEMPLATES } from "../../data/templates";
import Modal from "../ui/modal";
import { ActivationForm } from "./activation-screen";

const PREMIUM_COUNT = TEMPLATES.filter((t) => t.premium).length;

const COPY: Record<UpgradeReason, { title: string; lead: string }> = {
  exports: {
    title: "You've used your free exports",
    lead: `The free plan includes ${FREE_EXPORTS} image exports. A lifetime license makes them unlimited.`,
  },
  template: {
    title: "This is a premium template",
    lead: "Premium templates come with a lifetime license.",
  },
  "project-file": {
    title: "Save .modo project files",
    lead: "Downloading editable project files comes with a lifetime license. Opening them is free.",
  },
  generic: {
    title: "Get Modo for life",
    lead: "One payment, no subscription.",
  },
};

const PERKS = [
  "Unlimited PNG and JPEG exports",
  `All ${TEMPLATES.length} templates, including the ${PREMIUM_COUNT} premium ones`,
  "Save designs as .modo project files",
  "Every future update",
];

/** The free plan's paywall: why it opened, what a license adds, buy or paste a key. */
export default function UpgradeModal() {
  const reason = usePlanStore((s) => s.upgradeReason);
  const close = usePlanStore((s) => s.closeUpgrade);

  // Activated from here (or anywhere else): the dialog has done its job.
  useEffect(
    () =>
      useLicenseStore.subscribe((s, prev) => {
        if (prev.status !== "active" && s.status === "active" && usePlanStore.getState().upgradeReason) {
          usePlanStore.getState().closeUpgrade();
          toast.success("Lifetime license active. Thank you!");
        }
      }),
    []
  );

  const copy = COPY[reason ?? "generic"];

  return (
    <Modal open={reason !== null} onClose={close} title={copy.title} width="max-w-[440px]">
      <div className="flex flex-col gap-5">
        <p className="text-[13.5px] text-text-secondary leading-relaxed">{copy.lead}</p>
        <ul className="flex flex-col gap-1.5">
          {PERKS.map((p) => (
            <li key={p} className="flex gap-2.5 text-[13px] text-text-primary">
              <span className="text-accent font-bold" aria-hidden>
                +
              </span>
              {p}
            </li>
          ))}
        </ul>
        <ActivationForm compact />
      </div>
    </Modal>
  );
}
