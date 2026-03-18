const db = require('../db');

exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT s.*, u.name AS created_by_name,
        (SELECT COUNT(*) FROM content c WHERE c.screen_id = s.id AND c.is_active = true) AS content_count
      FROM screens s
      LEFT JOIN users u ON u.id = s.created_by
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.get = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT s.*, u.name AS created_by_name
      FROM screens s
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Pantalla no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.create = async (req, res) => {
  const { name, description, location, resolution, orientation } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

  try {
    const { rows } = await db.query(
      `INSERT INTO screens (name, description, location, resolution, orientation, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, location, resolution || '1920x1080', orientation || 'landscape', req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.update = async (req, res) => {
  const { name, description, location, resolution, orientation, status } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE screens SET name=$1, description=$2, location=$3, resolution=$4, orientation=$5, status=$6
       WHERE id=$7 RETURNING *`,
      [name, description, location, resolution, orientation, status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Pantalla no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM screens WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Pantalla no encontrada' });
    res.json({ message: 'Pantalla eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};
