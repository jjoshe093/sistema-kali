import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "https://sistema-kali-production.up.railway.app/api";

const App = () => {
  const [productos, setProductos] = useState([]);
  const [pedido, setPedido] = useState([]);
  const [mesero, setMesero] = useState("");
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [verTicket, setVerTicket] = useState(false);

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
  const totalItems = pedido.reduce((acc, item) => acc + item.cantidad, 0);
  const montoTotal = pedido.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

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
      alert("¡Venta guardada con éxito!");
      setPedido([]);
      setMesero("");
      setVerTicket(false);
    } catch (err) { alert("Error al conectar con el servidor"); }
  };

  return (
    <div className="main-wrapper">
      <style>{`
        .main-wrapper { background: #121212; color: white; min-height: 100vh; font-family: 'Segoe UI', sans-serif; }
        
        /* Contenedor del Menú */
        .menu-container { padding: 20px; max-width: 800px; margin: 0 auto; padding-bottom: 100px; }
        .header { text-align: center; color: #f1c40f; margin-bottom: 30px; }
        
        /* Grid de Categorías y Productos */
        .grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; }
        .btn-cat { height: 100px; border: none; border-radius: 12px; color: white; font-weight: bold; font-size: 1.1rem; cursor: pointer; transition: 0.2s; }
        .btn-prod { background: #222; border: 1px solid #333; padding: 15px; border-radius: 12px; color: white; cursor: pointer; }
        .btn-prod:active { background: #333; }

        /* Ticket / Carrito (Sección que se arruinó) */
        .ticket-overlay { 
          position: fixed; top: 0; right: 0; bottom: 0; width: 100%; max-width: 400px;
          background: white; color: #333; z-index: 100; display: ${verTicket ? 'flex' : 'none'};
          flex-direction: column; box-shadow: -5px 0 15px rgba(0,0,0,0.5);
        }
        
        .ticket-header { padding: 20px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .ticket-body { flex: 1; overflow-y: auto; padding: 20px; }
        .ticket-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; }
        
        .btn-remove { background: #ff7675; color: white; border: none; width: 28px; height: 28px; border-radius: 5px; cursor: pointer; margin-right: 10px; }
        
        .ticket-footer { padding: 20px; border-top: 2px solid #333; background: white; }
        .input-mesero { width: 100%; padding: 12px; box-sizing: border-box; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
        
        /* Botón Flotante */
        .cart-float { 
          position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
          background: #27ae60; color: white; padding: 15px 40px; border-radius: 50px;
          border: none; font-weight: bold; font-size: 1.1rem; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.4);
          z-index: 50; width: 90%; max-width: 300px;
        }

        @media (min-width: 1024px) {
          .main-wrapper { display: flex; }
          .menu-container { flex: 2; margin: 0; }
          .ticket-overlay { position: relative; display: flex; width: 400px; max-width: none; }
          .cart-float { display: none; }
          .btn-close { display: none; }
        }
      `}</style>

      {/* IZQUIERDA: MENÚ */}
      <div className="menu-container">
        <h1 className="header">KALI POS 🍷</h1>
        
        {!categoriaActual ? (
          <div className="grid-layout">
            <button className="btn-cat" style={{background: '#3498db'}} onClick={() => setCategoriaActual('Bebidas')}>🥤 Bebidas</button>
            <button className="btn-cat" style={{background: '#9b59b6'}} onClick={() => setCategoriaActual('Cocteles')}>🍸 Cocteles</button>
            <button className="btn-cat" style={{background: '#e67e22'}} onClick={() => setCategoriaActual('Comida')}>🍔 Comida</button>
          </div>
        ) : (
          <div>
            <button onClick={() => setCategoriaActual(null)} style={{color: 'white', background: 'none', border: '1px solid white', padding: '10px', borderRadius: '8px', marginBottom: '20px', cursor: 'pointer'}}>
              ← Volver
            </button>
            <h2 style={{color: '#f1c40f'}}>{categoriaActual}</h2>
            <div className="grid-layout">
              {productosFiltrados.map(p => (
                <button key={p.id} className="btn-prod" onClick={() => agregarAlPedido(p)}>
                  <strong>{p.nombre}</strong><br/>
                  <span style={{color: '#2ecc71'}}>${p.precio.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DERECHA: TICKET (El detalle que corregimos) */}
      <div className="ticket-overlay">
        <div className="ticket-header">
          <h3 style={{margin: 0}}>Detalle del Pedido</h3>
          <button className="btn-close" onClick={() => setVerTicket(false)} style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'}}>×</button>
        </div>

        <div className="ticket-body">
          <input 
            className="input-mesero"
            placeholder="Nombre Mesa / Mesero"
            value={mesero}
            onChange={(e) => setMesero(e.target.value)}
          />
          
          {pedido.length === 0 ? <p style={{textAlign: 'center', color: '#999'}}>No hay productos aún</p> : null}
          
          {pedido.map(item => (
            <div key={item.id} className="ticket-item">
              <div style={{display: 'flex', alignItems: 'center'}}>
                <button className="btn-remove" onClick={() => eliminarUno(item.id)}>-</button>
                <span><strong>{item.cantidad}</strong> {item.nombre}</span>
              </div>
              <span>${(item.precio * item.cantidad).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="ticket-footer">
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px'}}>
            <span>TOTAL:</span>
            <span>${montoTotal.toFixed(2)}</span>
          </div>
          <button className="btn-pay" onClick={finalizarPedido} style={{width: '100%', padding: '15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer'}}>
            FINALIZAR VENTA
          </button>
        </div>
      </div>

      {/* BOTÓN FLOTANTE (Solo móvil) */}
      <button className="cart-float" onClick={() => setVerTicket(true)}>
        🛒 Ver Pedido ({totalItems}) - ${montoTotal.toFixed(2)}
      </button>
    </div>
  );
};

export default App;