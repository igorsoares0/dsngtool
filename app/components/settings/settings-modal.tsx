"use client";

import { useSettingsStore } from "../../store/settings-store";
import Modal from "../ui/modal";
import SettingsPanel from "./settings-panel";

export default function SettingsModal() {
  const open = useSettingsStore((s) => s.open);
  const close = useSettingsStore((s) => s.closeSettings);
  return (
    <Modal open={open} onClose={close} title="Settings" subtitle="Stored on this device" width="max-w-lg">
      <SettingsPanel />
    </Modal>
  );
}
