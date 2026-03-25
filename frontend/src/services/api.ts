import axios from "axios"
import type { PredictionResponse } from "../types"

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
})

export const predictText = (text: string) =>
  API.post<PredictionResponse>("/predict", { text })