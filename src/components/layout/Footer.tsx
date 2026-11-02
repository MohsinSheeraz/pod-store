import { SITE } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <span className="brand">{SITE.name}</span>
        <p>Every order is printed after you place it. Nothing sits in a warehouse.</p>
      </div>
    </footer>
  );
}
