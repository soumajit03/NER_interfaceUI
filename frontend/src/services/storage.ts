import { supabase } from "../lib/supabase"

const UPLOAD_BUCKET = "ner-uploads"

export async function uploadInputFile(file: File) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("User session not found")
  }

  const sanitizedName = file.name.replace(/\s+/g, "-")
  const path = `${user.id}/${Date.now()}-${sanitizedName}`

  const { data, error } = await supabase.storage.from(UPLOAD_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) {
    throw error
  }

  return {
    bucket: UPLOAD_BUCKET,
    path: data.path,
    filename: file.name,
  }
}
