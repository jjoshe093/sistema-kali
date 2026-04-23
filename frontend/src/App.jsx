import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "https://sistema-kali-production.up.railway.app/api";

const App = () => {
  const [productos, setProductos] = useState([]);
  const [pedidosActivos, setPedidosActivos] = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [vista, setVista] = useState("LISTADO"); 
  const [verDetalleTicket, setVerDetalleTicket] = useState(false);
  const [datosReporte, setDatosReporte] = useState(null);
  const [mostrarSelectorCerveza, setMostrarSelectorCerveza] = useState(false);
  const [micheladaTemporal, setMicheladaTemporal] = useState(null);
  const [fechaReporte, setFechaReporte] = useState(new Date().toLocaleDateString('sv-SE'));

  useEffect(() => { fetchProductos(); fetchPedidosActivos(); }, []);

  const fetchProductos = async () => {
    try { const res = await axios.get(`${API_URL}/productos`); setProductos(res.data); } catch (err) {}
  };

  const fetchPedidosActivos = async () => {
    try {
      const res = await axios.get(`${API_URL}/pedidos/activos`);
      setPedidosActivos(res.data);
      if (pedidoSeleccionado) setPedidoSeleccionado(res.data.find(p => p.id === pedidoSeleccionado.id) || null);
    } catch (err) {}
  };

  const cargarReporte = async (fecha) => {
    try {
      setFechaReporte(fecha);
      const res = await axios.get(`${API_URL}/reportes/diario?fecha=${fecha}`);
      setDatosReporte(res.data);
    } catch (err) {}
  };

  const agregarProducto = async (prod, esBase = false) => {
    if (!window.confirm(`¿Seguro que deseas agregar ${prod.nombre}?`)) return;

    if (prod.nombre.toLowerCase() === "michelada clásica" || prod.nombre.toLowerCase() === "michelada tamarindo"
|| prod.nombre.toLowerCase() === "michelada piña" && !esBase) {
      setMicheladaTemporal(prod); setMostrarSelectorCerveza(true); return;
    }
    try {
      const payload = esBase 
        ? { productoId: micheladaTemporal.id, productoBaseId: prod.id, nombreMostrar: `Michelada con ${prod.nombre}`, cantidad: 1 }
        : { productoId: prod.id, cantidad: 1 };
      await axios.put(`${API_URL}/pedidos/${pedidoSeleccionado.id}/agregar`, payload);
      setMostrarSelectorCerveza(false); fetchPedidosActivos();
    } catch (err) { alert("Error al agregar"); }
  };

  const eliminarDetalle = async (detalleId, nombre) => {
    if (!window.confirm(`¿Seguro que deseas eliminar una unidad de ${nombre}?`)) return;
    try {
      await axios.put(`${API_URL}/pedidos/${pedidoSeleccionado.id}/eliminar`, { detalleId });
      fetchPedidosActivos();
    } catch (err) {}
  };

  const cerrarCuenta = async () => {
    if (pedidoSeleccionado.detallesPedido.length === 0) {
      alert("No puedes cerrar una mesa vacía. Agrega productos o elimina la mesa.");
      return;
    }
    if (!window.confirm(`¿Confirmar cierre de cuenta para ${pedidoSeleccionado.mesero}?`)) return;
    try {
      await axios.put(`${API_URL}/pedidos/${pedidoSeleccionado.id}/cerrar`);
      setVerDetalleTicket(false); setVista("LISTADO"); fetchPedidosActivos();
    } catch (err) { alert(err.response?.data?.error); }
  };

  if (vista === "REPORTE") {
    const ultimos7Dias = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return d.toLocaleDateString('sv-SE');
    });

    return (
      <div style={styles.container}>
        <button onClick={() => { setVista("LISTADO"); fetchPedidosActivos(); }} style={styles.backBtn}>← Volver</button>
        <h1 style={styles.header}>KALI GASTROBAR</h1>
        
        <div style={{marginBottom: '20px'}}>
          <label style={{color: '#f1c40f', display: 'block', marginBottom: '10px'}}>Seleccionar Fecha:</label>
          <select value={fechaReporte} onChange={(e) => cargarReporte(e.target.value)} style={styles.selectInput}>
            {ultimos7Dias.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div style={styles.reportSummary}>
          <div style={{...styles.reportCard, borderLeft: '5px solid #2ecc71'}}><span style={styles.cardLabel}>TOTAL VENDIDO</span><h2 style={styles.cardValue}>${datosReporte?.totalVendido?.toFixed(2) || "0.00"}</h2></div>
          <div style={{...styles.reportCard, borderLeft: '5px solid #3498db'}}><span style={styles.cardLabel}>ORDENES</span><h2 style={styles.cardValue}>{datosReporte?.totalPedidos || 0}</h2></div>
        </div>
        <div style={styles.historyList}>
          {datosReporte?.pedidos?.map(p => (
            <div key={p.id} style={styles.historyCard}>
              <div style={styles.historyCardHeader}><strong>{p.mesero}</strong><span style={styles.historyTotal}>${p.total.toFixed(2)}</span></div>
              <div style={styles.historyDetails}>
                {p.detallesPedido.map((det, i) => <div key={i} style={styles.historyItem}><span>{det.cantidad}x {det.nombrePersonalizado || det.producto.nombre}</span><span>${(det.producto.precio * det.cantidad).toFixed(2)}</span></div>)}
              </div>
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
        <button onClick={async () => {
          const n = prompt("Nombre de la Mesa o Cliente:");
          if(n) { 
            const res = await axios.post(`${API_URL}/pedidos/nuevo`, { mesero: n }); 
            setPedidoSeleccionado(res.data); 
            setVista("TOMA_PEDIDO"); 
          }
        }} style={styles.btnNuevo}>+ ABRIR NUEVA MESA</button>
        <button onClick={() => { setVista("REPORTE"); cargarReporte(fechaReporte); }} style={styles.btnReporte}>📊 VER REPORTE DE VENTAS</button>
        <h2 style={{color: '#f1c40f', marginTop: '30px'}}>Mesas Activas</h2>
        <div style={styles.grid}>
          {pedidosActivos.map(p => (
            <div key={p.id} onClick={() => {setPedidoSeleccionado(p); setVista("TOMA_PEDIDO");}} style={styles.pedidoCard}>
              <h3>{p.mesero}</h3><div style={styles.badgeTotal}>${p.total.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {mostrarSelectorCerveza && <div style={styles.modalOverlay}><div style={styles.modalContent}>
          <h3 style={{color: '#333'}}>Selecciona la cerveza base</h3>
          <div style={{maxHeight: '300px', overflowY: 'auto'}}>
            {productos.filter(p => p.esCerveza).map(c => <button key={c.id} onClick={() => agregarProducto(c, true)} style={styles.modalBtn}>{c.nombre}</button>)}
          </div>
          <button onClick={() => setMostrarSelectorCerveza(false)} style={{...styles.modalBtn, background: '#e74c3c', color: 'white', marginTop: '10px', textAlign: 'center'}}>Cancelar</button>
      </div></div>}
      <button onClick={() => { setVista("LISTADO"); fetchPedidosActivos(); }} style={styles.backBtn}>← Volver</button>
      <h2 style={{color: '#f1c40f', textAlign:'center'}}>{pedidoSeleccionado?.mesero}</h2>
      {!categoriaActual ? (
        <div style={styles.grid}>
          {["Bebidas", "Cocteles", "Comida"].map(cat => <button key={cat} onClick={() => setCategoriaActual(cat)} style={{...styles.catBtn, background: cat === 'Comida' ? '#e67e22' : cat === 'Cocteles' ? '#9b59b6' : '#3498db'}}>{cat}</button>)}
        </div>
      ) : (
        <div>
          <button onClick={() => setCategoriaActual(null)} style={styles.secondaryBtn}>← Categorías</button>
          <div style={styles.grid}>
            {productos.filter(p => p.categoria === categoriaActual).map(p => <button key={p.id} onClick={() => agregarProducto(p)} style={styles.prodBtn}><strong>{p.nombre}</strong><br/>${p.precio.toFixed(2)}</button>)}
          </div>
        </div>
      )}
      <button style={styles.cartFloat} onClick={() => setVerDetalleTicket(true)}>🛒 Cuenta: ${pedidoSeleccionado?.total.toFixed(2)}</button>
      {verDetalleTicket && (
        <div style={styles.modalOverlay}><div style={{...styles.modalContent, color: '#333', maxHeight: '85vh', overflowY: 'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><h3>Detalle Mesa</h3><button onClick={() => setVerDetalleTicket(false)} style={{border:'none', background:'none', fontSize: '1.5rem'}}>×</button></div>
            {pedidoSeleccionado.detallesPedido.map((d, i) => (
              <div key={i} style={styles.ticketItem}>
                <div style={{display:'flex', alignItems: 'center', gap: '10px'}}><button onClick={() => eliminarDetalle(d.id, d.nombrePersonalizado || d.producto.nombre)} style={styles.btnMinus}>-</button><span>{d.cantidad}x {d.nombrePersonalizado || d.producto.nombre}</span></div>
                <span>${(d.producto.precio * d.cantidad).toFixed(2)}</span>
              </div>
            ))}
            <div style={{fontWeight: 'bold', fontSize: '1.8rem', borderTop: '2px solid #eee', paddingTop: '15px'}}>TOTAL: ${pedidoSeleccionado.total.toFixed(2)}</div>
            <button onClick={cerrarCuenta} style={styles.payBtn}>CERRAR Y COBRAR</button>
        </div></div>
      )}
    </div>
  );
};

const styles = {
  container: { background: '#121212', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', paddingBottom: '100px' },
  header: { textAlign: 'center', color: '#f1c40f', fontSize: '2.2rem', marginBottom: '25px' },
  btnNuevo: { width: '100%', padding: '18px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '12px' },
  btnReporte: { width: '100%', padding: '12px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '12px', fontWeight: 'bold' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' },
  pedidoCard: { background: '#1e1e1e', padding: '20px', borderRadius: '15px', border: '1px solid #333', textAlign: 'center' },
  badgeTotal: { background: '#2ecc71', color: '#fff', borderRadius: '8px', padding: '6px', fontWeight: 'bold', fontSize: '1.1rem' },
  catBtn: { height: '110px', color: 'white', border: 'none', borderRadius: '15px', fontSize: '1.3rem', fontWeight: 'bold' },
  prodBtn: { background: '#2d2d2d', color: 'white', padding: '15px', border: '1px solid #444', borderRadius: '12px' },
  backBtn: { background: '#333', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', marginBottom: '10px' },
  secondaryBtn: { background: 'none', color: '#f1c40f', border: '1px solid #f1c40f', padding: '10px', borderRadius: '8px', marginBottom: '15px' },
  cartFloat: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: '400px', padding: '20px', background: '#f1c40f', color: '#000', border: 'none', borderRadius: '50px', fontSize: '1.2rem', fontWeight: 'bold', zIndex: 100, boxShadow: '0 8px 25px rgba(0,0,0,0.5)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalContent: { background: 'white', padding: '25px', borderRadius: '20px', width: '90%', maxWidth: '400px', textAlign: 'center' },
  modalBtn: { width: '100%', padding: '15px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #eee', background: '#f9f9f9', fontWeight: 'bold', textAlign: 'left', color: '#333' },
  ticketItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  btnMinus: { background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', width: '30px', height: '30px', fontWeight: 'bold' },
  payBtn: { width: '100%', padding: '20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.4rem', marginTop: '20px' },
  selectInput: { width: '100%', padding: '12px', borderRadius: '10px', background: '#222', color: 'white', border: '1px solid #444' },
  reportSummary: { display: 'flex', gap: '15px', marginTop: '20px' },
  reportCard: { flex: 1, background: '#1e1e1e', padding: '20px', borderRadius: '12px' },
  cardLabel: { fontSize: '0.8rem', color: '#aaa', fontWeight: 'bold' },
  cardValue: { margin: '5px 0 0 0', color: '#fff' },
  historyList: { marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' },
  historyCard: { background: '#1e1e1e', padding: '20px', borderRadius: '12px', border: '1px solid #333' },
  historyCardHeader: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px', fontSize: '1.2rem' },
  historyTotal: { color: '#2ecc71', fontWeight: 'bold' },
  historyDetails: { fontSize: '0.9rem', color: '#ccc' },
  historyItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }
};

export default App;