const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// --- PRODUCTOS ---
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await prisma.producto.findMany();
    res.json(productos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- PEDIDOS ACTIVOS ---
app.get('/api/pedidos/activos', async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { estado: "ABIERTO" },
      include: { detallesPedido: { include: { producto: true } } }
    });
    res.json(pedidos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- NUEVO PEDIDO ---
app.post('/api/pedidos/nuevo', async (req, res) => {
  const { mesero } = req.body;
  try {
    const nuevo = await prisma.pedido.create({
      data: { mesero, total: 0, estado: "ABIERTO" },
      include: { detallesPedido: { include: { producto: true } } }
    });
    res.json(nuevo);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- AGREGAR PRODUCTO (Lógica de agrupación y Micheladas) ---
app.put('/api/pedidos/:id/agregar', async (req, res) => {
  const { id } = req.params;
  const { productoId, cantidad, productoBaseId, nombreMostrar } = req.body; 

  try {
    const prodPrincipal = await prisma.producto.findUnique({ where: { id: parseInt(productoId) } });
    const nombreFinal = nombreMostrar || prodPrincipal.nombre;

    const detalleExistente = await prisma.detallePedido.findFirst({
      where: {
        pedidoId: parseInt(id),
        productoId: parseInt(productoId),
        nombrePersonalizado: nombreFinal
      }
    });

    if (detalleExistente) {
      await prisma.detallePedido.update({
        where: { id: detalleExistente.id },
        data: { cantidad: { increment: cantidad } }
      });
    } else {
      await prisma.detallePedido.create({
        data: {
          pedidoId: parseInt(id),
          productoId: parseInt(productoId),
          productoBaseId: productoBaseId ? parseInt(productoBaseId) : null,
          nombrePersonalizado: nombreFinal,
          cantidad: cantidad
        }
      });
    }

    await tx.pedido.update({
      where: { id: parseInt(id) },
      data: { total: { increment: prodPrincipal.precio * cantidad } }
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- ELIMINAR PRODUCTO ---
app.put('/api/pedidos/:id/eliminar', async (req, res) => {
  const { id } = req.params;
  const { detalleId } = req.body;
  try {
    const detalle = await prisma.detallePedido.findUnique({
      where: { id: parseInt(detalleId) },
      include: { producto: true }
    });
    if (!detalle) return res.status(404).send("No encontrado");

    await prisma.pedido.update({ where: { id: parseInt(id) }, data: { total: { decrement: detalle.producto.precio } } });

    if (detalle.cantidad > 1) {
      await prisma.detallePedido.update({ where: { id: detalle.id }, data: { cantidad: { decrement: 1 } } });
    } else {
      await prisma.detallePedido.delete({ where: { id: detalle.id } });
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json(error); }
});

// --- CERRAR CUENTA Y DESCONTAR STOCK ---
app.put('/api/pedidos/:id/cerrar', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id: parseInt(id) },
        include: { detallesPedido: { include: { producto: true } } }
      });

      for (const item of pedido.detallesPedido) {
        if (item.productoBaseId) {
          await tx.producto.update({ where: { id: item.productoBaseId }, data: { stock: { decrement: item.cantidad } } });
        } else if (item.producto.categoria === "Bebidas") {
          await tx.producto.update({ where: { id: item.productoId }, data: { stock: { decrement: item.cantidad } } });
        }
      }
      await tx.pedido.update({ where: { id: parseInt(id) }, data: { estado: "CERRADO", fecha: new Date() } });
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json(error); }
});

// --- REPORTE DIARIO CORREGIDO ---
app.get('/api/reportes/diario', async (req, res) => {
  const { fecha } = req.query; // Formato YYYY-MM-DD
  try {
    const inicio = new Date(`${fecha}T00:00:00.000Z`);
    const fin = new Date(`${fecha}T23:59:59.999Z`);

    const pedidos = await prisma.pedido.findMany({
      where: { 
        estado: "CERRADO",
        fecha: { gte: inicio, lte: fin }
      },
      include: { detallesPedido: { include: { producto: true } } },
      orderBy: { fecha: 'desc' }
    });

    const totalVendido = pedidos.reduce((acc, p) => acc + p.total, 0);
    res.json({ totalVendido, totalPedidos: pedidos.length, pedidos });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(process.env.PORT || 3000, () => console.log("Servidor Kali Gastrobar Activo"));