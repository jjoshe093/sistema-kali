import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "https://sistema-kali-production.up.railway.app/api";

const App = () => {
  const [productos, setProductos] = useState([]);
  const [pedido, setPedido] = useState([]);
  const [mesero, setMesero] = useState("");
  const [categoriaActual, setCategoriaActual] = useState(null);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const res = await axios.get(`${API_URL}/productos`);
        setProductos(res.data);
      } catch (err) { console.error(err); }
    };
    fetchProductos();
  }, []);

  // FILTRO REAL POR CATEGORÍA
  const productosFiltrados = productos.filter(p => p.categoria === categoriaActual);

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

  const eliminarUno = (id) => {
    const item = pedido.find(p => p.id === id);
    if (item.cantidad > 1) {
      setPedido(pedido.map(p => p.id === id ? { ...p, cantidad: p.cantidad - 1 } : p));
    } else {
      setPedido(pedido.filter(p => p.id !== id));
    }
  };

  const total = pedido.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

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
    } catch (err) { alert("Error al cobrar"); }
  };

  return (
    <div style={styles.container}>
      {/* MENÚ IZQUIERDA */}
      <div style={styles.menuSection}>
        <h2 style={styles.brand}>KALI SISTEMA 🍷</h2>
        
        {!categoriaActual ? (
          <div style={styles.categoryGrid}>
            {["Bebidas", "Cocteles", "Comida"].map(cat => (
              <button 
                key={cat} 
                onClick={() => setCategoriaActual(cat)} 
                style={{...styles.catCard, backgroundColor: cat === 'Comida' ? '#e67e22' : cat === 'Cocteles' ? '#9b59b6' : '#3498db'}}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => setCategoriaActual(null)} style={styles.backBtn}>← VOLVER</button>
            <h3 style={styles.catTitle}>{categoriaActual.toUpperCase()}</h3>
            <div style={styles.productGrid}>
              {productosFiltrados.map(p => (
                <button key={p.id} onClick={() => agregarAlPedido(p)} style={styles.prodCard}>
                  <div style={styles.prodName}>{p.nombre}</div>
                  <div style={styles.prodPrice}>${p.precio.toFixed(2)}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TICKET DERECHA */}
      <div style={styles.orderSection}>
        <h3 style={styles.ticketTitle}>Detalle del Pedido</h3>
        <input 
          placeholder="Mesa / Mesero" 
          value={mesero}
          onChange={(e) => setMesero(e.target.value)}
          style={styles.input}
        />
        
        <div style={styles.ticketList}>
          {pedido.map(item => (
            <div key={item.id} style={styles.ticketItem}>
              <div>
                <button onClick={() => eliminarUno(item.id)} style={styles.minusBtn}>-</button>
                <strong>{item.cantidad}</strong> {item.nombre}
              </div>
              <span>${(item.precio * item.cantidad).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div style={styles.totalBox}>
          <span>TOTAL</span>
          <span>${total.toFixed(2)}</span>
        </div>

        <button onClick={finalizarPedido} style={styles.payBtn}>COBRAR AHORA</button>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', height: '100vh', backgroundColor: '#1a1a1a', color: '#fff', fontFamily: 'system-ui' },
  menuSection: { flex: 2, padding: '30px', overflowY: 'auto' },
  brand: { fontSize: '2rem', marginBottom: '30px', textAlign: 'center', color: '#f1c40f' },
  categoryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' },
  catCard: { height: '150px', border: 'none', borderRadius: '15px', color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' },
  backBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' },
  catTitle: { marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' },
  productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' },
  prodCard: { padding: '20px', borderRadius: '12px', border: 'none', backgroundColor: '#2d2d2d', color: '#fff', cursor: 'pointer' },
  prodName: { fontWeight: 'bold', marginBottom: '5px' },
  prodPrice: { color: '#2ecc71', fontSize: '1.1rem' },
  orderSection: { flex: 1, backgroundColor: '#fff', color: '#333', padding: '25px', display: 'flex', flexDirection: 'column' },
  ticketTitle: { textAlign: 'center', margin: '0 0 20px 0', borderBottom: '2px solid #eee', paddingBottom: '10px' },
  input: { padding: '15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px', fontSize: '1.1rem' },
  ticketList: { flex: 1, overflowY: 'auto' },
  ticketItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' },
  minusBtn: { marginRight: '10px', width: '25px', height: '25px', borderRadius: '50%', border: 'none', backgroundColor: '#ff7675', color: '#fff', cursor: 'pointer' },
  totalBox: { display: 'flex', justifyContent: 'space-between', fontSize: '2rem', fontWeight: 'bold', padding: '20px 0', borderTop: '3px solid #333' },
  payBtn: { padding: '20px', borderRadius: '12px', border: 'none', backgroundColor: '#27ae60', color: '#fff', fontSize: '1.4rem', fontWeight: 'bold', cursor: 'pointer' }
};

export default App;