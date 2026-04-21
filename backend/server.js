const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// --- PRODUCTOS ---
app.get('/api/productos', async (req, res) => {
  const productos = await prisma.producto.findMany();
  res.json(productos);
});

// --- PEDIDOS ACTIVOS ---
app.get('/api/pedidos/activos', async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    where: { estado: "ABIERTO" },
    include: { detallesPedido: { include: { producto: true } } }
  });
  res.json(pedidos);
});

// --- NUEVO PEDIDO ---
app.post('/api/pedidos/nuevo', async (req, res) => {
  const { mesero } = req.body;
  const nuevo = await prisma.pedido.create({
    data: { mesero, total: 0, estado: "ABIERTO" },
    include: { detallesPedido: { include: { producto: true } } }
  });
  res.json(nuevo);
});

// --- AGREGAR PRODUCTO (Lógica Michelada) ---
app.put('/api/pedidos/:id/agregar', async (req, res) => {
  const { id } = req.params;
  const { productoId, cantidad, productoBaseId, nombreMostrar } = req.body; 

  try {
    const prodPrincipal = await prisma.producto.findUnique({ where: { id: parseInt(productoId) } });

    await prisma.detallePedido.create({
      data: {
        pedidoId: parseInt(id),
        productoId: parseInt(productoId),
        productoBaseId: productoBaseId ? parseInt(productoBaseId) : null,
        nombrePersonalizado: nombreMostrar || prodPrincipal.nombre,
        cantidad: cantidad
      }
    });

    await prisma.pedido.update({
      where: { id: parseInt(id) },
      data: { total: { increment: prodPrincipal.precio * cantidad } }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ELIMINAR PRODUCTO ---
app.put('/api/pedidos/:id/eliminar', async (req, res) => {
  const { id } = req.params;
  const { detalleId } = req.body; // Usamos el ID del detalle directamente

  try {
    const detalle = await prisma.detallePedido.findUnique({
      where: { id: parseInt(detalleId) },
      include: { producto: true }
    });

    if (!detalle) return res.status(404).send("No encontrado");

    await prisma.pedido.update({
      where: { id: parseInt(id) },
      data: { total: { decrement: detalle.producto.precio } }
    });

    if (detalle.cantidad > 1) {
      await prisma.detallePedido.update({
        where: { id: detalle.id },
        data: { cantidad: { decrement: 1 } }
      });
    } else {
      await prisma.detallePedido.delete({ where: { id: detalle.id } });
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json(error); }
});

// --- CERRAR CUENTA (Descuento de Stock Especial) ---
app.put('/api/pedidos/:id/cerrar', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id: parseInt(id) },
        include: { detallesPedido: { include: { producto: true } } }
      });

      for (const item of pedido.detallesPedido) {
        // Si es Michelada, descontamos la base (Regia, Corona, etc)
        if (item.productoBaseId) {
          await tx.producto.update({
            where: { id: item.productoBaseId },
            data: { stock: { decrement: item.cantidad } }
          });
        } 
        // Si es bebida normal, descontamos el producto directo
        else if (item.producto.categoria === "Bebidas") {
          await tx.producto.update({
            where: { id: item.productoId },
            data: { stock: { decrement: item.cantidad } }
          });
        }
      }

      await tx.pedido.update({
        where: { id: parseInt(id) },
        data: { estado: "CERRADO", fecha: new Date() }
      });
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json(error); }
});

app.get('/api/reportes/diario', async (req, res) => {
  const { fecha } = req.query;
  const inicio = new Date(fecha); inicio.setHours(0,0,0,0);
  const fin = new Date(fecha); fin.setHours(23,59,59,999);

  const pedidos = await prisma.pedido.findMany({
    where: { estado: "CERRADO", fecha: { gte: inicio, lte: fin } },
    include: { detallesPedido: { include: { producto: true } } }
  });

  const totalVendido = pedidos.reduce((acc, p) => acc + p.total, 0);
  res.json({ totalVendido, totalPedidos: pedidos.length, pedidos });
});

app.listen(process.env.PORT || 3000, () => console.log("Kali Server Ready"));