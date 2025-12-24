import pg from 'pg';
import crypto from 'crypto';

const { Client } = pg;

// Connection Config
const DB_CONFIG = {
  host: 'localhost',
  database: 'ear_db',
  port: import.meta.env.VITE_DATABASE_PORT,
};

// Credentials
const ROLES = {
  gatekeeper: { user: 'app_gatekeeper', password: 'gatekeeper_pass' },
  user:       { user: 'app_user',       password: 'secure_user_pass' },
  admin:      { user: 'app_admin',      password: 'secure_admin_pass' }
};

let client: pg.Client | null = null;

const hashPassword = (password: string) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

export const connectAs = async (roleName: 'gatekeeper' | 'user' | 'admin') => {
  if (client) {
    await client.end();
    console.log("🔌 [DB] Disconnecting previous session...");
  }
  const creds = ROLES[roleName];
  client = new Client({
    ...DB_CONFIG,
    user: creds.user,
    password: creds.password
  });
  try {
    await client.connect();
    console.log(`✅ [DB] Connected as role: ${roleName.toUpperCase()}`);
  } catch (err) {
    console.error(`❌ [DB] Failed to connect as ${roleName}`, err);
  }
};

export const connectDB = async () => {
  await connectAs('gatekeeper');
};

const getClient = () => {
    if (!client) throw new Error("Database not connected. Call connectDB() first.");
    return client;
}

// ==========================================
// 0. LOGGING HELPER (Resolves op_number -> UUID)
// ==========================================
export const logActivity = async (op_number: string, activity: string) => {
  // Logic: Find the UUID (id) for the given op_number string before inserting
  const query = `
    INSERT INTO activity_time_stamp (operator_id, time_stamp, activity) 
    VALUES (
        (SELECT id FROM operator WHERE op_number = $1), 
        NOW(), 
        $2
    )
  `;
  try { 
      await getClient().query(query, [op_number, activity]); 
      return { success: true }; 
  } catch (error: any) { 
      console.error("Failed to log activity:", error);
      return { success: false, error: error.message }; 
  }
};

// ==========================================
// 1. SELECT & SEARCH (Updated Joins to use IDs)
// ==========================================

export const getAllActiveChildren = async () => {
  // Join logic changed: child.id = parent_child.child_id
  const query = `
    SELECT 
        c.hn_number as hn, 
        c.firstname, 
        c.lastname, 
        c.age, 
        c.sex, 
        c.dob,
        p.hn_number as hn_parent 
    FROM child c
    LEFT JOIN parent_child pc ON c.id = pc.child_id
    LEFT JOIN parent p ON pc.parent_id = p.id AND p.active_status = '1'
    WHERE c.active_status = '1'
  `;
  try {
    const res = await client!.query(query);
    return res.rows;
  } catch (error) { console.error(error); return []; }
};

// Base Columns (Note: selects are aliased to match Frontend expectations)
const baseSelect = `
    SELECT 
        c.hn_number as child_hn, c.firstname as child_fname, c.lastname as child_lname, 
        c.age as child_age, c.sex as child_sex, c.dob as child_dob,
        p.hn_number as parent_hn, p.firstname as parent_fname, p.lastname as parent_lname, 
        p.age as parent_age, p.sex as parent_sex, p.dob as parent_dob
`;

// 2. Search Multi-Criteria (Updated Joins)
export const searchMultiCriteria = async (hn: string, fname: string, lname: string) => {
    // We filter by hn_number string ($1) because that is what the user types
    // But we JOIN using the IDs
    const q1 = ` 
        ${baseSelect} 
        FROM child c 
        LEFT JOIN parent_child pc ON c.id = pc.child_id 
        LEFT JOIN parent p ON pc.parent_id = p.id AND p.active_status = '1'
        WHERE c.active_status = '1' 
        AND ($1 = '' OR c.hn_number = $1) 
        AND ($2 = '' OR c.firstname ILIKE $2) 
        AND ($3 = '' OR c.lastname ILIKE $3)
    `;

    const q2 = ` 
        ${baseSelect} 
        FROM parent p 
        LEFT JOIN parent_child pc ON p.id = pc.parent_id 
        LEFT JOIN child c ON pc.child_id = c.id AND c.active_status = '1'
        WHERE p.active_status = '1' 
        AND ($1 = '' OR p.hn_number = $1) 
        AND ($2 = '' OR p.firstname ILIKE $2) 
        AND ($3 = '' OR p.lastname ILIKE $3) 
    `;

    try { 
        const p1 = hn.trim(); 
        const p2 = fname.trim() ? `%${fname.trim()}%` : ''; 
        const p3 = lname.trim() ? `%${lname.trim()}%` : ''; 
        const res = await getClient().query(`${q1} UNION ${q2}`, [p1, p2, p3]); 
        return res.rows; 
    } catch (error) { 
        console.error(error); 
        return []; 
    }
};

// These individual search functions are kept for compatibility, using the same new join logic
export const searchByFirstname = async (firstname: string) => {
    // Re-using searchMultiCriteria logic for specific fields could be cleaner, 
    // but here is the explicit query update:
    const q1 = `
      ${baseSelect}
      FROM child c
      LEFT JOIN parent_child pc ON c.id = pc.child_id 
      LEFT JOIN parent p ON pc.parent_id = p.id AND p.active_status = '1'
      WHERE c.active_status = '1' AND c.firstname ILIKE $1
    `;
    const q2 = `
      ${baseSelect}
      FROM parent p
      LEFT JOIN parent_child pc ON p.id = pc.parent_id 
      LEFT JOIN child c ON pc.child_id = c.id AND c.active_status = '1'
      WHERE p.active_status = '1' AND p.firstname ILIKE $1
    `;
    try {
      const res = await getClient().query(`${q1} UNION ${q2}`, [`%${firstname}%`]);
      return res.rows;
    } catch (error) { console.error(error); return []; }
};

export const searchByHN = async (hn: string) => {
    const q1 = `
      ${baseSelect}
      FROM child c
      LEFT JOIN parent_child pc ON c.id = pc.child_id 
      LEFT JOIN parent p ON pc.parent_id = p.id AND p.active_status = '1'
      WHERE c.active_status = '1' AND c.hn_number = $1
    `;
    const q2 = `
      ${baseSelect}
      FROM parent p
      LEFT JOIN parent_child pc ON p.id = pc.parent_id 
      LEFT JOIN child c ON pc.child_id = c.id AND c.active_status = '1'
      WHERE p.active_status = '1' AND p.hn_number = $1
    `;
    try {
      const res = await getClient().query(`${q1} UNION ${q2}`, [hn]);
      return res.rows;
    } catch (error) { console.error(error); return []; }
};

export const searchByLastname = async (lastname: string) => {
    const q1 = `
      ${baseSelect}
      FROM child c
      LEFT JOIN parent_child pc ON c.id = pc.child_id 
      LEFT JOIN parent p ON pc.parent_id = p.id AND p.active_status = '1'
      WHERE c.active_status = '1' AND c.lastname ILIKE $1
    `;
    const q2 = `
      ${baseSelect}
      FROM parent p
      LEFT JOIN parent_child pc ON p.id = pc.parent_id 
      LEFT JOIN child c ON pc.child_id = c.id AND c.active_status = '1'
      WHERE p.active_status = '1' AND p.lastname ILIKE $1
    `;
    try {
      const res = await getClient().query(`${q1} UNION ${q2}`, [`%${lastname}%`]);
      return res.rows;
    } catch (error) { console.error(error); return []; }
};

// ==========================================
// 2. INSERT ENTITIES (UUID is Auto-Generated)
// ==========================================

export const insertChild = async (data: any, op_number: string) => {
  // ID is generated by DEFAULT gen_random_uuid(), so we don't insert it.
  const query = `
    INSERT INTO child (hn_number, firstname, lastname, age, dob, sex, active_status) 
    VALUES ($1, $2, $3, $4, $5, $6, '1')
  `;
  try {
    await getClient().query(query, [data.hn, data.firstname, data.lastname, data.age, data.dob, data.sex]);
    await logActivity(op_number, `Registered Child HN: ${data.hn}`);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

export const insertParent = async (data: any, op_number: string) => {
  const query = `
    INSERT INTO parent (hn_number, firstname, lastname, age, dob, sex, active_status) 
    VALUES ($1, $2, $3, $4, $5, $6, '1')
  `;
  try {
    await getClient().query(query, [data.hn, data.firstname, data.lastname, data.age, data.dob, data.sex]);
    await logActivity(op_number, `Registered Parent HN: ${data.hn}`);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

export const insertOperator = async (data: any) => {
    const securePass = hashPassword(data.password);
    const query = `
        INSERT INTO operator (op_number, firstname, lastname, username, password, role) 
        VALUES ($1, $2, $3, $4, $5, 'user')
    `;
    try { 
        await getClient().query(query, [data.op_number, data.firstname, data.lastname, data.username, securePass]); 
        return { success: true }; 
    } catch (error: any) { return { success: false, error: error.message }; }
};

// ==========================================
// 3. LINKING (Resolving Strings to UUIDs)
// ==========================================

export const linkParentChild = async (parent_hn: string, child_hn: string) => {
  // We use subqueries to convert the HN Strings to UUIDs
  const query = `
    INSERT INTO parent_child (parent_id, child_id) 
    VALUES (
        (SELECT id FROM parent WHERE hn_number = $1),
        (SELECT id FROM child WHERE hn_number = $2)
    )
  `;
  try {
    await getClient().query(query, [parent_hn, child_hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

export const unlinkParentChild = async (parent_hn: string, child_hn: string, op_number: string) => {
    // Delete where IDs match the result of the lookup
    const query = `
        DELETE FROM parent_child 
        WHERE parent_id = (SELECT id FROM parent WHERE hn_number = $1)
        AND child_id = (SELECT id FROM child WHERE hn_number = $2)
    `;
    try {
        const client = getClient();
        const res = await client.query(query, [parent_hn, child_hn]);
        if (res.rowCount === 0) return { success: false, message: "Relation link not found." };
        await logActivity(op_number, `Unlinked Parent ${parent_hn} and Child ${child_hn}`);
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
};

// Helper for linking operators (Logic is the same: String -> UUID Lookup)
export const linkOperatorChild = async (op_number: string, child_hn: string) => {
  const query = `
    INSERT INTO operator_child (operator_id, child_id) 
    VALUES (
        (SELECT id FROM operator WHERE op_number = $1),
        (SELECT id FROM child WHERE hn_number = $2)
    )
  `;
  try {
    await getClient().query(query, [op_number, child_hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

export const linkOperatorParent = async (op_number: string, parent_hn: string) => {
  const query = `
    INSERT INTO operator_parent (operator_id, parent_id) 
    VALUES (
        (SELECT id FROM operator WHERE op_number = $1),
        (SELECT id FROM parent WHERE hn_number = $2)
    )
  `;
  try {
    await getClient().query(query, [op_number, parent_hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// ==========================================
// 4. VECTORS (Updated to use UUIDs)
// ==========================================

export const insertChildVectors = async (hn: string, v1: number[], v2: number[], v3: number[], path: string, op_number: string) => {
  // 1. Insert Vector (Resolving child_id from hn)
  const query = `
    INSERT INTO identity_vector_child (child_id, vector_1, vector_2, vector_3, path_folder, active_status)
    VALUES (
        (SELECT id FROM child WHERE hn_number = $1), 
        $2, $3, $4, $5, '1'
    )
  `;
  try {
    await getClient().query(query, [hn, JSON.stringify(v1), JSON.stringify(v2), JSON.stringify(v3), path]);
    await linkOperatorChild(op_number, hn); // Logic inside linkOperatorChild handles the UUID lookup too
    await logActivity(op_number, `Updated Vectors for Child HN: ${hn}`);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

export const insertParentVectors = async (hn: string, v1: number[], v2: number[], v3: number[], path: string, op_number: string) => {
  const query = `
    INSERT INTO identity_vector_parent (parent_id, vector_1, vector_2, vector_3, path_folder, active_status)
    VALUES (
        (SELECT id FROM parent WHERE hn_number = $1), 
        $2, $3, $4, $5, '1'
    )
  `;
  try {
    await getClient().query(query, [hn, JSON.stringify(v1), JSON.stringify(v2), JSON.stringify(v3), path]);
    await linkOperatorParent(op_number, hn);
    await logActivity(op_number, `Updated Vectors for Parent HN: ${hn}`);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// ==========================================
// 5. DELETE / STATUS (Soft & Hard)
// ==========================================

export const deactivateChild = async (hn: string, op_number: string) => {
  try {
    const client = getClient(); 
    // Update Child Status (String lookup is fine here as hn is unique)
    const res = await client.query(`UPDATE child SET active_status = '0' WHERE hn_number = $1 AND active_status = '1'`, [hn]);
    
    if (res.rowCount === 0) return { success: false, message: `HN ${hn} not found or already deactivated.` };

    // Deactivate Vectors (Using subquery for ID)
    await client.query(`
        UPDATE identity_vector_child SET active_status = '0' 
        WHERE child_id = (SELECT id FROM child WHERE hn_number = $1)
    `, [hn]);

    await logActivity(op_number, `Soft Deleted Child HN: ${hn}`);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

export const deactivateParent = async (hn: string, op_number: string) => {
  try {
    const client = getClient();
    const res = await client.query(`UPDATE parent SET active_status = '0' WHERE hn_number = $1 AND active_status = '1'`, [hn]);

    if (res.rowCount === 0) return { success: false, message: `HN ${hn} not found or already deactivated.` };

    await client.query(`
        UPDATE identity_vector_parent SET active_status = '0' 
        WHERE parent_id = (SELECT id FROM parent WHERE hn_number = $1)
    `, [hn]);

    await logActivity(op_number, `Soft Deleted Parent HN: ${hn}`);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// Note: Removed deactivateVectors functions as they are handled inside deactivateChild/Parent now

export const hardDeleteChild = async (hn: string, op_number: string) => {
    // Note: CASCADE constraints in your new SQL will automatically delete related vectors/links!
    // We only need to delete the main record using HN.
    if (!client) throw new Error("Database not connected");
    try {
        const res = await client.query(`DELETE FROM child WHERE hn_number = $1`, [hn]);
        if (res.rowCount === 0) return { success: false, message: `HN ${hn} not found.` };
        
        await logActivity(op_number, `Hard Deleted Child HN: ${hn}`);
        return { success: true };
    } catch (error: any) { return { success: false, message: error.message }; }
};

export const hardDeleteParent = async (hn: string, op_number: string) => {
    if (!client) throw new Error("Database not connected");
    try {
        const res = await client.query(`DELETE FROM parent WHERE hn_number = $1`, [hn]);
        if (res.rowCount === 0) return { success: false, message: `HN ${hn} not found.` };
        
        await logActivity(op_number, `Hard Deleted Parent HN: ${hn}`);
        return { success: true };
    } catch (error: any) { return { success: false, message: error.message }; }
};

// ==========================================
// 6. LOGIN
// ==========================================

export const loginOperator = async (username: string, pass: string) => {
    if (!client) await connectAs('gatekeeper');
    console.log(`🔐 [DB] Checking credentials for: ${username}`);
    const hashedPassword = hashPassword(pass);
    // op_number is still string in your schema
    const query = `SELECT op_number, username FROM operator WHERE username = $1 AND password = $2`;
    
    try {
        const res = await client!.query(query, [username, hashedPassword]);
        if (res.rows.length > 0) {
            const op = res.rows[0];
            const determinedRole = (op.username === 'admin') ? 'admin' : 'user';
            
            if (determinedRole === 'admin') await connectAs('admin');
            else await connectAs('user');

            await logActivity(op.op_number, `Operator ${username} Logged In`);
            
            // Return op_number string so frontend logic remains compatible
            return { success: true, op_number: op.op_number, role: determinedRole };
        }
        return { success: false, message: "Invalid credentials" };
    } catch (error: any) { 
        console.error("❌ [DB] LOGIN QUERY CRASHED:", error.message);
        return { success: false, error: error.message }; 
    }
};

// ==========================================
// 7. VECTOR SEARCH
// ==========================================

export const findClosestChild = async (vector: number[]) => {
    const vectorStr = JSON.stringify(vector);
    const query = `
        SELECT 
            c.hn_number as hn, -- Join to get the HN string for the frontend
            LEAST(
                iv.vector_1 <=> $1,
                iv.vector_2 <=> $1,
                iv.vector_3 <=> $1
            ) as distance
        FROM identity_vector_child iv
        JOIN child c ON iv.child_id = c.id -- JOIN using ID
        WHERE iv.active_status = '1'
        ORDER BY distance ASC
        LIMIT 1;
    `;
    try { 
        const res = await getClient().query(query, [vectorStr]); 
        return res.rows[0] || null; 
    } catch (error: any) { 
        console.error("❌ [DB] Child Vector Search Failed:", error.message); 
        return null; 
    }
};

export const findClosestParent = async (vector: number[]) => {
    const vectorStr = JSON.stringify(vector);
    const query = `
        SELECT 
            p.hn_number as hn,
            LEAST(
                iv.vector_1 <=> $1,
                iv.vector_2 <=> $1,
                iv.vector_3 <=> $1
            ) as distance
        FROM identity_vector_parent iv
        JOIN parent p ON iv.parent_id = p.id
        WHERE iv.active_status = '1'
        ORDER BY distance ASC
        LIMIT 1;
    `;
    try { 
        const res = await getClient().query(query, [vectorStr]); 
        return res.rows[0] || null; 
    } catch (error: any) { 
        console.error("❌ [DB] Parent Vector Search Failed:", error.message); 
        return null; 
    }
};

// ==========================================
// 8. UPDATE ENTITIES
// ==========================================

export const updateChild = async (hn: string, data: { firstname: string, lastname: string, age: number, dob: string, sex: string }, op_number: string) => {
  const query = `
    UPDATE child 
    SET firstname = $2, lastname = $3, age = $4, dob = $5, sex = $6
    WHERE hn_number = $1 AND active_status = '1'
  `;
  
  try {
    const client = getClient();
    const res = await client.query(query, [
      hn, 
      data.firstname, 
      data.lastname, 
      data.age, 
      data.dob, 
      data.sex
    ]);

    if (res.rowCount === 0) {
      return { success: false, message: `Update failed: Child HN ${hn} not found or inactive.` };
    }

    await logActivity(op_number, `Updated Info for Child HN: ${hn}`);
    return { success: true };

  } catch (error: any) {
    console.error("❌ [DB] Update Child Failed:", error.message);
    return { success: false, error: error.message };
  }
};

export const updateParent = async (hn: string, data: { firstname: string, lastname: string, age: number, dob: string, sex: string }, op_number: string) => {
  const query = `
    UPDATE parent 
    SET firstname = $2, lastname = $3, age = $4, dob = $5, sex = $6
    WHERE hn_number = $1 AND active_status = '1'
  `;

  try {
    const client = getClient();
    const res = await client.query(query, [
      hn, 
      data.firstname, 
      data.lastname, 
      data.age, 
      data.dob, 
      data.sex
    ]);

    if (res.rowCount === 0) {
      return { success: false, message: `Update failed: Parent HN ${hn} not found or inactive.` };
    }

    await logActivity(op_number, `Updated Info for Parent HN: ${hn}`);
    return { success: true };

  } catch (error: any) {
    console.error("❌ [DB] Update Parent Failed:", error.message);
    return { success: false, error: error.message };
  }
};