import EditorLayout from "./components/editor/editor-layout";
import LicenseGate from "./components/license/license-gate";

export default function Home() {
  return (
    <LicenseGate>
      <EditorLayout />
    </LicenseGate>
  );
}
