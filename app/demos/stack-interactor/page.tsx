import type { Metadata } from "next";
import DemoOne from "@/components/demos/connoisseur-stack-interactor-demo";

export const metadata: Metadata = {
  title: "Demo · Connoisseur stack interactor",
  robots: { index: false, follow: false },
};

export default function StackInteractorDemoPage() {
  return (
    <main>
      <DemoOne />
    </main>
  );
}
