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
// AGREGAR PRODUCTO (EVITANDO DUPLICADOS)
app.put('/api/pedidos/:id/agregar', async (req, res) => {
  const { id } = req.params;
  const { productos } = req.body; // Esperamos [{id, cantidad}]

  try {
    const actualizado = await prisma.$transaction(async (tx) => {
      let extraTotal = 0;

      for (const p of productos) {
        const prodDb = await tx.producto.findUnique({ where: { id: p.id } });
        extraTotal += prodDb.precio * p.cantidad;

        // 1. BUSCAR SI YA EXISTE EL PRODUCTO EN ESTE PEDIDO
        const detalleExistente = await tx.detallePedido.findFirst({
          where: {
            pedidoId: parseInt(id),
            productoId: p.id
          }
        });

        if (detalleExistente) {
          // 2. SI EXISTE: Solo aumentamos la cantidad
          await tx.detallePedido.update({
            where: { id: detalleExistente.id },
            data: { cantidad: { increment: p.cantidad } }
          });
        } else {
          // 3. SI NO EXISTE: Creamos la fila nueva
          await tx.detallePedido.create({
            data: {
              pedidoId: parseInt(id),
              productoId: p.id,
              cantidad: p.cantidad
            }
          });
        }
      }

      // 4. Actualizar el total global del pedido
      return await tx.pedido.update({
        where: { id: parseInt(id) },
        data: { total: { increment: extraTotal } }
      });
    });

    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al agregar al pedido" });
  }
});

// 4. Cerrar pedido (Pagar)
// CERRAR PEDIDO Y DESCONTAR STOCK
app.put('/api/pedidos/:id/cerrar', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Buscamos el pedido con sus productos para saber qué descontar
      const pedido = await tx.pedido.findUnique({
        where: { id: parseInt(id) },
        include: { detallesPedido: { include: { producto: true } } }
      });

      if (!pedido) throw new Error("Pedido no encontrado");

      // 2. Recorremos los productos y restamos la cantidad del stock
      for (const detalle of pedido.detallesPedido) {
        // Solo descontamos si el producto tiene stock manejable (puedes filtrar por categoría si quieres)
        await tx.producto.update({
          where: { id: detalle.productoId },
          data: {
            stock: {
              decrement: detalle.cantidad // RESTA la cantidad vendida del stock actual
            }
          }
        });
      }

      // 3. Cambiamos el estado a CERRADO (NO lo eliminamos)
      await tx.pedido.update({
        where: { id: parseInt(id) },
        data: { estado: "CERRADO" }
      });
    });

    res.json({ message: "Pedido cerrado con éxito y stock actualizado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo cerrar el pedido correctamente" });
  }
});

// REPORTE DE VENTAS POR DÍA
app.get('/api/reportes/diario', async (req, res) => {
  const { fecha } = req.query; // Espera formato YYYY-MM-DD
  const inicioDia = new Date(fecha);
  inicioDia.setHours(0, 0, 0, 0);
  
  const finDia = new Date(fecha);
  finDia.setHours(23, 59, 59, 999);

  const pedidos = await prisma.pedido.findMany({
    where: {
      estado: "CERRADO",
      fecha: { gte: inicioDia, lte: finDia }
    },
    include: { detallesPedido: { include: { producto: true } } }
  });

  const totalVendido = pedidos.reduce((acc, p) => acc + p.total, 0);

  res.json({
    totalVendido,
    totalPedidos: pedidos.length,
    pedidos
  });
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

// RUTA PARA RESTAR 1 O QUITAR PRODUCTO
app.put('/api/pedidos/:id/eliminar', async (req, res) => {
  const { id } = req.params;
  const { productoId } = req.body;

  try {
    const actualizado = await prisma.$transaction(async (tx) => {
      // 1. Buscar el detalle de ese producto en ese pedido
      const detalle = await tx.detallePedido.findFirst({
        where: { 
          pedidoId: parseInt(id),
          productoId: parseInt(productoId)
        },
        include: { producto: true }
      });

      if (!detalle) return;

      // 2. Restar el precio del total del pedido
      await tx.pedido.update({
        where: { id: parseInt(id) },
        data: { total: { decrement: detalle.producto.precio } }
      });

      // 3. Si hay más de uno, restamos cantidad. Si hay solo uno, borramos la fila.
      if (detalle.cantidad > 1) {
        return await tx.detallePedido.update({
          where: { id: detalle.id },
          data: { cantidad: { decrement: 1 } }
        });
      } else {
        return await tx.detallePedido.delete({
          where: { id: detalle.id }
        });
      }
    });

    res.json({ msg: "Producto restado", actualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

app.listen(process.env.PORT || 3000);