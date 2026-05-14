import Script from "next/script";

export function ThemeInitScript() {
  const code = `
    (() => {
      try {
        const stored = localStorage.getItem("ridepod-theme");
        const theme = stored === "light" || stored === "dark"
          ? stored
          : (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      } catch {
        document.documentElement.dataset.theme = "dark";
        document.documentElement.style.colorScheme = "dark";
      }
    })();
  `;

  return (
    <Script
      id="ridepod-theme-init"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
