// server.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cors = require('cors'); // Asegúrate de haber hecho: npm install cors
const app = express();

app.use(cors()); // Esto le dice al backend: "Acepta peticiones de cualquier sitio"
app.use(express.json());

// Registrar una venta
app.post('/api/ventas', async (req, res) => {
  const { mesero, productos } = req.body; // productos = [{id, cantidad}]

  try {
    const nuevaVenta = await prisma.$transaction(async (tx) => {
      let totalVenta = 0;

      // 1. Crear el pedido
      const pedido = await tx.pedido.create({
        data: { mesero }
      });

      for (const p of productos) {
        const prodDb = await tx.producto.findUnique({ where: { id: p.id } });
        totalVenta += prodDb.precio * p.cantidad;

        // 2. Si tiene stock (bebidas), restarlo
        if (!prodDb.esComida) {
          await tx.producto.update({
            where: { id: p.id },
            data: { stock: { decrement: p.cantidad } }
          });
        }

        // 3. Guardar detalle
        await tx.detallePedido.create({
          data: {
            pedidoId: pedido.id,
            productoId: p.id,
            cantidad: p.cantidad
          }
        });
      }

      // 4. Actualizar total
      return await tx.pedido.update({
        where: { id: pedido.id },
        data: { total: totalVenta }
      });
    });

    res.json(nuevaVenta);
  } catch (error) {
    res.status(500).json({ error: "Error procesando la venta" });
  }
});

// OBTENER TODOS LOS PRODUCTOS
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await prisma.producto.findMany();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// 1. Obtener solo pedidos abiertos
app.get('/api/pedidos/activos', async (req, res) => {
  const activos = await prisma.pedido.findMany({
    where: { estado: "ABIERTO" },
    include: { detallesPedido: { include: { producto: true } } }
  });
  res.json(activos);
});

// 2. Crear pedido nuevo (o inicial)
app.post('/api/pedidos/nuevo', async (req, res) => {
  const { mesero } = req.body;
  const nuevo = await prisma.pedido.create({ data: { mesero, total: 0 } });
  res.json(nuevo);
});

// 3. Agregar productos a un pedido existente
app.put('/api/pedidos/:id/agregar', async (req, res) => {
  const { id } = req.params;
  const { productos } = req.body; // [{id, cantidad}]

  const actualizado = await prisma.$transaction(async (tx) => {
    let extraTotal = 0;
    for (const p of productos) {
      const prodDb = await tx.producto.findUnique({ where: { id: p.id } });
      extraTotal += prodDb.precio * p.cantidad;
      await tx.detallePedido.create({
        data: { pedidoId: parseInt(id), productoId: p.id, cantidad: p.cantidad }
      });
    }
    return await tx.pedido.update({
      where: { id: parseInt(id) },
      data: { total: { increment: extraTotal } }
    });
  });
  res.json(actualizado);
});

// 4. Cerrar pedido (Pagar)
app.put('/api/pedidos/:id/cerrar', async (req, res) => {
  const { id } = req.params;
  await prisma.pedido.update({
    where: { id: parseInt(id) },
    data: { estado: "CERRADO" }
  });
  res.json({ msg: "Pedido cerrado" });
});

// Reporte del día
app.get('/api/reporte-diario', async (req, res) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const ventasHoy = await prisma.pedido.aggregate({
    _sum: { total: true },
    where: { fecha: { gte: hoy } }
  });

  res.json({ ventasTotales: ventasHoy._sum.total || 0 });
});

app.listen(process.env.PORT || 3000);