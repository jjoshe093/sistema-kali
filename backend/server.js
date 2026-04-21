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

// --- AGREGAR PRODUCTO ---
app.put('/api/pedidos/:id/agregar', async (req, res) => {
  const { id } = req.params;
  const { productos } = req.body; 

  try {
    await prisma.$transaction(async (tx) => {
      for (const p of productos) {
        const prodDb = await tx.producto.findUnique({ where: { id: p.id } });
        const precioAplicado = prodDb.precio;

        const detalleExistente = await tx.detallePedido.findFirst({
          where: {
            pedidoId: parseInt(id),
            productoId: p.id,
            nota: p.esMichelada ? "MICHELADA" : ""
          }
        });

        if (detalleExistente) {
          await tx.detallePedido.update({
            where: { id: detalleExistente.id },
            data: { cantidad: { increment: p.cantidad } }
          });
        } else {
          await tx.detallePedido.create({
            data: {
              pedidoId: parseInt(id),
              productoId: p.id,
              cantidad: p.cantidad,
              nota: p.esMichelada ? "MICHELADA" : ""
            }
          });
        }

        await tx.pedido.update({
          where: { id: parseInt(id) },
          data: { total: { increment: precioAplicado * p.cantidad } }
        });
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ELIMINAR PRODUCTO ---
app.put('/api/pedidos/:id/eliminar', async (req, res) => {
  const { id } = req.params;
  const { productoId, esMichelada } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      const detalle = await tx.detallePedido.findFirst({
        where: { 
          pedidoId: parseInt(id), 
          productoId: parseInt(productoId),
          nota: esMichelada ? "MICHELADA" : ""
        },
        include: { producto: true }
      });

      if (!detalle) return;
      const precioARestar = detalle.producto.precio;

      await tx.pedido.update({
        where: { id: parseInt(id) },
        data: { total: { decrement: precioARestar } }
      });

      if (detalle.cantidad > 1) {
        await tx.detallePedido.update({
          where: { id: detalle.id },
          data: { cantidad: { decrement: 1 } }
        });
      } else {
        await tx.detallePedido.delete({ where: { id: detalle.id } });
      }
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json(error); }
});

// --- CERRAR CUENTA (Descuenta stock solo Bebidas) ---
app.put('/api/pedidos/:id/cerrar', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id: parseInt(id) },
        include: { detallesPedido: { include: { producto: true } } }
      });

      for (const item of pedido.detallesPedido) {
        if (item.producto.categoria === "Bebidas") {
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

// --- REPORTE DIARIO ---
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

app.listen(process.env.PORT || 3000, () => console.log("Servidor Kali Gastrobar"));