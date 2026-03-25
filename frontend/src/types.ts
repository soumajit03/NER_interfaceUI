export interface Token {
  text: string
  start: number
  end: number
  bio_label: string
  assigned_tag: string | null
  assigned_gender: string | null
}

export interface PredictionResponse {
  text: string
  tokens: Token[]
}

export interface EntitySpan {
  text: string
  start: number
  end: number
  bio_label: string
  assigned_tag: string | null
  assigned_gender: string | null
}

