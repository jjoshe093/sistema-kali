import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "https://sistema-kali-production.up.railway.app/api";

const App = () => {
  const [productos, setProductos] = useState([]);
  const [pedidosActivos, setPedidosActivos] = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [vista, setVista] = useState("LISTADO"); // LISTADO o TOMA_PEDIDO
  const [verDetalleTicket, setVerDetalleTicket] = useState(false);

  useEffect(() => {
    fetchProductos();
    fetchPedidosActivos();
  }, []);

  const fetchProductos = async () => {
    try {
      const res = await axios.get(`${API_URL}/productos`);
      setProductos(res.data);
    } catch (err) { console.error("Error productos", err); }
  };

  const fetchPedidosActivos = async () => {
    try {
      const res = await axios.get(`${API_URL}/pedidos/activos`);
      setPedidosActivos(res.data);
    } catch (err) { console.error("Error pedidos", err); }
  };

  const nuevoPedido = async () => {
    const nombre = prompt("Nombre de la Mesa o Cliente:");
    if (!nombre) return;
    try {
      const res = await axios.post(`${API_URL}/pedidos/nuevo`, { mesero: nombre });
      setPedidoSeleccionado(res.data);
      setVista("TOMA_PEDIDO");
    } catch (err) { alert("Error al crear pedido"); }
  };

  const seleccionarPedido = (pedido) => {
    setPedidoSeleccionado(pedido);
    setVista("TOMA_PEDIDO");
  };

  const agregarProducto = async (prod) => {
    try {
      await axios.put(`${API_URL}/pedidos/${pedidoSeleccionado.id}/agregar`, {
        productos: [{ id: prod.id, cantidad: 1 }]
      });
      // Refrescar solo el pedido actual
      const res = await axios.get(`${API_URL}/pedidos/activos`);
      const actualizado = res.data.find(p => p.id === pedidoSeleccionado.id);
      setPedidoSeleccionado(actualizado);
    } catch (err) { alert("Error al agregar producto"); }
  };

  const cerrarCuenta = async () => {
    if (!window.confirm(`¿Cerrar la cuenta de ${pedidoSeleccionado.mesero}?`)) return;
    try {
      await axios.put(`${API_URL}/pedidos/${pedidoSeleccionado.id}/cerrar`);
      setVerDetalleTicket(false);
      setVista("LISTADO");
      fetchPedidosActivos();
    } catch (err) { alert("Error al cerrar"); }
  };

  // --- VISTA 1: LISTADO DE MESAS ---
  if (vista === "LISTADO") {
    return (
      <div style={styles.container}>
        <h1 style={styles.header}>KALI POS 🍷</h1>
        <button onClick={nuevoPedido} style={styles.btnNuevo}>+ ABRIR NUEVA MESA</button>
        <h2 style={{color: '#f1c40f', borderBottom: '1px solid #333', paddingBottom: '10px'}}>Mesas Activas</h2>
        <div style={styles.grid}>
          {pedidosActivos.map(p => (
            <div key={p.id} onClick={() => seleccionarPedido(p)} style={styles.pedidoCard}>
              <h3 style={{margin: '0 0 10px 0'}}>{p.mesero}</h3>
              <div style={styles.badgeTotal}>${p.total.toFixed(2)}</div>
              <small style={{color: '#888'}}>Orden #{p.id}</small>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- VISTA 2: TOMA DE PEDIDO (DENTRO DE UNA MESA) ---
  return (
    <div style={styles.container}>
      <style>{`
        .ticket-overlay { 
          position: fixed; top: 0; right: 0; bottom: 0; width: 100%; max-width: 450px;
          background: white; color: #333; z-index: 200; display: ${verDetalleTicket ? 'flex' : 'none'};
          flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.5); animation: slideIn 0.3s ease;
        }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>

      <div style={{display: 'flex', alignItems: 'center', marginBottom: '20px'}}>
        <button onClick={() => {setVista("LISTADO"); fetchPedidosActivos();}} style={styles.backBtn}>← Menú Principal</button>
        <h2 style={{margin: '0 0 0 20px', color: '#f1c40f'}}>{pedidoSeleccionado.mesero}</h2>
      </div>

      {!categoriaActual ? (
        <div style={styles.grid}>
          {["Bebidas", "Cocteles", "Comida"].map(cat => (
            <button key={cat} onClick={() => setCategoriaActual(cat)} 
              style={{...styles.catBtn, background: cat === 'Comida' ? '#e67e22' : cat === 'Cocteles' ? '#9b59b6' : '#3498db'}}>
              {cat}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button onClick={() => setCategoriaActual(null)} style={styles.secondaryBtn}>← Volver a Categorías</button>
          <div style={styles.grid}>
            {productos.filter(p => p.categoria === categoriaActual).map(p => (
              <button key={p.id} onClick={() => agregarProducto(p)} style={styles.prodBtn}>
                <div style={{fontWeight: 'bold'}}>{p.nombre}</div>
                <div style={{color: '#2ecc71'}}>${p.precio.toFixed(2)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE DE CARRITO */}
      <button style={styles.cartFloat} onClick={() => setVerDetalleTicket(true)}>
        🛒 Ver Cuenta (${pedidoSeleccionado.total.toFixed(2)})
      </button>

      {/* TICKET DETALLE (MODAL LATERAL) */}
      <div className="ticket-overlay">
        <div style={styles.ticketHeader}>
          <h3 style={{margin: 0}}>Mesa: {pedidoSeleccionado.mesero}</h3>
          <button onClick={() => setVerDetalleTicket(false)} style={styles.closeBtn}>×</button>
        </div>
        
        <div style={{flex: 1, padding: '20px', overflowY: 'auto'}}>
          {pedidoSeleccionado.detallesPedido?.length === 0 ? <p>La mesa está vacía.</p> : 
            pedidoSeleccionado.detallesPedido.map((det, index) => (
              <div key={index} style={styles.ticketItem}>
                <span>{det.cantidad}x {det.producto.nombre}</span>
                <span>${(det.producto.precio * det.cantidad).toFixed(2)}</span>
              </div>
            ))
          }
        </div>

        <div style={styles.ticketFooter}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '20px'}}>
            <span>TOTAL:</span>
            <span>${pedidoSeleccionado.total.toFixed(2)}</span>
          </div>
          <button onClick={cerrarCuenta} style={styles.payBtn}>CERRAR Y COBRAR CUENTA</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { background: '#121212', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', paddingBottom: '100px' },
  header: { textAlign: 'center', color: '#f1c40f', fontSize: '2.2rem' },
  btnNuevo: { width: '100%', padding: '20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '30px', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' },
  pedidoCard: { background: '#1e1e1e', padding: '20px', borderRadius: '15px', border: '1px solid #333', textAlign: 'center', cursor: 'pointer', position: 'relative' },
  badgeTotal: { background: '#2ecc71', color: '#fff', borderRadius: '8px', padding: '5px', fontWeight: 'bold', marginBottom: '5px' },
  catBtn: { height: '120px', color: 'white', border: 'none', borderRadius: '15px', fontSize: '1.3rem', fontWeight: 'bold', cursor: 'pointer' },
  prodBtn: { background: '#2d2d2d', color: 'white', padding: '20px', border: '1px solid #444', borderRadius: '12px', cursor: 'pointer', textAlign: 'center' },
  backBtn: { background: '#444', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' },
  secondaryBtn: { background: 'none', color: '#f1c40f', border: '1px solid #f1c40f', padding: '10px', borderRadius: '8px', marginBottom: '20px', cursor: 'pointer' },
  cartFloat: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', padding: '18px', background: '#f1c40f', color: '#000', border: 'none', borderRadius: '50px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 20px rgba(0,0,0,0.5)', zIndex: 100 },
  ticketHeader: { padding: '25px', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd' },
  closeBtn: { fontSize: '2rem', border: 'none', background: 'none', cursor: 'pointer' },
  ticketItem: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' },
  ticketFooter: { padding: '25px', background: '#fff', borderTop: '2px solid #333' },
  payBtn: { width: '100%', padding: '20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.3rem', fontWeight: 'bold', cursor: 'pointer' }
};

export default App;