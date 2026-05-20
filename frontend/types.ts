// Core Enums
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  AGENT = 'agent'
}

// Minimal Users
export interface User {
  id: number;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  role: UserRole;
  avatar?: string;
  name?: string;
  full_name?: string;
}

// Auth State
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token?: string;
}

// Auction Event
export interface AuctionEvent {
  id: number;
  name: string;
  short_name?: string;
  auction_date: string;
  time?: string;
  location?: string;
  county?: string;
  state?: string;
  tax_status?: string;
  parcels_count?: number;
  live_available_count?: number;
  notes?: string;
  search_link?: string;
  register_date?: string;
  register_link?: string;
  list_link?: string;
  purchase_info_link?: string;
  properties_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Property Auction History
export interface PropertyAuctionHistory {
  id: number;
  property_id: string;
  auction_name?: string;
  auction_date?: string;
  location?: string;
  listed_as?: string;
  taxes_due?: number;
  info_link?: string;
  list_link?: string;
  created_at?: string;
}

// Property Availability History
export interface PropertyAvailabilityHistory {
  id: number;
  property_id: string;
  parcel_id: string;
  address?: string;
  previous_status?: string;
  new_status: string;
  change_source?: string;
  changed_at: string;
}

// Property Main Model
export interface Property {
  id: string | number;
  parcel_id?: string;
  title?: string;  // Optional — not returned by property_details API
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  smart_tag?: string;
  price?: number;
  amount_due?: number;
  occupancy?: string;
  owner_name?: string;
  owner_address?: string;
  tax_sale_year?: number;
  cs_number?: string;
  parcel_code?: string;
  description?: string;
  availability_status?: string;
  created_at?: string;
  updated_at?: string;
  auction_id?: number | null;
  
  // V3 Extended Fields
  property_type?: string;
  assessed_value?: number;
  improvement_value?: number;
  land_value?: number;
  is_qoz?: boolean;
  zoning?: string;
  subdivision?: string;
  legal_description?: string;

  latitude?: number;
  longitude?: number;
  redfin_url?: string;
  redfin_estimate?: number;
  lot_sqft?: number;
  sewer_type?: string;
  water_type?: string;
  property_type_detail?: string;
  import_error_msg?: string;
  is_processed?: boolean;
  map_link?: string;

  details?: PropertyDetails;
  media?: any[];
  auction_history?: PropertyAuctionHistory[];

  // ML Scoring Engine Fields (populated by backend join with property_scores)
  deal_score?: number | null;
  deal_rating?: string | null;
  score_factors?: string[];
  score_model_version?: string | null;
  score_updated_at?: string | null;

  notes?: string;
  attachments?: any[];
  recommended_next_steps?: any[];
  auction_type?: string;
}

// Property Details (nested sub-object and also the single-property API response shape)
export interface PropertyDetails {
  id: number;
  property_id: string;
  parcel_id?: string;
  address?: string;
  county?: string;
  state?: string;
  description?: string;
  amount_due?: number;
  occupancy?: string;
  cs_number?: string;
  property_type?: string;
  status?: string;
  availability_status?: string;
  latitude?: number;
  longitude?: number;
  updated_at?: string;
  created_at?: string;

  // Financials
  estimated_value?: number;
  rental_value?: number;
  assessed_value?: number;
  land_value?: number;
  improvement_value?: number;
  tax_amount?: number;
  tax_year?: number;

  // Owner
  owner_address?: string;
  alternate_owner_address?: string;

  // Physical Attributes
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  lot_size?: number;
  lot_acres?: number;
  lot_sqft?: number;
  year_built?: number;
  num_stories?: number;
  num_units?: number;
  building_area_sqft?: number;
  structure_style?: string;

  // Identifiers
  state_parcel_id?: string;
  account_number?: string;
  attom_id?: string;
  pin_ppin?: string;
  raw_parcel_number?: string;
  county_fips?: string;
  additional_parcel_numbers?: string;

  // Classification
  use_code?: string;
  use_description?: string;
  zoning?: string;
  zoning_description?: string;
  property_type_detail?: string;
  legal_description?: string;
  subdivision?: string;

  // Status
  homestead_exemption?: boolean;
  is_qoz?: boolean;
  is_processed?: boolean;
  import_error_msg?: string;
  state_inventory_entered_date?: string;
  occupancy_checked_date?: string;
  qoz_description?: string;

  // Sale History
  last_sale_date?: string;
  last_sale_price?: number;
  last_transfer_date?: string;

  // Flags & Misc
  flood_zone_code?: string;
  legal_tags?: string;
  parcel_shape_data?: string;

  // External Links
  market_value_url?: string;
  appraisal_desc?: string;
  regrid_url?: string;
  fema_url?: string;
  zillow_url?: string;
  gsi_url?: string;
  gsi_data?: string;
  map_link?: string;
  redfin_url?: string;
  redfin_estimate?: number;
  max_bid?: number;

  // Utilities
  sewer_type?: string;
  water_type?: string;

  // ML Score (returned by backend join)
  deal_score?: number | null;
  deal_rating?: string | null;
  score_factors?: string[];
  score_model_version?: string | null;
  score_updated_at?: string | null;

  // ==== NEW ATTOM FIELDS ==== //
  // Metadata & Parcels
  publishing_date?: string;
  apn_unformatted?: string;
  apn_previous?: string;
  fips_code?: string;
  county_land_use_code?: string;
  county_land_use_description?: string;
  standardized_land_use_category?: string;
  standardized_land_use_type?: string;
  lot_number?: string;
  municipality?: string;
  section_township_range?: string;

  // Structure & Building
  effective_year_built?: number;
  stories?: string;
  rooms_count?: number;
  partial_baths_count?: number;
  parking_type?: string;
  parking_spaces_count?: number;
  pool_type?: string;
  architecture_type?: string;
  construction_type?: string;
  exterior_wall_type?: string;
  foundation_type?: string;
  roof_material_type?: string;
  roof_style_type?: string;
  heating_type?: string;
  heating_fuel_type?: string;
  air_conditioning_type?: string;
  fireplaces?: string;
  basement_type?: string;
  quality?: string;
  condition?: string;

  // Valuations
  market_land_value?: number;
  market_improvement_value?: number;
  market_total_value?: number;
  proprietary_value?: number;
  proprietary_value_high?: number;
  proprietary_value_low?: number;
  proprietary_forecast_std_dev?: number;
  proprietary_valuation_date?: string;

  // Owner
  owner_second_name?: string;
  owner_formatted_street_address?: string;
  owner_city?: string;
  owner_zip_code?: string;
  owner_occupied?: string;

  // Complex Features / JSONB
  other_areas?: any;
  other_features?: any;
  other_improvements?: any;
  other_rooms?: any;
  amenities?: any;
  flooring_types?: string[];
  sales_history_json?: any[];
  tax_history_json?: any[];
  permits_json?: any[];
  extended_owner_json?: any;
  // ========================== //

  // Runtime client data
  notes?: string;
  attachments?: any[];
  recommended_next_steps?: any[];
  auction_history?: any[];
  current_auction_name?: string;
  current_auction_date?: string;
  auction_info_link?: string;
  auction_list_link?: string;
  owner_name?: string;
}

// Client Lists / Folders
export interface ClientList {
    id: number;
    name: string;
    property_count: number;
    is_favorite_list: boolean;
    is_broadcasted: boolean;
    tags?: string;
    has_upcoming_auction?: boolean;
    upcoming_auctions_count?: number;
}