import { preview } from "vite";

export default async function startPreview() {
  // Manage the server in-process so Windows does not need to kill a shell tree.
  const server = await preview({
    preview: { host: "127.0.0.1", port: 4182, strictPort: true },
  });
  return () => server.close();
}
