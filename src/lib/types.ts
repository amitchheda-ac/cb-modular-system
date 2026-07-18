export type UserRole = 'admin' | 'sales' | 'designer' | 'viewer'

export interface Profile {
  id: string
  username: string
  name: string
  role: UserRole
  active: boolean
  mobile: string
}

export interface Factory {
  id: string
  name: string
  city: string
  contact_person: string
  phone: string
  specialties: string
  active: boolean
}

export interface Category {
  id: string
  code: string
  name: string
  lead_time_days: number
  near_water: boolean
  wall_mounted_option: boolean
  active: boolean
  base_rate: number | null // null unless admin
}

export interface Material {
  id: string
  name: string
  brand: string
  thickness_mm: number
  waterproof: boolean
  active: boolean
  rate_per_sqft: number | null
  wastage_pct: number | null
  multiplier: number | null
}

export interface Finish {
  id: string
  name: string
  finish_type: string
  active: boolean
  rate_per_sqft: number | null
  multiplier: number | null
}

export interface ModulePreset {
  id: string
  category_id: string
  code: string
  name: string
  width_mm: number | null
  height_mm: number | null
  depth_mm: number | null
  image_url: string | null
  description: string
  active: boolean
  base_price: number | null
}

export interface Customer {
  id: string
  name: string
  email: string
  mobile: string
  address: string
}

export interface Project {
  id: string
  code: string | null
  name: string
  customer_id: string | null
  site_address: string
  installation_city: string
}

export interface Quotation {
  id: string
  quote_no: string | null
  version: number
  project_id: string | null
  factory_id: string | null
  mode: 'predefined' | 'custom'
  status: 'draft' | 'sent' | 'confirmed' | 'superseded' | 'rejected'
  discount_pct: number
  gst_pct: number
  created_by: string | null
  created_at: string
  price_locked: boolean
  margin_multiplier: number | null // admin only
}

export interface QuotationItem {
  id: string
  quotation_id: string
  category_id: string | null
  module_preset_id: string | null
  material_id: string | null
  external_finish_id: string | null
  internal_finish_id: string | null
  width_mm: number | null
  height_mm: number | null
  depth_mm: number | null
  qty: number
  config: Record<string, unknown>
  images: { url: string; kind: string }[]
  files: { url: string; kind: string }[]
  sell_amount: number | null
  cost_amount: number | null // admin only
  line_breakdown: { label: string; amount: number }[] | null // admin only
  created_at: string
}

export interface QuotationTotals {
  quotation_id: string
  subtotal: number
  discount_pct: number
  discount_amount: number
  taxable: number
  gst_pct: number
  gst_amount: number
  grand_total: number
}
