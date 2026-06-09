export async function uploadImage(file: File, folder = "vellox"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao fazer upload da imagem");
  }
  const { url } = await res.json();
  return url as string;
}
