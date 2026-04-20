// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Asegúrate de que termine en /api tal cual como en tu prueba exitosa
const API_URL = "https://sistema-kali-production.up.railway.app/api"; // <-- PEGA TU URL DE RAILWAY AQUÍ

function App() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [mesero, setMesero] = useState("");

  // Cargar productos al iniciar
  useEffect(() => {
    axios.get(`${API_URL}/productos`).then(res => setProductos(res.data));
  }, []);

  const agregarAlPedido = (producto) => {
    setCarrito([...carrito, producto]);
  };

  const enviarPedido = async () => {
    if (!mesero || carrito.length === 0) return alert("Falta nombre o productos");
    
    try {
      await axios.post(`${API_URL}/ventas`, {
        mesero,
        productos: carrito.map(p => ({ id: p.id, cantidad: 1 }))
      });
      alert("¡Venta registrada!");
      setCarrito([]);
    } catch (error) {
      alert("Error al enviar");
    }
  };

  return (
    <div className="p-4 font-sans">
      <h1 className="text-2xl font-bold mb-4">Toma de Pedidos 🍕🥤</h1>
      
      <input 
        className="border p-2 mb-4 w-full" 
        placeholder="Nombre del Mesero/Mesa" 
        onChange={(e) => setMesero(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2 mb-6">
        {productos.map(p => (
          <button 
            key={p.id} 
            onClick={() => agregarAlPedido(p)}
            className="bg-blue-500 text-white p-4 rounded-lg shadow"
          >
            {p.nombre} - ${p.precio}
          </button>
        ))}
      </div>

      <div className="border-t pt-4">
        <h2 className="font-bold">Pedido Actual:</h2>
        {carrito.map((item, index) => (
          <div key={index} className="flex justify-between border-b py-1">
            <span>{item.nombre}</span>
            <span>${item.precio}</span>
          </div>
        ))}
        <button 
          onClick={enviarPedido}
          className="w-full bg-green-600 text-white p-3 mt-4 rounded-xl font-bold"
        >
          Finalizar y Cobrar
        </button>
      </div>
    </div>
  );
}

export default App;