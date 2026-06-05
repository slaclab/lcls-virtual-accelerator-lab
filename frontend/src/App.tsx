import { useEffect, useState } from "react";

import { fetchConfig } from "./api/client";
import { CombinedPanel } from "./components/CombinedPanel";
import { FELPanel } from "./components/FELPanel";
import { InjectorPanel } from "./components/InjectorPanel";
import type { SliderConfig } from "./types";
import "./App.css";

type Tab = "injector" | "fel" | "combined";

function getGroupFromURL(): number {
  // Try ?group=N query param first (local dev)
  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get("group");
  if (fromParam) return parseInt(fromParam, 10);

  // Try path-based: /gN/ or /ai-lab/gN/ (production deployments)
  const match = window.location.pathname.match(/\/g(\d+)/);
  if (match) return parseInt(match[1], 10);

  return 1;
}

function App() {
  const [tab, setTab] = useState<Tab>("injector");
  const [injectorSliders, setInjectorSliders] = useState<SliderConfig[]>([]);
  const [felSliders, setFelSliders] = useState<SliderConfig[]>([]);
  const [combinedSharedSliders, setCombinedSharedSliders] = useState<SliderConfig[]>([]);
  const [combinedFelSliders, setCombinedFelSliders] = useState<SliderConfig[]>([]);
  const [group] = useState(getGroupFromURL);

  useEffect(() => {
    fetchConfig().then((config) => {
      setInjectorSliders(config.injector_sliders ?? []);
      setFelSliders(config.fel_sliders ?? []);
      setCombinedSharedSliders(config.combined_shared_sliders ?? []);
      setCombinedFelSliders(config.combined_fel_sliders ?? []);
    });
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>LCLS Virtual Accelerator</h1>
        <span className="group-badge">Group {group}</span>
      </header>
      <nav className="tab-nav">
        <button
          className={tab === "injector" ? "active" : ""}
          onClick={() => setTab("injector")}
        >
          Injector
        </button>
        <button
          className={tab === "fel" ? "active" : ""}
          onClick={() => setTab("fel")}
        >
          FEL
        </button>
        <button
          className={tab === "combined" ? "active" : ""}
          onClick={() => setTab("combined")}
        >
          Combined
        </button>
      </nav>
      <main>
        {tab === "injector" && (
          <InjectorPanel sliders={injectorSliders} group={group} />
        )}
        {tab === "fel" && <FELPanel sliders={felSliders} group={group} />}
        {tab === "combined" && (
          <CombinedPanel
            sharedSliders={combinedSharedSliders}
            felOnlySliders={combinedFelSliders}
            group={group}
          />
        )}
      </main>
    </div>
  );
}

export default App;
