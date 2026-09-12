import { query } from './pool';

const schema = `
-- Users (farmers and buyers)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('farmer', 'buyer', 'admin')),
  location VARCHAR(255),
  district VARCHAR(100),
  state VARCHAR(100) DEFAULT 'Gujarat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Farmer profiles
CREATE TABLE IF NOT EXISTS farmer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  village VARCHAR(255),
  land_size_acres DECIMAL(10,2),
  primary_crops TEXT[],
  bank_account VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buyer profiles
CREATE TABLE IF NOT EXISTS buyer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  business_type VARCHAR(100),
  gst_number VARCHAR(50),
  annual_purchase_capacity_quintals DECIMAL(12,2),
  preferred_crops TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crops master
CREATE TABLE IF NOT EXISTS crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_gujarati VARCHAR(100),
  category VARCHAR(100),
  unit VARCHAR(20) DEFAULT 'quintal',
  grades TEXT[] DEFAULT ARRAY['A', 'B', 'C'],
  min_storage_days INTEGER DEFAULT 0,
  max_storage_days INTEGER DEFAULT 180,
  storage_cost_per_quintal_per_day DECIMAL(8,2) DEFAULT 2.00
);

-- Mandis (markets)
CREATE TABLE IF NOT EXISTS mandis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_gujarati VARCHAR(255),
  district VARCHAR(100) NOT NULL,
  state VARCHAR(100) DEFAULT 'Gujarat',
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7)
);

-- Current mandi prices
CREATE TABLE IF NOT EXISTS mandi_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandi_id UUID REFERENCES mandis(id),
  crop_id UUID REFERENCES crops(id),
  price_per_quintal DECIMAL(10,2) NOT NULL,
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  modal_price DECIMAL(10,2),
  arrival_quantity_quintals DECIMAL(12,2),
  price_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source VARCHAR(50) DEFAULT 'demo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mandi_id, crop_id, price_date)
);

-- Historical mandi prices
CREATE TABLE IF NOT EXISTS historical_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandi_id UUID REFERENCES mandis(id),
  crop_id UUID REFERENCES crops(id),
  price_per_quintal DECIMAL(10,2) NOT NULL,
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  price_date DATE NOT NULL,
  source VARCHAR(50) DEFAULT 'demo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Farmer crop listings
CREATE TABLE IF NOT EXISTS farmer_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES users(id),
  crop_id UUID REFERENCES crops(id),
  quantity_quintals DECIMAL(10,2) NOT NULL,
  quality_grade VARCHAR(10),
  expected_price_per_quintal DECIMAL(10,2),
  location VARCHAR(255),
  district VARCHAR(100),
  harvest_date DATE,
  available_from DATE DEFAULT CURRENT_DATE,
  available_until DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','matched','sold','expired')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buyer requirements
CREATE TABLE IF NOT EXISTS buyer_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES users(id),
  crop_id UUID REFERENCES crops(id),
  quantity_quintals DECIMAL(10,2) NOT NULL,
  min_quantity_quintals DECIMAL(10,2),
  quality_grade VARCHAR(10),
  offered_price_per_quintal DECIMAL(10,2) NOT NULL,
  location VARCHAR(255),
  district VARCHAR(100),
  preferred_delivery_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','fulfilled','expired')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches between farmers and buyers
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES farmer_listings(id),
  requirement_id UUID REFERENCES buyer_requirements(id),
  match_score DECIMAL(5,2),
  score_breakdown JSONB,
  explanation TEXT,
  status VARCHAR(20) DEFAULT 'suggested' CHECK (status IN ('suggested','accepted','rejected','completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES users(id),
  buyer_id UUID REFERENCES users(id),
  crop_id UUID REFERENCES crops(id),
  quantity_quintals DECIMAL(10,2) NOT NULL,
  price_per_quintal DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  quality_grade VARCHAR(10),
  transaction_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage records
CREATE TABLE IF NOT EXISTS storage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES users(id),
  crop_id UUID REFERENCES crops(id),
  quantity_quintals DECIMAL(10,2) NOT NULL,
  storage_start_date DATE DEFAULT CURRENT_DATE,
  storage_facility VARCHAR(255),
  cost_per_quintal_per_day DECIMAL(8,2) DEFAULT 2.00,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','sold','disposed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality assessments
CREATE TABLE IF NOT EXISTS quality_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES users(id),
  crop_id UUID REFERENCES crops(id),
  moisture_content DECIMAL(5,2),
  foreign_matter_pct DECIMAL(5,2),
  damaged_seeds_pct DECIMAL(5,2),
  oil_content_pct DECIMAL(5,2),
  staple_length_mm DECIMAL(5,2),
  micronaire DECIMAL(5,2),
  color_grade VARCHAR(20),
  overall_grade VARCHAR(10),
  estimated_price_impact_pct DECIMAL(5,2),
  grade_explanation TEXT,
  image_path VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price forecasts (cached)
CREATE TABLE IF NOT EXISTS price_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID REFERENCES crops(id),
  mandi_id UUID REFERENCES mandis(id),
  forecast_date DATE NOT NULL,
  forecast_for_date DATE NOT NULL,
  predicted_price DECIMAL(10,2),
  price_range_low DECIMAL(10,2),
  price_range_high DECIMAL(10,2),
  confidence_score DECIMAL(5,2),
  trend VARCHAR(20),
  factors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mandi_prices_date ON mandi_prices(price_date DESC);
CREATE INDEX IF NOT EXISTS idx_historical_prices_date ON historical_prices(price_date DESC);
CREATE INDEX IF NOT EXISTS idx_farmer_listings_status ON farmer_listings(status);
CREATE INDEX IF NOT EXISTS idx_buyer_requirements_status ON buyer_requirements(status);
CREATE INDEX IF NOT EXISTS idx_transactions_farmer ON transactions(farmer_id);
`;

async function migrate() {
  console.log('Running migrations...');
  try {
    await query(schema);
    console.log('✅ Migrations complete');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

migrate();
