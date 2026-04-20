import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "https://sistema-kali-production.up.railway.app/api";

const App = () => {
  const [productos, setProductos] = useState([]);
  const [pedido, setPedido] = useState([]);
  const [mesero, setMesero] = useState("");
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [verTicketMovil, setVerTicketMovil] = useState(false); // Para alternar vistas en móvil

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const res = await axios.get(`${API_URL}/productos`);
        setProductos(res.data);
      } catch (err) { console.error(err); }
    };
    fetchProductos();
  }, []);

  const productosFiltrados = productos.filter(p => p.categoria === categoriaActual);
  const totalProductos = pedido.reduce((acc, item) => acc + item.cantidad, 0);
  const totalPrecio = pedido.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const agregarAlPedido = (prod) => {
    const existe = pedido.find(item => item.id === prod.id);
    if (existe) {
      setPedido(pedido.map(item => item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setPedido([...pedido, { ...prod, cantidad: 1 }]);
    }
  };

  const eliminarUno = (id) => {
    const item = pedido.find(p => p.id === id);
    if (item.cantidad > 1) {
      setPedido(pedido.map(p => p.id === id ? { ...p, cantidad: p.cantidad - 1 } : p));
    } else {
      setPedido(pedido.filter(p => p.id !== id));
    }
  };

  const finalizarPedido = async () => {
    if (!mesero || pedido.length === 0) return alert("Falta mesa o productos");
    try {
      await axios.post(`${API_URL}/ventas`, {
        mesero,
        productos: pedido.map(p => ({ id: p.id, cantidad: p.cantidad }))
      });
      alert("¡Venta exitosa!");
      setPedido([]);
      setMesero("");
      setVerTicketMovil(false);
    } catch (err) { alert("Error al cobrar"); }
  };

  return (
    <div className="app-container">
      <style>{`
        .app-container { display: flex; height: 100vh; background: #1a1a1a; color: white; font-family: sans-serif; overflow: hidden; }
        .menu-section { flex: 2; padding: 20px; overflow-y: auto; display: ${verTicketMovil ? 'none' : 'block'}; }
        .order-section { flex: 1; background: white; color: #333; padding: 20px; display: flex; flexDirection: column; }
        
        .grid-cats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; }
        .cat-card { height: 120px; border: none; border-radius: 15px; color: white; font-weight: bold; font-size: 1.2rem; cursor: pointer; }
        
        .grid-prods { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
        .prod-card { background: #2d2d2d; padding: 15px; border-radius: 10px; border: none; color: white; cursor: pointer; text-align: center; }
        
        .ticket-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; align-items: center; }
        .btn-pay { width: 100%; padding: 15px; background: #27ae60; color: white; border: none; border-radius: 10px; font-weight: bold; font-size: 1.2rem; margin-top: 10px; }
        
        .floating-cart { display: none; position: fixed; bottom: 20px; right: 20px; background: #f1c40f; color: #000; padding: 15px 25px; border-radius: 30px; font-weight: bold; border: none; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }

        @media (max-width: 768px) {
          .order-section { display: ${verTicketMovil ? 'flex' : 'none'}; position: fixed; inset: 0; z-index: 10; }
          .floating-cart { display: ${verTicketMovil ? 'none' : 'block'}; }
          .menu-section { flex: 1; width: 100%; }
        }
      `}</style>

      {/* SECCIÓN MENÚ */}
      <div className="menu-section">
        <h2 style={{textAlign: 'center', color: '#f1c40f'}}>KALI POS 🍷</h2>
        
        {!categoriaActual ? (
          <div className="grid-cats">
            {["Bebidas", "Cocteles", "Comida"].map(cat => (
              <button 
                key={cat} 
                className="cat-card"
                style={{background: cat === 'Comida' ? '#e67e22' : cat === 'Cocteles' ? '#9b59b6' : '#3498db'}}
                onClick={() => setCategoriaActual(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => setCategoriaActual(null)} style={{marginBottom: '15px', padding: '8px'}}>← VOLVER</button>
            <div className="grid-prods">
              {productosFiltrados.map(p => (
                <button key={p.id} className="prod-card" onClick={() => agregarAlPedido(p)}>
                  <strong>{p.nombre}</strong><br/>${p.precio.toFixed(2)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN TICKET (DERECHA O PANTALLA COMPLETA EN MÓVIL) */}
      <div className="order-section">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
           <h3>Detalle del Pedido</h3>
           <button onClick={() => setVerTicketMovil(false)} style={{display: window.innerWidth < 768 ? 'block' : 'none'}}>Cerrar X</button>
        </div>
        
        <input 
          placeholder="Mesa / Mesero" 
          value={mesero} 
          onChange={(e) => setMesero(e.target.value)}
          style={{padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc'}}
        />

        <div style={{flex: 1, overflowY: 'auto'}}>
          {pedido.map(item => (
            <div key={item.id} className="ticket-item">
              <div>
                <button onClick={() => eliminarUno(item.id)} style={{background: '#ff7675', border: 'none', color: 'white', borderRadius: '5px', marginRight: '10px', width: '25px'}}>-</button>
                {item.cantidad} x {item.nombre}
              </div>
              <span>${(item.precio * item.cantidad).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div style={{fontSize: '1.5rem', fontWeight: 'bold', padding: '15px 0', borderTop: '2px solid #333', display: 'flex', justifyContent: 'space-between'}}>
          <span>TOTAL:</span> <span>${totalPrecio.toFixed(2)}</span>
        </div>
        
        <button className="btn-pay" onClick={finalizarPedido}>FINALIZAR VENTA</button>
      </div>

      {/* BOTÓN FLOTANTE PARA MÓVIL */}
      <button className="floating-cart" onClick={() => setVerTicketMovil(true)}>
         🛒 Ver Pedido ({totalProductos})
      </button>
    </div>
  );
};

export default App;