import { query } from './pool';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // Crops
  await query(`
    INSERT INTO crops (id, name, name_gujarati, category, unit, grades, storage_cost_per_quintal_per_day)
    VALUES
      ('11111111-0000-0000-0000-000000000001', 'Cotton', 'કપાસ', 'Fiber', 'quintal', ARRAY['A','B','C'], 2.50),
      ('11111111-0000-0000-0000-000000000002', 'Groundnut', 'મગફળી', 'Oilseed', 'quintal', ARRAY['A','B','C'], 1.80)
    ON CONFLICT DO NOTHING
  `);

  // Mandis
  await query(`
    INSERT INTO mandis (id, name, name_gujarati, district, latitude, longitude)
    VALUES
      ('22222222-0000-0000-0000-000000000001', 'Rajkot APMC', 'રાજકોટ APMC', 'Rajkot', 22.3039, 70.8022),
      ('22222222-0000-0000-0000-000000000002', 'Gondal APMC', 'ગોંડલ APMC', 'Rajkot', 21.9614, 70.8042),
      ('22222222-0000-0000-0000-000000000003', 'Junagadh APMC', 'જૂનાગઢ APMC', 'Junagadh', 21.5222, 70.4579),
      ('22222222-0000-0000-0000-000000000004', 'Amreli APMC', 'અમરેલી APMC', 'Amreli', 21.6032, 71.2213),
      ('22222222-0000-0000-0000-000000000005', 'Bhavnagar APMC', 'ભાવનગર APMC', 'Bhavnagar', 21.7645, 72.1519),
      ('22222222-0000-0000-0000-000000000006', 'Surendranagar APMC', 'સુરેન્દ્રનગર APMC', 'Surendranagar', 22.7270, 71.6469),
      ('22222222-0000-0000-0000-000000000007', 'Anand APMC', 'આણંદ APMC', 'Anand', 22.5645, 72.9289)
    ON CONFLICT DO NOTHING
  `);

  // Users (farmers + buyers)
  const farmerPass = await bcrypt.hash('demo123', 10);
  const buyerPass = await bcrypt.hash('demo123', 10);

  await query(`
    INSERT INTO users (id, name, phone, email, password_hash, role, location, district)
    VALUES
      ('33333333-0000-0000-0000-000000000001', 'Raju Patel', '9876543001', 'raju@demo.com', $1, 'farmer', 'Rajkot', 'Rajkot'),
      ('33333333-0000-0000-0000-000000000002', 'Bhavesh Mer', '9876543002', 'bhavesh@demo.com', $1, 'farmer', 'Gondal', 'Rajkot'),
      ('33333333-0000-0000-0000-000000000003', 'Harsha Bhai', '9876543003', 'harsha@demo.com', $1, 'farmer', 'Junagadh', 'Junagadh'),
      ('33333333-0000-0000-0000-000000000004', 'Savita Ben', '9876543004', 'savita@demo.com', $1, 'farmer', 'Amreli', 'Amreli'),
      ('44444444-0000-0000-0000-000000000001', 'Gujarat Agro Traders', '9876540001', 'gat@demo.com', $2, 'buyer', 'Ahmedabad', 'Ahmedabad'),
      ('44444444-0000-0000-0000-000000000002', 'Saurashtra Cotton Mills', '9876540002', 'scm@demo.com', $2, 'buyer', 'Rajkot', 'Rajkot'),
      ('44444444-0000-0000-0000-000000000003', 'Patel Oil Industries', '9876540003', 'poi@demo.com', $2, 'buyer', 'Gondal', 'Rajkot'),
      ('44444444-0000-0000-0000-000000000004', 'National Agri Exports', '9876540004', 'nae@demo.com', $2, 'buyer', 'Ahmedabad', 'Ahmedabad')
    ON CONFLICT DO NOTHING
  `, [farmerPass, buyerPass]);

  // Farmer profiles
  await query(`
    INSERT INTO farmer_profiles (user_id, village, land_size_acres, primary_crops)
    VALUES
      ('33333333-0000-0000-0000-000000000001', 'Kothariya', 8.5, ARRAY['Cotton','Groundnut']),
      ('33333333-0000-0000-0000-000000000002', 'Gondal', 12.0, ARRAY['Cotton']),
      ('33333333-0000-0000-0000-000000000003', 'Mendarda', 6.0, ARRAY['Groundnut']),
      ('33333333-0000-0000-0000-000000000004', 'Amreli', 10.0, ARRAY['Groundnut','Cotton'])
    ON CONFLICT DO NOTHING
  `);

  // Buyer profiles
  await query(`
    INSERT INTO buyer_profiles (user_id, company_name, business_type, annual_purchase_capacity_quintals, preferred_crops)
    VALUES
      ('44444444-0000-0000-0000-000000000001', 'Gujarat Agro Traders Pvt Ltd', 'Trader', 50000, ARRAY['Cotton','Groundnut']),
      ('44444444-0000-0000-0000-000000000002', 'Saurashtra Cotton Mills Ltd', 'Mill', 100000, ARRAY['Cotton']),
      ('44444444-0000-0000-0000-000000000003', 'Patel Oil Industries', 'Oil Mill', 30000, ARRAY['Groundnut']),
      ('44444444-0000-0000-0000-000000000004', 'National Agri Exports Ltd', 'Exporter', 75000, ARRAY['Cotton','Groundnut'])
    ON CONFLICT DO NOTHING
  `);

  // Current mandi prices (today)
  const today = new Date().toISOString().split('T')[0];
  await query(`
    INSERT INTO mandi_prices (mandi_id, crop_id, price_per_quintal, min_price, max_price, modal_price, arrival_quantity_quintals, price_date, source)
    VALUES
      ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001', 6850, 6600, 7100, 6850, 1250, $1, 'demo'),
      ('22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001', 6900, 6700, 7150, 6900, 980, $1, 'demo'),
      ('22222222-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000001', 6780, 6550, 7000, 6780, 760, $1, 'demo'),
      ('22222222-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000002', 5420, 5200, 5650, 5420, 2100, $1, 'demo'),
      ('22222222-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000002', 5380, 5150, 5600, 5380, 1800, $1, 'demo'),
      ('22222222-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000002', 5450, 5250, 5700, 5450, 1550, $1, 'demo'),
      ('22222222-0000-0000-0000-000000000006','11111111-0000-0000-0000-000000000001', 6820, 6600, 7050, 6820, 890, $1, 'demo'),
      ('22222222-0000-0000-0000-000000000007','11111111-0000-0000-0000-000000000002', 5400, 5180, 5620, 5400, 1300, $1, 'demo')
    ON CONFLICT (mandi_id, crop_id, price_date) DO NOTHING
  `, [today]);

  // Historical prices (last 90 days)
  const cottonBasePrice = 6850;
  const groundnutBasePrice = 5420;
  const inserts: any[] = [];

  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const weekFactor = Math.sin(i / 7) * 0.03;
    const noise = (Math.random() - 0.5) * 0.04;
    const trend = (89 - i) / 89 * 0.05; // slight upward trend

    const cottonPrice = Math.round(cottonBasePrice * (1 - 0.05 + trend + weekFactor + noise));
    const groundnutPrice = Math.round(groundnutBasePrice * (1 - 0.04 + trend + weekFactor * 0.8 + noise));

    inserts.push([
      '22222222-0000-0000-0000-000000000001',
      '11111111-0000-0000-0000-000000000001',
      cottonPrice,
      Math.round(cottonPrice * 0.97),
      Math.round(cottonPrice * 1.03),
      dateStr
    ]);
    inserts.push([
      '22222222-0000-0000-0000-000000000004',
      '11111111-0000-0000-0000-000000000002',
      groundnutPrice,
      Math.round(groundnutPrice * 0.97),
      Math.round(groundnutPrice * 1.03),
      dateStr
    ]);
  }

  for (const row of inserts) {
    await query(`
      INSERT INTO historical_prices (mandi_id, crop_id, price_per_quintal, min_price, max_price, price_date, source)
      VALUES ($1,$2,$3,$4,$5,$6,'demo')
      ON CONFLICT DO NOTHING
    `, row);
  }

  // Farmer listings
  await query(`
    INSERT INTO farmer_listings (id, farmer_id, crop_id, quantity_quintals, quality_grade, expected_price_per_quintal, location, district, harvest_date, status)
    VALUES
      ('55555555-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001', 20, 'A', 7000, 'Rajkot', 'Rajkot', CURRENT_DATE - INTERVAL '5 days', 'active'),
      ('55555555-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001', 35, 'B', 6800, 'Gondal', 'Rajkot', CURRENT_DATE - INTERVAL '3 days', 'active'),
      ('55555555-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000002', 25, 'A', 5500, 'Junagadh', 'Junagadh', CURRENT_DATE - INTERVAL '7 days', 'active'),
      ('55555555-0000-0000-0000-000000000004','33333333-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000002', 40, 'B', 5300, 'Amreli', 'Amreli', CURRENT_DATE - INTERVAL '2 days', 'active')
    ON CONFLICT DO NOTHING
  `);

  // Buyer requirements
  await query(`
    INSERT INTO buyer_requirements (id, buyer_id, crop_id, quantity_quintals, min_quantity_quintals, quality_grade, offered_price_per_quintal, location, district, preferred_delivery_date, status)
    VALUES
      ('66666666-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001', 100, 10, 'A', 7050, 'Ahmedabad', 'Ahmedabad', CURRENT_DATE + INTERVAL '10 days', 'active'),
      ('66666666-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001', 200, 20, 'B', 6950, 'Rajkot', 'Rajkot', CURRENT_DATE + INTERVAL '7 days', 'active'),
      ('66666666-0000-0000-0000-000000000003','44444444-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000002', 150, 15, 'A', 5550, 'Gondal', 'Rajkot', CURRENT_DATE + INTERVAL '14 days', 'active'),
      ('66666666-0000-0000-0000-000000000004','44444444-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000001', 80, 10, 'A', 7100, 'Ahmedabad', 'Ahmedabad', CURRENT_DATE + INTERVAL '5 days', 'active'),
      ('66666666-0000-0000-0000-000000000005','44444444-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000002', 120, 20, 'B', 5480, 'Ahmedabad', 'Ahmedabad', CURRENT_DATE + INTERVAL '12 days', 'active')
    ON CONFLICT DO NOTHING
  `);

  // Sample transactions
  await query(`
    INSERT INTO transactions (farmer_id, buyer_id, crop_id, quantity_quintals, price_per_quintal, total_amount, quality_grade, transaction_date, status)
    VALUES
      ('33333333-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001', 15, 6800, 102000, 'A', CURRENT_DATE - INTERVAL '30 days', 'completed'),
      ('33333333-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002', 10, 5300, 53000, 'B', CURRENT_DATE - INTERVAL '45 days', 'completed'),
      ('33333333-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001', 30, 6750, 202500, 'B', CURRENT_DATE - INTERVAL '20 days', 'completed'),
      ('33333333-0000-0000-0000-000000000003','44444444-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000002', 20, 5350, 107000, 'A', CURRENT_DATE - INTERVAL '15 days', 'completed')
    ON CONFLICT DO NOTHING
  `);

  console.log('✅ Seed data inserted');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
