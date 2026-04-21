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
      if (pedidoSeleccionado) {
        const actualizado = res.data.find(p => p.id === pedidoSeleccionado.id);
        if (actualizado) setPedidoSeleccionado(actualizado);
      }
    } catch (err) { console.error(err); }
  };

  const agregarProducto = async (prod, esMichelada = false) => {
    // Si el producto clickeado es el botón de "Michelada", abrimos el selector
    if (prod.nombre.toLowerCase().includes("michelada") && !esMichelada) {
      setMostrarSelectorCerveza(true);
      return;
    }

    try {
      await axios.put(`${API_URL}/pedidos/${pedidoSeleccionado.id}/agregar`, {
        productos: [{ id: prod.id, cantidad: 1, esMichelada }]
      });
      setMostrarSelectorCerveza(false);
      fetchPedidosActivos();
    } catch (err) { alert("Error al agregar"); }
  };

  const eliminarProducto = async (prodId, nota) => {
    try {
      await axios.put(`${API_URL}/pedidos/${pedidoSeleccionado.id}/eliminar`, {
        productoId: prodId,
        esMichelada: nota === "MICHELADA"
      });
      fetchPedidosActivos();
    } catch (err) { alert("Error al quitar"); }
  };

  const cerrarCuenta = async () => {
    if (!window.confirm(`¿Cerrar cuenta de ${pedidoSeleccionado.mesero}?`)) return;
    try {
      await axios.put(`${API_URL}/pedidos/${pedidoSeleccionado.id}/cerrar`);
      setVerDetalleTicket(false);
      setVista("LISTADO");
      fetchPedidosActivos();
    } catch (err) { alert("Error al cerrar"); }
  };

  const SelectorCerveza = () => (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h3 style={{marginBottom: '20px'}}>Selecciona la cerveza</h3>
        <div style={{maxHeight: '300px', overflowY: 'auto'}}>
          {productos.filter(p => p.categoria === "Bebidas" && !p.nombre.toLowerCase().includes("michelada")).map(cerveza => (
            <button key={cerveza.id} onClick={() => agregarProducto(cerveza, true)} style={styles.modalBtn}>
              {cerveza.nombre} <span style={{color: '#2ecc71'}}>($ {cerveza.precio.toFixed(2)})</span>
            </button>
          ))}
        </div>
        <button onClick={() => setMostrarSelectorCerveza(false)} style={{...styles.modalBtn, background: '#e74c3c', color: 'white', marginTop: '10px'}}>Cancelar</button>
      </div>
    </div>
  );

  if (vista === "REPORTE") {
    return (
      <div style={styles.container}>
        <button onClick={() => setVista("LISTADO")} style={styles.backBtn}>← Volver</button>
        <h1 style={styles.header}>Cierre Diario</h1>
        <div style={styles.reportSummary}>
          <div>Total: <strong>${datosReporte?.totalVendido.toFixed(2)}</strong></div>
          <div>Órdenes: <strong>{datosReporte?.totalPedidos}</strong></div>
        </div>
        {datosReporte?.pedidos.map(p => (
          <div key={p.id} style={styles.historyCard}>
            <strong>{p.mesero} - ${p.total.toFixed(2)}</strong>
            <div style={{fontSize: '0.85rem', color: '#ccc', marginTop: '5px'}}>
              {p.detallesPedido.map((d, i) => <div key={i}>{d.cantidad}x {d.nota === "MICHELADA" ? "Michelada " : ""}{d.producto.nombre}</div>)}
            </div>
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
          if(n) {
            const res = await axios.post(`${API_URL}/pedidos/nuevo`, { mesero: n });
            setPedidoSeleccionado(res.data);
            setVista("TOMA_PEDIDO");
          }
        }} style={styles.btnNuevo}>+ ABRIR MESA</button>
        <button onClick={async () => {
          const hoy = new Date().toISOString().split('T');
          const res = await axios.get(`${API_URL}/reportes/diario?fecha=${hoy}`);
          setDatosReporte(res.data);
          setVista("REPORTE");
        }} style={styles.btnReporte}>📊 VER VENTAS HOY</button>
        <div style={styles.grid}>
          {pedidosActivos.map(p => (
            <div key={p.id} onClick={() => {setPedidoSeleccionado(p); setVista("TOMA_PEDIDO");}} style={styles.pedidoCard}>
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
      {mostrarSelectorCerveza && <SelectorCerveza />}
      <button onClick={() => setVista("LISTADO")} style={styles.backBtn}>← Inicio</button>
      <h2 style={styles.header}>{pedidoSeleccionado.mesero}</h2>
      
      {!categoriaActual ? (
        <div style={styles.grid}>
          {["Bebidas", "Cocteles", "Comida"].map(c => (
            <button key={c} onClick={() => setCategoriaActual(c)} style={{...styles.catBtn, background: c === 'Comida' ? '#e67e22' : c === 'Cocteles' ? '#9b59b6' : '#3498db'}}>{c}</button>
          ))}
        </div>
      ) : (
        <div style={styles.grid}>
          <button onClick={() => setCategoriaActual(null)} style={{gridColumn: '1/-1', padding: '12px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '10px'}}>← Categorías</button>
          {productos.filter(p => p.categoria === categoriaActual).map(p => (
            <button key={p.id} onClick={() => agregarProducto(p)} style={styles.prodBtn}>
              <strong>{p.nombre}</strong><br/>${p.precio.toFixed(2)}
            </button>
          ))}
        </div>
      )}

      <button style={styles.cartFloat} onClick={() => setVerDetalleTicket(true)}>
        🛒 Cuenta: ${pedidoSeleccionado.total.toFixed(2)}
      </button>

      {verDetalleTicket && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modalContent, color: '#333', maxHeight: '85vh', overflowY: 'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
               <h3>Ticket Actual</h3>
               <button onClick={() => setVerDetalleTicket(false)} style={{border:'none', background:'none', fontSize: '1.5rem'}}>×</button>
            </div>
            <div style={{textAlign: 'left', margin: '15px 0'}}>
              {pedidoSeleccionado.detallesPedido.map((d, i) => (
                <div key={i} style={styles.ticketItem}>
                  <div style={{display:'flex', alignItems: 'center', gap: '10px'}}>
                    <button onClick={() => eliminarProducto(d.productoId, d.nota)} style={styles.btnMinus}>-</button>
                    <span>{d.cantidad}x {d.nota === "MICHELADA" ? "Michelada " : ""}{d.producto.nombre}</span>
                  </div>
                  <span>${(d.producto.precio * d.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{fontWeight: 'bold', fontSize: '1.6rem', borderTop: '2px solid #eee', paddingTop: '15px'}}>
              TOTAL: ${pedidoSeleccionado.total.toFixed(2)}
            </div>
            <button onClick={cerrarCuenta} style={styles.payBtn}>CERRAR Y COBRAR</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { background: '#121212', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  header: { color: '#f1c40f', textAlign: 'center', margin: '20px 0' },
  btnNuevo: { width: '100%', padding: '18px', background: '#27ae60', border: 'none', color: 'white', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '10px' },
  btnReporte: { width: '100%', padding: '12px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '12px', marginBottom: '30px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' },
  pedidoCard: { background: '#1e1e1e', padding: '20px', borderRadius: '15px', textAlign: 'center', border: '1px solid #333' },
  badgeTotal: { background: '#2ecc71', padding: '8px', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px' },
  catBtn: { height: '110px', borderRadius: '15px', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', border: 'none' },
  prodBtn: { background: '#2d2d2d', color: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #444' },
  backBtn: { background: '#444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px' },
  cartFloat: { position: 'fixed', bottom: '20px', width: '90%', left: '5%', padding: '20px', background: '#f1c40f', fontWeight: 'bold', borderRadius: '50px', border: 'none', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalContent: { background: 'white', padding: '25px', borderRadius: '20px', width: '90%', maxWidth: '400px', textAlign: 'center' },
  modalBtn: { width: '100%', padding: '15px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #eee', background: '#f9f9f9', fontWeight: 'bold', textAlign: 'left' },
  ticketItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  btnMinus: { background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', width: '30px', height: '30px', fontWeight: 'bold' },
  payBtn: { width: '100%', padding: '20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.3rem', marginTop: '20px' },
  reportSummary: { display: 'flex', justifyContent: 'space-around', background: '#1e1e1e', padding: '20px', borderRadius: '15px', marginBottom: '25px', fontSize: '1.1rem' },
  historyCard: { background: '#1e1e1e', padding: '15px', borderRadius: '12px', marginBottom: '15px', borderLeft: '5px solid #f1c40f' }
};

export default App;