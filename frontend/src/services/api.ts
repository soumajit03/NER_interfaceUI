import axios from "axios"
import type { PredictionResponse } from "../types"
import { supabase } from "../lib/supabase"

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api",
})

API.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }

  return config
})

export const predictText = (text: string) =>
  API.post<PredictionResponse>("/predict", { text })