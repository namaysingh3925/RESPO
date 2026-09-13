import type { Metadata } from "next";
import FlowArtDefaultDemo from "@/components/demos/story-scroll-demo";

export const metadata: Metadata = {
  title: "Demo · Story scroll",
  robots: { index: false, follow: false },
};

export default function StoryScrollDemoPage() {
  return <FlowArtDefaultDemo />;
}
