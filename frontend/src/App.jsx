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

  // AJUSTE SOLICITADO: Pregunta antes de añadir
  const agregarProducto = async (prod, esBase = false) => {
    if (!window.confirm(`¿Añadir ${prod.nombre} al pedido?`)) return;

    if (prod.nombre.toLowerCase() === "michelada" && !esBase) {
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

  // AJUSTE SOLICITADO: Pregunta antes de eliminar
  const eliminarDetalle = async (detalleId, nombre) => {
    if (!window.confirm(`¿Seguro que quieres eliminar 1 unidad de ${nombre}?`)) return;
    try {
      await axios.put(`${API_URL}/pedidos/${pedidoSeleccionado.id}/eliminar`, { detalleId });
      fetchPedidosActivos();
    } catch (err) {}
  };

  // AJUSTE SOLICITADO: No deja cerrar si está vacío
  const cerrarCuenta = async () => {
    if (pedidoSeleccionado.detallesPedido.length === 0) {
      return alert("La mesa está vacía. No se puede cobrar.");
    }
    if (!window.confirm("¿Confirmar cobro y cierre de mesa?")) return;
    try {
      await axios.put(`${API_URL}/pedidos/${pedidoSeleccionado.id}/cerrar`);
      setVerDetalleTicket(false); setVista("LISTADO"); fetchPedidosActivos();
    } catch (err) { alert(err.response?.data?.error); }
  };

  if (vista === "REPORTE") {
    // AJUSTE SOLICITADO: Selector de últimos 7 días
    const dias = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return d.toLocaleDateString('sv-SE');
    });

    return (
      <div style={styles.container}>
        <button onClick={() => setVista("LISTADO")} style={styles.backBtn}>← Volver</button>
        <h1 style={styles.header}>REPORTES</h1>
        <select value={fechaReporte} onChange={(e) => cargarReporte(e.target.value)} style={styles.selectInput}>
          {dias.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <div style={styles.reportSummary}>
          <div style={styles.reportCard}><small>TOTAL</small><h2>${datosReporte?.totalVendido?.toFixed(2)}</h2></div>
          <div style={styles.reportCard}><small>PEDIDOS</small><h2>{datosReporte?.totalPedidos}</h2></div>
        </div>
        {datosReporte?.pedidos?.map(p => (
          <div key={p.id} style={styles.historyCard}>
            <strong>{p.mesero} - ${p.total.toFixed(2)}</strong>
            {p.detallesPedido.map((det, i) => <div key={i} style={{fontSize:'0.8rem', color:'#ccc'}}>{det.cantidad}x {det.nombrePersonalizado || det.producto.nombre}</div>)}
          </div>
        ))}
      </div>
    );
  }

  if (vista === "LISTADO") {
    return (
      <div style={styles.container}>
        <h1 style={styles.header}>KALI GASTROBAR 🍷</h1>
        <button onClick={async () => {
          const n = prompt("Nombre de la Mesa:");
          if(n) { const res = await axios.post(`${API_URL}/pedidos/nuevo`, { mesero: n }); setPedidoSeleccionado(res.data); setVista("TOMA_PEDIDO"); }
        }} style={styles.btnNuevo}>+ NUEVA MESA</button>
        <button onClick={() => { setVista("REPORTE"); cargarReporte(fechaReporte); }} style={styles.btnReporte}>📊 VER REPORTES</button>
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
          <h3>Cerveza Base</h3>
          {productos.filter(p => p.esCerveza).map(c => <button key={c.id} onClick={() => agregarProducto(c, true)} style={styles.modalBtn}>{c.nombre}</button>)}
          <button onClick={() => setMostrarSelectorCerveza(false)} style={{...styles.modalBtn, background: '#e74c3c', color: 'white'}}>Cancelar</button>
      </div></div>}
      <button onClick={() => setVista("LISTADO")} style={styles.backBtn}>← Mesas</button>
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
      <button style={styles.cartFloat} onClick={() => setVerDetalleTicket(true)}>🛒 TOTAL: ${pedidoSeleccionado?.total.toFixed(2)}</button>
      {verDetalleTicket && (
        <div style={styles.modalOverlay}><div style={{...styles.modalContent, color: '#333', maxHeight: '80vh', overflowY: 'auto'}}>
            <div style={{display:'flex', justifyContent:'space-between'}}><h3>Detalle</h3><button onClick={()=>setVerDetalleTicket(false)}>X</button></div>
            {pedidoSeleccionado.detallesPedido.map((d, i) => (
              <div key={i} style={styles.ticketItem}>
                <div><button onClick={() => eliminarDetalle(d.id, d.nombrePersonalizado || d.producto.nombre)} style={styles.btnMinus}>-</button><span> {d.cantidad}x {d.nombrePersonalizado || d.producto.nombre}</span></div>
                <span>${(d.producto.precio * d.cantidad).toFixed(2)}</span>
              </div>
            ))}
            <h2 style={{borderTop:'2px solid #eee', paddingTop:'10px'}}>Total: ${pedidoSeleccionado.total.toFixed(2)}</h2>
            <button onClick={cerrarCuenta} style={styles.payBtn}>CERRAR Y COBRAR</button>
        </div></div>
      )}
    </div>
  );
};

const styles = {
  container: { background: '#121212', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  header: { textAlign: 'center', color: '#f1c40f' },
  btnNuevo: { width: '100%', padding: '18px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginBottom: '10px' },
  btnReporte: { width: '100%', padding: '12px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '12px', marginBottom: '20px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' },
  pedidoCard: { background: '#1e1e1e', padding: '20px', borderRadius: '15px', border: '1px solid #333', textAlign: 'center' },
  badgeTotal: { background: '#2ecc71', borderRadius: '8px', padding: '5px', marginTop: '10px', fontWeight: 'bold' },
  catBtn: { height: '100px', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold' },
  prodBtn: { background: '#2d2d2d', color: 'white', padding: '15px', border: '1px solid #444', borderRadius: '12px' },
  backBtn: { background: '#333', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', marginBottom: '10px' },
  secondaryBtn: { background: 'none', color: '#f1c40f', border: '1px solid #f1c40f', padding: '8px', borderRadius: '8px', marginBottom: '10px' },
  cartFloat: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', padding: '20px', background: '#f1c40f', borderRadius: '50px', fontWeight: 'bold', fontSize: '1.2rem' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalContent: { background: 'white', padding: '20px', borderRadius: '15px', width: '85%' },
  modalBtn: { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' },
  ticketItem: { display: 'flex', justifyContent: 'space-between', margin: '10px 0' },
  btnMinus: { background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', width: '25px' },
  payBtn: { width: '100%', padding: '15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1.2rem' },
  selectInput: { width: '100%', padding: '12px', borderRadius: '8px', background: '#2d2d2d', color: 'white', border: '1px solid #444', marginBottom: '15px' },
  reportSummary: { display: 'flex', gap: '10px', margin: '10px 0' },
  reportCard: { flex: 1, background: '#1e1e1e', padding: '15px', borderRadius: '10px', textAlign: 'center' },
  historyCard: { background: '#1e1e1e', padding: '15px', borderRadius: '10px', marginBottom: '10px', border: '1px solid #333' }
};

export default App;