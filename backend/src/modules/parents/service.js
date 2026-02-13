const bcrypt = require('bcrypt');
const db = require('../../config/db');
const parentModel = require('./model');

const SALT_ROUNDS = 12;

const createParent = async (schoolId, data) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(data.password || 'Parent@123', SALT_ROUNDS);

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (school_id, first_name, last_name, email, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,$5,$6,'PARENT')
       RETURNING id, first_name, last_name, email, phone`,
      [schoolId, data.first_name, data.last_name, data.email || null, data.phone || null, passwordHash]
    );
    const user = userResult.rows[0];

    // Create parent profile
    const parentResult = await client.query(
      `INSERT INTO parents (school_id, user_id, occupation, address, relationship)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [schoolId, user.id, data.occupation || null, data.address || null, data.relationship || 'Parent']
    );

    // Link children if provided
    if (data.pupil_ids && data.pupil_ids.length > 0) {
      for (const pupilId of data.pupil_ids) {
        await client.query(
          `INSERT INTO pupil_parents (school_id, pupil_id, parent_id, is_primary)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (pupil_id, parent_id) DO NOTHING`,
          [schoolId, pupilId, parentResult.rows[0].id]
        );
      }
    }

    await client.query('COMMIT');
    return { ...parentResult.rows[0], ...user };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const listParents = async (schoolId, query) => {
  return parentModel.findBySchool(schoolId, query);
};

const getParent = async (id, schoolId) => {
  const parent = await parentModel.findById(id, schoolId);
  if (!parent) {
    const err = new Error('Parent not found.');
    err.statusCode = 404;
    throw err;
  }
  parent.children = await parentModel.getChildren(id, schoolId);
  return parent;
};

const getMyChildren = async (userId, schoolId) => {
  const parent = await parentModel.findByUserId(userId, schoolId);
  if (!parent) {
    const err = new Error('Parent profile not found.');
    err.statusCode = 404;
    throw err;
  }
  return parentModel.getChildren(parent.id, schoolId);
};

const updateParent = async (id, schoolId, data) => {
  const parent = await parentModel.findById(id, schoolId);
  if (!parent) {
    const err = new Error('Parent not found.');
    err.statusCode = 404;
    throw err;
  }

  // Separate user fields from parent fields
  const userFields = {};
  const parentFields = {};

  ['first_name', 'last_name', 'email', 'phone'].forEach((k) => {
    if (data[k] !== undefined) userFields[k] = data[k];
  });
  ['occupation', 'address', 'relationship'].forEach((k) => {
    if (data[k] !== undefined) parentFields[k] = data[k];
  });

  // Update user fields if any
  if (Object.keys(userFields).length > 0) {
    const sets = [];
    const vals = [];
    let i = 1;
    for (const [k, v] of Object.entries(userFields)) {
      sets.push(`${k} = $${i}`);
      vals.push(v);
      i++;
    }
    sets.push('updated_at = NOW()');
    vals.push(parent.user_id);
    await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, vals);
  }

  // Update parent fields if any
  if (Object.keys(parentFields).length > 0) {
    const sets = [];
    const vals = [];
    let i = 1;
    for (const [k, v] of Object.entries(parentFields)) {
      sets.push(`${k} = $${i}`);
      vals.push(v);
      i++;
    }
    sets.push('updated_at = NOW()');
    vals.push(id, schoolId);
    await db.query(`UPDATE parents SET ${sets.join(', ')} WHERE id = $${i} AND school_id = $${i + 1}`, vals);
  }

  return parentModel.findById(id, schoolId);
};

const linkChild = async (schoolId, parentId, pupilId, isPrimary) => {
  return parentModel.linkChild(schoolId, parentId, pupilId, isPrimary);
};

const deleteParent = async (id, schoolId) => {
  const parent = await parentModel.findById(id, schoolId);
  if (!parent) {
    const err = new Error('Parent not found.');
    err.statusCode = 404;
    throw err;
  }
  return parentModel.remove(id, schoolId);
};

module.exports = { createParent, listParents, getParent, getMyChildren, updateParent, linkChild, deleteParent };

