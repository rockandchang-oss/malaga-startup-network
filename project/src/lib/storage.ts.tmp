import { supabase } from "./supabase"

// Sube un archivo al bucket "media" y devuelve la URL pública.
export async function uploadImage(file: File, folder = "uploads"): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600", upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from("media").getPublicUrl(path)
  return data.publicUrl
}
