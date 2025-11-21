
// pages/routes.tsx
import fs from "fs";
import path from "path";

export async function getStaticProps() {
  const pagesDir = path.join(process.cwd(), "src/pages");

  function scan(dir: string, base = "") {
    const files = fs.readdirSync(dir);
    let out: string[] = [];

    for (const f of files) {
      const full = path.join(dir, f);
      const rel = path.join(base, f);

      if (fs.lstatSync(full).isDirectory()) {
        out = out.concat(scan(full, rel));
      } else if (!rel.endsWith(".ts") && !rel.endsWith(".tsx")) continue;
      else out.push("/" + rel.replace(/(index)?\.tsx?$/, ""));
    }

    return out;
  }

  const routes = scan(pagesDir);

  return { props: { routes } };
}

export default function Routes({ routes }: { routes: string[] }) {
  return (
    <pre>
      {routes.sort().join("\n")}
    </pre>
  );
}
