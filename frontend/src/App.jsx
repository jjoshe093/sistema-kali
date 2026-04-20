import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "https://sistema-kali-production.up.railway.app/api";

const App = () => {
  const [productos, setProductos] = useState([]);
  const [pedidosActivos, setPedidosActivos] = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [vista, setVista] = useState("LISTADO"); // LISTADO o TOMA_PEDIDO

  // Cargar datos iniciales
  useEffect(() => {
    fetchProductos();
    fetchPedidosActivos();
  }, []);

  const fetchProductos = async () => {
    const res = await axios.get(`${API_URL}/productos`);
    setProductos(res.data);
  };

  const fetchPedidosActivos = async () => {
    const res = await axios.get(`${API_URL}/pedidos/activos`);
    setPedidosActivos(res.data);
  };

  const nuevoPedido = async () => {
    const nombre = prompt("Nombre de la Mesa o Cliente:");
    if (!nombre) return;
    const res = await axios.post(`${API_URL}/pedidos/nuevo`, { mesero: nombre });
    setPedidoSeleccionado(res.data);
    setVista("TOMA_PEDIDO");
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
      // Refrescar datos locales del pedido
      const res = await axios.get(`${API_URL}/pedidos/activos`);
      const actualizado = res.data.find(p => p.id === pedidoSeleccionado.id);
      setPedidoSeleccionado(actualizado);
    } catch (err) { alert("Error al agregar"); }
  };

  const cerrarCuenta = async () => {
    if (!window.confirm("¿Cerrar cuenta y finalizar venta?")) return;
    await axios.put(`${API_URL}/pedidos/${pedidoSeleccionado.id}/cerrar`);
    setVista("LISTADO");
    fetchPedidosActivos();
  };

  if (vista === "LISTADO") {
    return (
      <div style={styles.container}>
        <h1 style={styles.header}>SISTEMA KALI 🍷</h1>
        <button onClick={nuevoPedido} style={styles.btnNuevo}>+ NUEVA MESA / PEDIDO</button>
        <h2 style={{color: '#f1c40f'}}>Pedidos Activos</h2>
        <div style={styles.grid}>
          {pedidosActivos.map(p => (
            <div key={p.id} onClick={() => seleccionarPedido(p)} style={styles.pedidoCard}>
              <h3 style={{margin: 0}}>{p.mesero}</h3>
              <p style={{color: '#2ecc71', fontSize: '1.2rem'}}>${p.total.toFixed(2)}</p>
              <small>ID: {p.id}</small>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <button onClick={() => {setVista("LISTADO"); fetchPedidosActivos();}} style={styles.backBtn}>← VOLVER</button>
        <h2 style={{color: '#f1c40f'}}>{pedidoSeleccionado.mesero}</h2>
      </div>

      <div style={styles.mainGrid}>
        {/* MENÚ */}
        <div style={{flex: 2}}>
           {!categoriaActual ? (
             <div style={styles.grid}>
               {["Bebidas", "Cocteles", "Comida"].map(cat => (
                 <button key={cat} onClick={() => setCategoriaActual(cat)} style={styles.catBtn}>{cat}</button>
               ))}
             </div>
           ) : (
             <div>
               <button onClick={() => setCategoriaActual(null)} style={{color: 'white', marginBottom: '10px'}}>← Cambiar Categoría</button>
               <div style={styles.grid}>
                 {productos.filter(p => p.categoria === categoriaActual).map(p => (
                   <button key={p.id} onClick={() => agregarProducto(p)} style={styles.prodBtn}>
                     {p.nombre}<br/>${p.precio.toFixed(2)}
                   </button>
                 ))}
               </div>
             </div>
           )}
        </div>

        {/* RESUMEN LATERAL */}
        <div style={styles.resumenSide}>
          <h3>Cuenta Actual: ${pedidoSeleccionado.total.toFixed(2)}</h3>
          <button onClick={cerrarCuenta} style={styles.payBtn}>CERRAR Y COBRAR</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { background: '#121212', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  header: { textAlign: 'center', color: '#f1c40f' },
  btnNuevo: { width: '100%', padding: '20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '30px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' },
  pedidoCard: { background: '#222', padding: '20px', borderRadius: '12px', border: '1px solid #333', textAlign: 'center', cursor: 'pointer' },
  catBtn: { height: '100px', background: '#3498db', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 'bold' },
  prodBtn: { background: '#2d2d2d', color: 'white', padding: '15px', border: 'none', borderRadius: '10px' },
  resumenSide: { flex: 1, background: '#fff', color: '#333', padding: '20px', borderRadius: '15px', marginLeft: '20px', height: 'fit-content' },
  payBtn: { width: '100%', padding: '15px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' },
  backBtn: { background: '#444', color: 'white', border: 'none', padding: '10px', borderRadius: '5px' },
  mainGrid: { display: 'flex', marginTop: '20px' }
};

export default App;