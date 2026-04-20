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