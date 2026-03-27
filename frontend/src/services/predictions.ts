import { supabase } from "../lib/supabase"
import type { PredictionResponse, PredictionHistoryItem } from "../types"

export async function savePredictionHistory(
  inputText: string,
  prediction: PredictionResponse,
  sourceFilePath: string | null,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("User session not found")
  }

  const { error } = await supabase.from("predictions").insert({
    user_id: user.id,
    input_text: inputText,
    output_tokens: prediction.tokens,
    source_file_path: sourceFilePath,
  })

  if (error) {
    throw error
  }
}

export async function getPredictionHistory(limit = 30): Promise<PredictionHistoryItem[]> {
  const { data, error } = await supabase
    .from("predictions")
    .select("id, input_text, output_tokens, source_file_path, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    input_text: item.input_text,
    output_tokens: item.output_tokens ?? [],
    source_file_path: item.source_file_path,
    created_at: item.created_at,
  }))
}

export async function deletePredictionHistory(id: string) {
  const { error } = await supabase.from("predictions").delete().eq("id", id)

  if (error) {
    throw error
  }
}
