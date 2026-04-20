import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "https://sistema-kali-production.up.railway.app/api";

const App = () => {
  const [productos, setProductos] = useState([]);
  const [pedidosActivos, setPedidosActivos] = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [vista, setVista] = useState("LISTADO"); // LISTADO, TOMA_PEDIDO, REPORTE
  const [verDetalleTicket, setVerDetalleTicket] = useState(false);
  const [datosReporte, setDatosReporte] = useState(null);

  useEffect(() => {
    fetchProductos();
    fetchPedidosActivos();
  }, []);

  const fetchProductos = async () => {
    try {
      const res = await axios.get(`${API_URL}/productos`);
      setProductos(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchPedidosActivos = async () => {
    try {
      const res = await axios.get(`${API_URL}/pedidos/activos`);
      setPedidosActivos(res.data);
    } catch (err) { console.error(err); }
  };

  const nuevoPedido = async () => {
    const nombre = prompt("Nombre de la Mesa o Cliente:");
    if (!nombre) return;
    try {
      const res = await axios.post(`${API_URL}/pedidos/nuevo`, { mesero: nombre });
      setPedidoSeleccionado(res.data);
      setVista("TOMA_PEDIDO");
    } catch (err) { alert("Error al crear mesa"); }
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
      refrescarPedidoActual();
    } catch (err) { alert("Error al agregar"); }
  };

  const eliminarProducto = async (prodId) => {
    try {
      await axios.put(`${API_URL}/pedidos/${pedidoSeleccionado.id}/eliminar`, {
        productoId: prodId
      });
      refrescarPedidoActual();
    } catch (err) { alert("Error al quitar producto"); }
  };

  const refrescarPedidoActual = async () => {
    const res = await axios.get(`${API_URL}/pedidos/activos`);
    const actualizado = res.data.find(p => p.id === pedidoSeleccionado.id);
    if (actualizado) setPedidoSeleccionado(actualizado);
  };

  const cerrarCuenta = async () => {
    if (!window.confirm(`¿Cerrar cuenta de ${pedidoSeleccionado.mesero}? Se descontará del stock.`)) return;
    try {
      await axios.put(`${API_URL}/pedidos/${pedidoSeleccionado.id}/cerrar`);
      setVerDetalleTicket(false);
      setVista("LISTADO");
      fetchPedidosActivos();
    } catch (err) { alert("Error al cerrar cuenta"); }
  };

  const consultarReporte = async () => {
    try {
      const hoy = new Date().toISOString().split('T');
      const res = await axios.get(`${API_URL}/reportes/diario?fecha=${hoy}`);
      setDatosReporte(res.data);
      setVista("REPORTE");
    } catch (err) { alert("Error al cargar reporte. Asegúrate de haber actualizado el Backend."); }
  };

  // --- RENDERIZADO DE VISTAS ---

  if (vista === "REPORTE") {
    return (
      <div style={styles.container}>
        <button onClick={() => setVista("LISTADO")} style={styles.backBtn}>← Volver</button>
        <h1 style={styles.header}>REPORTE DIARIO</h1>
        <div style={styles.reportHeader}>
          <div style={styles.reportCard}><h3>Ventas: ${datosReporte?.totalVendido.toFixed(2)}</h3></div>
          <div style={styles.reportCard}><h3>Órdenes: {datosReporte?.totalPedidos}</h3></div>
        </div>
        <div style={{marginTop: '20px'}}>
          {datosReporte?.pedidos.map(p => (
            <div key={p.id} style={styles.reportItem}>
              <span>Mesa: {p.mesero}</span>
              <strong>${p.total.toFixed(2)}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (vista === "LISTADO") {
    return (
      <div style={styles.container}>
        <h1 style={styles.header}>KALI GASTROBAR 🍷</h1>
        <button onClick={nuevoPedido} style={styles.btnNuevo}>+ ABRIR NUEVA MESA</button>
        <button onClick={consultarReporte} style={styles.btnReporte}>📊 VER CIERRE DE CAJA</button>
        
        <h2 style={{color: '#f1c40f', marginTop: '30px'}}>Mesas Activas</h2>
        <div style={styles.grid}>
          {pedidosActivos.length === 0 && <p>No hay mesas abiertas.</p>}
          {pedidosActivos.map(p => (
            <div key={p.id} onClick={() => seleccionarPedido(p)} style={styles.pedidoCard}>
              <h3>{p.mesero}</h3>
              <div style={styles.badgeTotal}>${p.total.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
        <button onClick={() => {setVista("LISTADO"); fetchPedidosActivos();}} style={styles.backBtn}>← Inicio</button>
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
          <button onClick={() => setCategoriaActual(null)} style={styles.secondaryBtn}>← Categorías</button>
          <div style={styles.grid}>
            {productos.filter(p => p.categoria === categoriaActual).map(p => (
              <button key={p.id} onClick={() => agregarProducto(p)} style={styles.prodBtn}>
                <strong>{p.nombre}</strong><br/>
                <span style={{color: '#2ecc71'}}>${p.precio.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button style={styles.cartFloat} onClick={() => setVerDetalleTicket(true)}>
        🛒 Cuenta: ${pedidoSeleccionado.total.toFixed(2)}
      </button>

      <div className="ticket-overlay">
        <div style={styles.ticketHeader}>
          <h3 style={{margin: 0}}>Detalle Mesa</h3>
          <button onClick={() => setVerDetalleTicket(false)} style={styles.closeBtn}>×</button>
        </div>
        <div style={{flex: 1, padding: '20px', overflowY: 'auto'}}>
          {pedidoSeleccionado.detallesPedido?.map((det, index) => (
            <div key={index} style={styles.ticketItem}>
              <div style={{display: 'flex', alignItems: 'center'}}>
                <button onClick={() => eliminarProducto(det.producto.id)} style={styles.btnMinus}>-</button>
                <span>{det.cantidad}x {det.producto.nombre}</span>
              </div>
              <span>${(det.producto.precio * det.cantidad).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div style={styles.ticketFooter}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '20px'}}>
            <span>TOTAL:</span>
            <span>${pedidoSeleccionado.total.toFixed(2)}</span>
          </div>
          <button onClick={cerrarCuenta} style={styles.payBtn}>CERRAR Y COBRAR</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { background: '#121212', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', paddingBottom: '100px' },
  header: { textAlign: 'center', color: '#f1c40f', fontSize: '2rem' },
  btnNuevo: { width: '100%', padding: '18px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '10px', cursor: 'pointer' },
  btnReporte: { width: '100%', padding: '12px', background: '#444', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' },
  pedidoCard: { background: '#1e1e1e', padding: '20px', borderRadius: '15px', border: '1px solid #333', textAlign: 'center' },
  badgeTotal: { background: '#2ecc71', color: '#fff', borderRadius: '8px', padding: '5px', fontWeight: 'bold' },
  catBtn: { height: '110px', color: 'white', border: 'none', borderRadius: '15px', fontSize: '1.2rem', fontWeight: 'bold' },
  prodBtn: { background: '#2d2d2d', color: 'white', padding: '15px', border: '1px solid #444', borderRadius: '12px' },
  backBtn: { background: '#333', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px' },
  secondaryBtn: { background: 'none', color: '#f1c40f', border: '1px solid #f1c40f', padding: '10px', borderRadius: '8px', marginBottom: '15px' },
  cartFloat: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', padding: '18px', background: '#f1c40f', color: '#000', border: 'none', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', zIndex: 100 },
  ticketHeader: { padding: '20px', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd' },
  closeBtn: { fontSize: '1.8rem', border: 'none', background: 'none' },
  ticketItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee', alignItems: 'center' },
  btnMinus: { background: '#ff7675', color: 'white', border: 'none', borderRadius: '5px', width: '28px', height: '28px', marginRight: '10px' },
  ticketFooter: { padding: '20px', background: '#fff', borderTop: '2px solid #333' },
  payBtn: { width: '100%', padding: '18px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold' },
  reportHeader: { display: 'flex', gap: '15px', marginTop: '20px' },
  reportCard: { flex: 1, background: '#222', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid #333' },
  reportItem: { display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #333' }
};

export default App;