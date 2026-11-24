import type { ReactNode } from "react";
import Header from "@/components/layout/Header";

// The editor fills the screen under the header and never scrolls the page itself: the sidebar
// scrolls, the canvas stays put. So there is no footer here.
export default function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="editor-main">{children}</main>
    </>
  );
}
