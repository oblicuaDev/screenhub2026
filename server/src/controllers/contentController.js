const path = require('path');
const db = require('../db');
const { USE_GCS } = require('../middleware/upload');

exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM content WHERE screen_id = $1 ORDER BY order_index ASC, created_at ASC',
      [req.params.screenId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.create = async (req, res) => {
  const { name, type, url, duration, order_index, settings } = req.body;
  const { screenId } = req.params;

  let fileUrl = url;

  // If a file was uploaded
  if (req.file) {
    if (USE_GCS && req.file.cloudUrl) {
      fileUrl = req.file.cloudUrl;
    } else {
      fileUrl = `/uploads/${req.file.filename}`;
    }
  }

  if (!name || !type || !fileUrl) {
    return res.status(400).json({ error: 'Nombre, tipo y URL/archivo son requeridos' });
  }
  if (!['video', 'image', 'iframe'].includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido. Use: video, image, iframe' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO content (screen_id, name, type, url, duration, order_index, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [screenId, name, type, fileUrl, duration || 10, order_index || 0, settings ? JSON.parse(settings) : {}]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.update = async (req, res) => {
  const { name, duration, order_index, is_active, settings } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE content SET name=$1, duration=$2, order_index=$3, is_active=$4, settings=$5
       WHERE id=$6 AND screen_id=$7 RETURNING *`,
      [name, duration, order_index, is_active, settings || {}, req.params.id, req.params.screenId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Contenido no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM content WHERE id = $1 AND screen_id = $2',
      [req.params.id, req.params.screenId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Contenido no encontrado' });
    res.json({ message: 'Contenido eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.reorder = async (req, res) => {
  const { items } = req.body; // [{ id, order_index }]
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items debe ser un arreglo' });

  try {
    await Promise.all(
      items.map(({ id, order_index }) =>
        db.query('UPDATE content SET order_index = $1 WHERE id = $2 AND screen_id = $3', [
          order_index,
          id,
          req.params.screenId,
        ])
      )
    );
    res.json({ message: 'Orden actualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// Public endpoint – no auth required (used by player)
exports.player = async (req, res) => {
  try {
    const { rows: screen } = await db.query('SELECT id, name, orientation FROM screens WHERE id = $1', [req.params.screenId]);
    if (!screen[0]) return res.status(404).json({ error: 'Pantalla no encontrada' });

    const { rows: content } = await db.query(
      'SELECT * FROM content WHERE screen_id = $1 AND is_active = true ORDER BY order_index ASC',
      [req.params.screenId]
    );
    res.json({ screen: screen[0], content });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};
