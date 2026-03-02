import { useState, useRef, useEffect } from "react";

const DRESSES = [
  { id: 1, name: "Rose Petal Silk Dress", price: 1299, image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&q=80", sizes: ["S","M","L","XL"], color: "Rose", desc: "Elegant silk dress with floral drape" },
  { id: 2, name: "Midnight Velvet Gown", price: 2199, image: "https://images.unsplash.com/photo-1566479179817-e2f5cbad0df7?w=400&q=80", sizes: ["S","M","L"], color: "Black", desc: "Luxurious velvet evening gown" },
  { id: 3, name: "Ivory Lace Kurta", price: 899, image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&q=80", sizes: ["S","M","L","XL","XXL"], color: "Ivory", desc: "Delicate lace embroidered kurta" },
  { id: 4, name: "Saffron Anarkali", price: 1599, image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80", sizes: ["M","L","XL"], color: "Saffron", desc: "Vibrant festive anarkali suit" },
  { id: 5, name: "Cobalt Blue Saree", price: 1899, image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=400&q=80", sizes: ["Free Size"], color: "Blue", desc: "Stunning cobalt drape saree" },
  { id: 6, name: "Blush Lehenga Set", price: 3499, image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80", sizes: ["S","M","L"], color: "Blush", desc: "Bridal blush lehenga with dupatta" },
];

const SYSTEM_PROMPT = `You are "Priya", a warm, friendly AI Shop Assistant for an Indian fashion boutique. 
You help customers browse dresses, answer questions, and guide them to purchase.

Available products:
${DRESSES.map(d => `- ${d.name} (₹${d.price}): ${d.desc}, Colors: ${d.color}, Sizes: ${d.sizes.join(", ")}`).join("\n")}

Your job:
- Greet warmly and ask what they're looking for
- Recommend dresses based on their needs (occasion, budget, size)
- When they want to see products, reply with: SHOW_PRODUCTS
- When they pick a dress, guide them to select size and add to cart
- Keep responses SHORT (2-3 lines max), friendly, use occasional emojis
- If they ask about price, give exact price in ₹
- Encourage them to complete purchase

Never make up products not in the list. Be conversational like a real shop assistant.`;

export default function AIShopAssistant() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Namaste! 🙏 I'm **Priya**, your AI Shop Assistant! Welcome to our boutique.\n\nAre you looking for something special today — a party outfit, casual wear, or maybe something for a festive occasion? 💃" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [showProducts, setShowProducts] = useState(false);
  const [view, setView] = useState("chat"); // chat | cart | checkout | success | admin
  const [checkout, setCheckout] = useState({ name: "", phone: "", address: "", city: "", pincode: "" });
  const [orders, setOrders] = useState([]);
  const [selectedSize, setSelectedSize] = useState({});
  const [adminPass, setAdminPass] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, showProducts]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't respond. Please try again!";
      
      if (reply.includes("SHOW_PRODUCTS")) {
        setShowProducts(true);
        const cleaned = reply.replace("SHOW_PRODUCTS", "").trim();
        setMessages(prev => [...prev, { role: "assistant", content: cleaned || "Here are our beautiful collections! 👗✨" }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Oops! Something went wrong. Please try again 🙏" }]);
    }
    setLoading(false);
  };

  const addToCart = (dress) => {
    const size = selectedSize[dress.id] || dress.sizes[0];
    const existing = cart.find(i => i.id === dress.id && i.size === size);
    if (existing) {
      setCart(cart.map(i => i.id === dress.id && i.size === size ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...dress, size, qty: 1 }]);
    }
    setMessages(prev => [...prev, 
      { role: "assistant", content: `✅ Added **${dress.name}** (Size: ${size}) to your cart! Want to keep browsing or shall we go to checkout? 🛒` }
    ]);
  };

  const removeFromCart = (id, size) => setCart(cart.filter(i => !(i.id === id && i.size === size)));
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const placeOrder = () => {
    if (!checkout.name || !checkout.phone || !checkout.address || !checkout.city || !checkout.pincode) return alert("Please fill all fields!");
    const order = {
      id: "ORD" + Date.now(),
      date: new Date().toLocaleString("en-IN"),
      customer: checkout,
      items: cart,
      total,
      status: "Paid"
    };
    setOrders(prev => [...prev, order]);
    setCart([]);
    setCheckout({ name: "", phone: "", address: "", city: "", pincode: "" });
    setView("success");
  };

  const exportCSV = () => {
    const rows = [["Order ID", "Date", "Name", "Phone", "Address", "City", "Pincode", "Items", "Total"]];
    orders.forEach(o => {
      rows.push([o.id, o.date, o.customer.name, o.customer.phone, o.customer.address, o.customer.city, o.customer.pincode,
        o.items.map(i => `${i.name}(${i.size})x${i.qty}`).join("; "), "₹" + o.total]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv); a.download = "shipping_orders.csv"; a.click();
  };

  const renderMarkdown = (text) => {
    return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
  };

  return (
    <div style={{ fontFamily: "'Crimson Text', Georgia, serif", minHeight: "100vh", background: "linear-gradient(135deg, #1a0a00 0%, #2d1200 50%, #1a0a00 100%)", display: "flex", flexDirection: "column", color: "#f5e6d0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Cormorant+Garamond:wght@300;400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #1a0a00; } ::-webkit-scrollbar-thumb { background: #c9860a; border-radius: 2px; }
        .chat-bubble-user { background: linear-gradient(135deg, #c9860a, #e8a020); color: #1a0a00; border-radius: 18px 18px 4px 18px; padding: 10px 16px; max-width: 75%; align-self: flex-end; font-size: 15px; }
        .chat-bubble-ai { background: linear-gradient(135deg, #2d1a00, #3d2400); border: 1px solid #c9860a44; border-radius: 18px 18px 18px 4px; padding: 12px 16px; max-width: 80%; font-size: 15px; line-height: 1.6; }
        .product-card { background: linear-gradient(160deg, #2d1a00, #1a0a00); border: 1px solid #c9860a55; border-radius: 16px; overflow: hidden; transition: transform 0.2s, border-color 0.2s; cursor: pointer; }
        .product-card:hover { transform: translateY(-4px); border-color: #c9860a; }
        .btn-gold { background: linear-gradient(135deg, #c9860a, #e8a020); color: #1a0a00; border: none; border-radius: 10px; padding: 10px 22px; font-family: 'Crimson Text', serif; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
        .btn-gold:hover { opacity: 0.9; }
        .btn-outline { background: transparent; color: #c9860a; border: 1px solid #c9860a; border-radius: 10px; padding: 8px 18px; font-family: 'Crimson Text', serif; font-size: 14px; cursor: pointer; transition: all 0.2s; }
        .btn-outline:hover { background: #c9860a22; }
        .input-field { background: #2d1a00; border: 1px solid #c9860a44; border-radius: 10px; color: #f5e6d0; padding: 10px 14px; font-family: 'Crimson Text', serif; font-size: 15px; width: 100%; outline: none; }
        .input-field:focus { border-color: #c9860a; }
        .nav-btn { background: transparent; border: none; color: #f5e6d0aa; font-family: 'Crimson Text', serif; font-size: 15px; cursor: pointer; padding: 8px 14px; border-radius: 8px; transition: all 0.2s; }
        .nav-btn.active, .nav-btn:hover { color: #c9860a; background: #c9860a11; }
        .size-btn { background: #2d1a00; border: 1px solid #c9860a33; color: #f5e6d0aa; border-radius: 6px; padding: 4px 10px; font-size: 13px; cursor: pointer; transition: all 0.15s; }
        .size-btn.selected { background: #c9860a; color: #1a0a00; border-color: #c9860a; }
        .dot-pulse { display: inline-flex; gap: 4px; align-items: center; padding: 4px 0; }
        .dot-pulse span { width: 6px; height: 6px; background: #c9860a; border-radius: 50%; animation: pulse 1.2s infinite; }
        .dot-pulse span:nth-child(2) { animation-delay: 0.2s; } .dot-pulse span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }
        .badge { background: #c9860a; color: #1a0a00; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; font-weight: bold; display: inline-flex; align-items: center; justify-content: center; margin-left: 4px; }
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(90deg, #1a0a00, #2d1200, #1a0a00)", borderBottom: "1px solid #c9860a44", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, #c9860a, #e8a020)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤖</div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: "#e8a020", letterSpacing: "0.5px" }}>AI Shop Assistant</div>
            <div style={{ fontSize: 12, color: "#c9860a99" }}>● Online — Priya is here to help</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="nav-btn" style={view==="chat"?{color:"#c9860a",background:"#c9860a11"}:{}} onClick={() => setView("chat")}>💬 Chat</button>
          <button className="nav-btn" onClick={() => setView("cart")}>🛒 Cart {cart.length > 0 && <span className="badge">{cart.length}</span>}</button>
          <button className="nav-btn" onClick={() => setView("admin")}>📦 Orders</button>
        </div>
      </div>

      {/* CHAT VIEW */}
      {view === "chat" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 780, width: "100%", margin: "0 auto", padding: "0 16px" }}>
          <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "20px 0", display: "flex", flexDirection: "column", gap: 12, minHeight: 0, maxHeight: "calc(100vh - 200px)" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" && <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #c9860a, #e8a020)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginRight: 8, flexShrink: 0, alignSelf: "flex-end" }}>🤖</div>}
                <div className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"} dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #c9860a, #e8a020)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
                <div className="chat-bubble-ai"><div className="dot-pulse"><span/><span/><span/></div></div>
              </div>
            )}

            {/* Products Grid in Chat */}
            {showProducts && (
              <div>
                <div style={{ color: "#c9860a", fontSize: 13, marginBottom: 10, marginLeft: 40 }}>✨ Our Collection</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginLeft: 40 }}>
                  {DRESSES.map(d => (
                    <div key={d.id} className="product-card">
                      <img src={d.image} alt={d.name} style={{ width: "100%", height: 160, objectFit: "cover" }} />
                      <div style={{ padding: "10px 12px" }}>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{d.name}</div>
                        <div style={{ color: "#c9860a", fontWeight: 600, fontSize: 15, marginBottom: 8 }}>₹{d.price}</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                          {d.sizes.map(s => (
                            <button key={s} className={`size-btn ${selectedSize[d.id] === s ? "selected" : ""}`} onClick={() => setSelectedSize(p => ({...p, [d.id]: s}))}>{s}</button>
                          ))}
                        </div>
                        <button className="btn-gold" style={{ width: "100%", padding: "8px", fontSize: 13 }} onClick={() => addToCart(d)}>Add to Cart 🛒</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          <div style={{ display: "flex", gap: 8, padding: "8px 0", flexWrap: "wrap" }}>
            {["Show all dresses 👗", "What's under ₹1000?", "I need a party outfit", "Best festive wear?"].map(q => (
              <button key={q} className="btn-outline" style={{ fontSize: 13 }} onClick={() => sendMessage(q)}>{q}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: "12px 0 20px", display: "flex", gap: 10 }}>
            <input ref={inputRef} className="input-field" placeholder="Ask Priya anything..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage(input)} />
            <button className="btn-gold" style={{ padding: "10px 20px", whiteSpace: "nowrap" }} onClick={() => sendMessage(input)} disabled={loading}>Send ✈️</button>
          </div>
        </div>
      )}

      {/* CART VIEW */}
      {view === "cart" && (
        <div style={{ flex: 1, maxWidth: 600, width: "100%", margin: "0 auto", padding: "24px 16px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: "#e8a020", marginBottom: 20 }}>Your Cart 🛒</h2>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#f5e6d066" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛍️</div>
              <div>Your cart is empty</div>
              <button className="btn-gold" style={{ marginTop: 16 }} onClick={() => setView("chat")}>Start Shopping</button>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id + item.size} style={{ display: "flex", gap: 14, background: "#2d1a0099", border: "1px solid #c9860a33", borderRadius: 14, padding: 14, marginBottom: 12, alignItems: "center" }}>
                  <img src={item.image} alt={item.name} style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 10 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", fontSize: 16 }}>{item.name}</div>
                    <div style={{ color: "#f5e6d0aa", fontSize: 13 }}>Size: {item.size} · Qty: {item.qty}</div>
                    <div style={{ color: "#c9860a", fontWeight: 600 }}>₹{item.price * item.qty}</div>
                  </div>
                  <button onClick={() => removeFromCart(item.id, item.size)} style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: 18 }}>🗑</button>
                </div>
              ))}
              <div style={{ background: "#2d1a00", border: "1px solid #c9860a55", borderRadius: 14, padding: 16, marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
                  <span>Total</span><span style={{ color: "#e8a020" }}>₹{total}</span>
                </div>
                <button className="btn-gold" style={{ width: "100%", padding: 14, fontSize: 17 }} onClick={() => setView("checkout")}>Proceed to Checkout →</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* CHECKOUT VIEW */}
      {view === "checkout" && (
        <div style={{ flex: 1, maxWidth: 550, width: "100%", margin: "0 auto", padding: "24px 16px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: "#e8a020", marginBottom: 6 }}>Checkout 💳</h2>
          <p style={{ color: "#f5e6d0aa", marginBottom: 24, fontSize: 14 }}>Fill in your details for delivery</p>
          {[["Full Name", "name", "Your full name"], ["Phone Number", "phone", "10-digit mobile number"], ["Delivery Address", "address", "House no, Street, Area"], ["City", "city", "Your city"], ["Pincode", "pincode", "6-digit pincode"]].map(([label, field, ph]) => (
            <div key={field} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "#c9860a", display: "block", marginBottom: 5 }}>{label}</label>
              <input className="input-field" placeholder={ph} value={checkout[field]} onChange={e => setCheckout(p => ({...p, [field]: e.target.value}))} />
            </div>
          ))}
          <div style={{ background: "#2d1a00", border: "1px solid #c9860a33", borderRadius: 12, padding: 14, margin: "16px 0" }}>
            <div style={{ fontSize: 13, color: "#c9860a", marginBottom: 8 }}>Order Summary</div>
            {cart.map(i => <div key={i.id+i.size} style={{ display:"flex", justifyContent:"space-between", fontSize:14, marginBottom:4 }}><span>{i.name} ({i.size}) ×{i.qty}</span><span>₹{i.price*i.qty}</span></div>)}
            <div style={{ borderTop:"1px solid #c9860a33", marginTop:8, paddingTop:8, display:"flex", justifyContent:"space-between", fontWeight:600, color:"#e8a020" }}><span>Total</span><span>₹{total}</span></div>
          </div>
          <div style={{ background: "#1a2d00", border: "1px solid #4a8020", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#a0d060" }}>
            💡 Pay via UPI/Card after placing order. Our team will confirm payment & dispatch within 24hrs.
          </div>
          <button className="btn-gold" style={{ width: "100%", padding: 15, fontSize: 17 }} onClick={placeOrder}>Place Order 🎉</button>
          <button className="btn-outline" style={{ width: "100%", padding: 12, marginTop: 10 }} onClick={() => setView("cart")}>← Back to Cart</button>
        </div>
      )}

      {/* SUCCESS */}
      {view === "success" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, color: "#e8a020", marginBottom: 8 }}>Order Placed!</h2>
          <p style={{ color: "#f5e6d0aa", maxWidth: 360, lineHeight: 1.7, marginBottom: 24 }}>Thank you for shopping with us! We'll contact you on WhatsApp to confirm payment and dispatch your order within 24 hours. 🛍️</p>
          <button className="btn-gold" style={{ padding: "12px 32px", fontSize: 16 }} onClick={() => setView("chat")}>Continue Shopping</button>
        </div>
      )}

      {/* ADMIN VIEW */}
      {view === "admin" && (
        <div style={{ flex: 1, maxWidth: 800, width: "100%", margin: "0 auto", padding: "24px 16px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: "#e8a020", marginBottom: 6 }}>📦 Orders & Shipping</h2>
          {!adminUnlocked ? (
            <div style={{ maxWidth: 320, margin: "40px auto", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
              <p style={{ color: "#f5e6d0aa", marginBottom: 16 }}>Enter shop owner password</p>
              <input className="input-field" type="password" placeholder="Password" value={adminPass} onChange={e => setAdminPass(e.target.value)} style={{ marginBottom: 12 }} />
              <button className="btn-gold" style={{ width: "100%" }} onClick={() => { if (adminPass === "shop123") setAdminUnlocked(true); else alert("Wrong password! Use: shop123"); }}>Unlock</button>
              <div style={{ fontSize: 12, color: "#c9860a66", marginTop: 8 }}>Default: shop123</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ color: "#f5e6d0aa" }}>{orders.length} orders · ₹{orders.reduce((s,o) => s+o.total, 0)} total</div>
                <button className="btn-gold" onClick={exportCSV} disabled={orders.length === 0}>⬇️ Export for Shipping</button>
              </div>
              {orders.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60, color: "#f5e6d066" }}>
                  <div style={{ fontSize: 48 }}>📭</div>
                  <div style={{ marginTop: 12 }}>No orders yet. They'll appear here once customers checkout.</div>
                </div>
              ) : orders.map(o => (
                <div key={o.id} style={{ background: "#2d1a0099", border: "1px solid #c9860a33", borderRadius: 14, padding: 16, marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "#c9860a", fontWeight: 600 }}>{o.id}</span>
                    <span style={{ background: "#1a3d00", color: "#80d040", borderRadius: 6, padding: "2px 10px", fontSize: 13 }}>✅ {o.status}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#f5e6d0aa", marginBottom: 4 }}>📅 {o.date}</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>👤 {o.customer.name} · 📞 {o.customer.phone}</div>
                  <div style={{ fontSize: 13, color: "#f5e6d0aa", marginBottom: 8 }}>📍 {o.customer.address}, {o.customer.city} - {o.customer.pincode}</div>
                  <div style={{ borderTop: "1px solid #c9860a22", paddingTop: 8 }}>
                    {o.items.map(i => <span key={i.id+i.size} style={{ fontSize: 13, background: "#c9860a22", borderRadius: 6, padding: "2px 8px", marginRight: 6 }}>{i.name} ({i.size}) ×{i.qty}</span>)}
                    <span style={{ float: "right", color: "#e8a020", fontWeight: 600 }}>₹{o.total}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
