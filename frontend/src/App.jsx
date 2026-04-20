import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Cambia esto por tu URL real de Railway
const API_URL = "https://sistema-kali-production.up.railway.app/api";

const App = () => {
  const [productos, setProductos] = useState([]);
  const [pedido, setPedido] = useState([]);
  const [mesero, setMesero] = useState("");

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const res = await axios.get(`${API_URL}/productos`);
        setProductos(res.data);
      } catch (err) {
        console.error("Error cargando productos", err);
      }
    };
    fetchProductos();
  }, []);

  const agregarAlPedido = (prod) => {
    const existe = pedido.find(item => item.id === prod.id);
    if (existe) {
      setPedido(pedido.map(item => 
        item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      setPedido([...pedido, { ...prod, cantidad: 1 }]);
    }
  };

  const total = pedido.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const finalizarPedido = async () => {
    if (!mesero || pedido.length === 0) return alert("Falta nombre o productos");
    try {
      await axios.post(`${API_URL}/ventas`, {
        mesero,
        productos: pedido.map(p => ({ id: p.id, cantidad: p.cantidad }))
      });
      alert("¡Venta guardada!");
      setPedido([]);
      setMesero("");
    } catch (err) {
      alert("Error al cobrar");
    }
  };

  return (
    <div style={styles.container}>
      {/* SECCIÓN IZQUIERDA: MENÚ */}
      <div style={styles.menuSection}>
        <h2 style={styles.title}>Menú 🍕🥤</h2>
        <div style={styles.grid}>
          {productos.map(p => (
            <button key={p.id} onClick={() => agregarAlPedido(p)} style={styles.card}>
              <span style={styles.prodName}>{p.nombre}</span>
              <span style={styles.prodPrice}>${p.precio.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SECCIÓN DERECHA: TICKET */}
      <div style={styles.orderSection}>
        <h2 style={styles.title}>Pedido Actual</h2>
        <input 
          placeholder="Nombre del Mesero / Mesa" 
          value={mesero}
          onChange={(e) => setMesero(e.target.value)}
          style={styles.input}
        />
        
        <div style={styles.ticket}>
          {pedido.map(item => (
            <div key={item.id} style={styles.ticketItem}>
              <span>{item.cantidad}x {item.nombre}</span>
              <span>${(item.precio * item.cantidad).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div style={styles.totalRow}>
          <strong>TOTAL:</strong>
          <strong>${total.toFixed(2)}</strong>
        </div>

        <button onClick={finalizarPedido} style={styles.buttonCobrar}>
          FINALIZAR Y COBRAR
        </button>
      </div>
    </div>
  );
};

// DISEÑO (CSS-in-JS)
const styles = {
  container: { display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f4f4f9' },
  menuSection: { flex: 2, padding: '20px', overflowY: 'auto' },
  orderSection: { flex: 1, backgroundColor: '#fff', borderLeft: '2px solid #ddd', padding: '20px', display: 'flex', flexDirection: 'column' },
  title: { borderBottom: '2px solid #eee', paddingBottom: '10px', color: '#333' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' },
  card: { 
    display: 'flex', flexDirection: 'column', padding: '20px', border: 'none', borderRadius: '12px',
    backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: 'pointer', transition: '0.2s', textAlign: 'center'
  },
  prodName: { fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' },
  prodPrice: { color: '#27ae60', fontWeight: 'bold' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px', fontSize: '1rem' },
  ticket: { flex: 1, overflowY: 'auto', marginBottom: '20px' },
  ticketItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #eee' },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', padding: '20px 0', borderTop: '2px solid #333' },
  buttonCobrar: { 
    padding: '20px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '10px', 
    fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' 
  }
};

export default App;