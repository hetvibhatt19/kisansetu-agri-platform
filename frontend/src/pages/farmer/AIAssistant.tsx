import React, { useState, useRef, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../AuthContext';

interface Message {
  id: number; role: 'user' | 'ai'; text: string; source?: string; intent?: string; timestamp: Date;
}

const SUGGESTED = [
  'What is today\'s cotton price?',
  'Should I sell my 20 quintal cotton now or wait?',
  'Which buyer gives the best price for cotton?',
  'Is it worth storing my groundnut for 15 days?',
  'How can I improve my cotton grade?',
  'What is my income this season?',
];

// ─── Frontend-only demo fallback (fires when backend is totally unreachable) ──
// This mirrors the breadth of backend mockResponse so the app is useful offline.
function demoResponse(text: string): string {
  const q = text.toLowerCase();
  const cropMention = q.includes('groundnut') ? 'Groundnut' : 'Cotton';
  const isCotton    = cropMention === 'Cotton';
  const qty         = (() => { const m = text.match(/(\d+)\s*(?:quintal|qtl|q)/i) || text.match(/(\d+)/); return m ? parseInt(m[1], 10) : 20; })();
  const basePrice   = isCotton ? 6850 : 5420;

  // Sell / store decision
  if (q.includes('sell') || q.includes('wait') || q.includes('store') || q.includes('roko')) {
    const forecast = isCotton ? 7056 : 5587;
    const storeCost = isCotton ? 37 : 27; // ₹/qtl for 15 days
    const netGain = (forecast - basePrice - storeCost) * qty;
    if (isCotton) {
      return `Based on current data, ${cropMention} is at ₹${basePrice.toLocaleString('en-IN')}/quintal with a rising trend.\n\nFor ${qty} quintals:\n• Sell now: ₹${(basePrice * qty).toLocaleString('en-IN')}\n• Store 15 days (forecast ₹${forecast}): ₹${((forecast - storeCost) * qty).toLocaleString('en-IN')} net\n• Estimated extra gain: ₹${netGain.toLocaleString('en-IN')}\n\nRecommendation: ${netGain > 500 ? 'Consider storing — the gain covers storage cost.' : 'Prices are stable — sell when convenient.'}`;
    }
    return `${cropMention} is at ₹${basePrice.toLocaleString('en-IN')}/quintal.\n\nFor ${qty} quintals:\n• Sell now: ₹${(basePrice * qty).toLocaleString('en-IN')}\n• Store 15 days (forecast ₹${forecast}): ₹${((forecast - storeCost) * qty).toLocaleString('en-IN')} net\n• Estimated extra gain: ₹${netGain.toLocaleString('en-IN')}\n\n${netGain > 300 ? '✅ Storing looks worthwhile.' : 'Prices are stable — sell now is reasonable.'}`;
  }

  // Buyer matching
  if (q.includes('buyer') || q.includes('best price') || q.includes('kharido')) {
    if (isCotton) {
      return `Top buyers for Cotton right now:\n\n🏆 National Agri Exports — ₹7,100/qtl (Ahmedabad, +₹250 vs mandi)\n🥈 Gujarat Agro Traders — ₹7,050/qtl (Ahmedabad, +₹200 vs mandi)\n🥉 Saurashtra Cotton Mills — ₹6,950/qtl (Rajkot, only 8 km, +₹100 vs mandi)\n\nUse the Find Buyers page to search with your actual quantity and grade.`;
    }
    return `Top buyers for Groundnut right now:\n\n🏆 Patel Oil Industries — ₹5,550/qtl (Gondal, +₹130 vs mandi)\n🥈 Junagadh Oil Mill — ₹5,510/qtl (Junagadh, +₹90 vs mandi)\n🥉 Anand Agri Cooperative — ₹5,480/qtl (Anand, +₹60 vs mandi)\n\nUse the Find Buyers page to get personalised matches.`;
  }

  // Price query
  if (q.includes('price') || q.includes('bhav') || q.includes('rate') || q.includes('kitna')) {
    if (isCotton) {
      return `Today's Cotton prices across Gujarat APMCs:\n\n• Gondal APMC: ₹6,900/qtl ← highest\n• Rajkot APMC: ₹6,850/qtl\n• Surendranagar: ₹6,820/qtl\n• Junagadh: ₹6,780/qtl\n\nTrend: Rising 📈 (+2.1% this week)\n7-day forecast: ₹7,020–₹7,150/qtl`;
    }
    return `Today's Groundnut prices across Gujarat APMCs:\n\n• Bhavnagar APMC: ₹5,450/qtl ← highest\n• Amreli APMC: ₹5,420/qtl\n• Gondal APMC: ₹5,390/qtl\n• Junagadh: ₹5,380/qtl\n\nTrend: Stable ➡️\n7-day forecast: ₹5,430–₹5,590/qtl`;
  }

  // Quality grading
  if (q.includes('quality') || q.includes('grade') || q.includes('gunvatta') || q.includes('improve')) {
    if (isCotton) {
      return `For better Cotton grade:\n\n✓ Staple length ≥28 mm adds premium (ideal 28–32 mm)\n✓ Micronaire 3.8–4.9 is Grade A range\n✓ Moisture ≤8% is critical — dry properly before storage\n✓ Foreign matter ≤2% — clean the cotton thoroughly\n✓ White colour commands highest price\n\nGrade A gets +5% over mandi price. Grade C gets –8%.\n\nUse the Quality Grading page to enter your values and get an estimated grade.`;
    }
    return `For better Groundnut grade:\n\n✓ Moisture ≤9% — dry well after harvest\n✓ Damaged seeds ≤2% — sort carefully\n✓ Foreign matter ≤1% — clean thoroughly\n✓ Oil content ≥48% — determines oil mill price\n✓ Bold seeds fetch highest price\n\nGrade A gets +4% over mandi price. Grade C gets –6%.\n\nUse the Quality Grading page for a detailed estimate.`;
  }

  // Income / season summary
  if (q.includes('income') || q.includes('revenue') || q.includes('season') || q.includes('earn') || q.includes('kamai')) {
    return `Your season summary (demo data):\n\n💰 Total revenue: ₹1,55,000\n📦 Total sold: 25 quintals\n📈 Avg selling price: ₹6,200/qtl\n\nCrop breakdown:\n• Cotton (15 qtl × ₹6,800): ₹1,02,000\n• Groundnut (10 qtl × ₹5,300): ₹53,000\n\nYou have 20 qtl Cotton unsold. At today's rate that is worth ₹1,37,000.\n\nVisit the My Income page for the full breakdown and charts.`;
  }

  // Generic fallback
  return `I can help you with:\n\n• Current mandi prices (Cotton & Groundnut)\n• Should you sell now or store?\n• Finding the best buyer for your crop\n• Quality grading and price impact\n• Season income summary\n\nTry asking: "What is today's cotton price?" or "Should I sell my groundnut now?"`;
}

export default function AIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'ai', text: `Namaste ${user?.name || 'Kisan'}! 🙏\n\nI am your AI farming assistant powered by IBM Granite.\n\nI can help you with:\n• Current mandi prices\n• Should you sell or store?\n• Finding the best buyer\n• Quality grading advice\n\nAsk me anything about your crop!`, timestamp: new Date(), source: 'system' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now(), role: 'user', text, timestamp: new Date() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/assistant/chat', { message: text, context: { location: user?.location, district: user?.district } });
      const aiMsg: Message = {
        id: Date.now() + 1, role: 'ai',
        text: res.data.message,
        source: res.data.source,
        intent: res.data.intent,
        timestamp: new Date()
      };
      setMessages(m => [...m, aiMsg]);
    } catch {
      // Frontend-only fallback — fires only when backend is completely unreachable
      setMessages(m => [...m, { id: Date.now() + 1, role: 'ai', text: demoResponse(text), source: 'offline-demo', timestamp: new Date() }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <h1>🤖 AI Assistant</h1>
        <p>Powered by IBM Granite • Ask anything about your crop</p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 12 }}>
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '12px 14px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role === 'user' ? '#16a34a' : 'white',
              color: m.role === 'user' ? 'white' : '#1f2328',
              border: m.role === 'ai' ? '1px solid #e5e7eb' : 'none',
              fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap'
            }}>
              {m.text}
              {m.role === 'ai' && m.source && m.source !== 'system' && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#9ca3af', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {m.source === 'granite'      && <span>🤖 IBM Granite</span>}
                  {m.source === 'mock'         && <span>🔄 Rule-based response</span>}
                  {m.source === 'offline-demo' && <span>📴 Offline demo</span>}
                  {m.source === 'granite' && <span className="demo-badge" style={{ fontSize: 10 }}>📊 Uses live app data</span>}
                  {m.source === 'mock'    && <span className="demo-badge" style={{ fontSize: 10 }}>📊 Uses app data</span>}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: '12px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
              <span className="spinner" />
              <span style={{ fontSize: 13, color: '#6b7280' }}>Thinking…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div style={{ flexShrink: 0, marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 600 }}>Suggested Questions:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTED.map(s => (
              <button key={s} onClick={() => send(s)}
                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#166534', cursor: 'pointer' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '10px 0 0' }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send(input))}
          placeholder="Ask about prices, buyers, storage... (e.g. Should I sell now?)"
          style={{ flex: 1, padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none' }}
        />
        <button className="btn btn-primary" onClick={() => send(input)} disabled={loading || !input.trim()}
          style={{ padding: '12px 20px', borderRadius: 12 }}>
          Send →
        </button>
      </div>
    </div>
  );
}
