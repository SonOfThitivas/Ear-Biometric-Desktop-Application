import pg from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
import { IActivityCategory, initIActivityCategory } from './interface/IActivityCategory';

const { Client } = pg;

// Connection Config
const DB_CONFIG = {
  host: process.env.DB_HOST || 'ear-biometric-db.postgres.database.azure.com',
  database: process.env.DB_NAME  || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  
  ssl: { rejectUnauthorized: false }
};

// Credentials
const ROLES = {
  gatekeeper: { user: 'app_gatekeeper', password: process.env.DB_PASS_GATEKEEPER || 'gatekeeper_pass' },
  user:       { user: 'app_user',       password: process.env.DB_PASS_USER || 'secure_user_pass' },
  admin:      { user: 'app_admin',      password: process.env.DB_PASS_ADMIN || 'secure_admin_pass' }
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
    return {success: true, message: "Database has connected"}
  } catch (err) {
    console.error(`❌ [DB] Failed to connect as ${roleName}`, err);
    return {success: false, message: err}
  }
};

export const connectDB = async () => {
    return await connectAs('gatekeeper');
};

const getClient = () => {
    if (!client) throw new Error("Database not connected. Call connectDB() first.");
    return client;
}

// ==========================================
// 0. LOGGING HELPER (Resolves op_number -> UUID)
// ==========================================
export const logActivity = async (op_number: string, activity: string) => {
  // CHANGED: Added 'AT TIME ZONE' to convert server time (UTC) to Thailand time
  const query = `
    INSERT INTO activity_time_stamp (operator_id, time_stamp, activity) 
    VALUES (
        (SELECT id FROM operator WHERE op_number = $1), 
        NOW() AT TIME ZONE 'Asia/Bangkok', 
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
  const query = `
    SELECT 
        c.hn_number as hn, c.firstname, c.lastname, c.age_text, c.nationality,
        c.sex, c.dob, c.address, c.born_detail, c.born_weight,
        c.weight_now, c.height_length,
        
        c.data_integrity as integrity, -- ✨ Fixed spelling
        c.data_text as data,           
        
        p.hn_number as hn_parent 
    FROM child c
    LEFT JOIN parent_child pc ON c.id = pc.child_id
    LEFT JOIN parent p ON pc.parent_id = p.id AND p.active_status = '1'
    WHERE c.active_status = '1'
    ORDER BY c.firstname ASC
  `;
  try {
    const res = await client!.query(query);
    return res.rows;
  } catch (error) { console.error(error); return []; }
};

// Base Columns (Updated with NEW FIELDS for Search)
// Base Columns (Unchanged)
const baseSelect = `
    SELECT 
        c.hn_number as child_hn, c.firstname as child_fname, c.lastname as child_lname, 
        c.age_text as child_age_text, c.nationality as child_nationality, c.sex as child_sex, c.dob as child_dob,
        c.address as child_address, c.born_detail as child_born_detail, c.born_weight as child_born_weight,
        c.weight_now as child_weight_now, c.height_length as child_height_length, 
        
        c.data_integrity as child_integrity, 
        c.data_text as child_data,
        
        p.hn_number as parent_hn, p.firstname as parent_fname, p.lastname as parent_lname, 
        p.age_text as parent_age_text, p.nationality as parent_nationality, p.sex as parent_sex, p.dob as parent_dob,
        p.address as parent_address, p.born_detail as parent_born_detail, p.born_weight as parent_born_weight,
        p.weight_now as parent_weight_now, p.height_length as parent_height_length, 
        
        p.data_integrity as parent_integrity, 
        p.data_text as parent_data,

        (EXISTS (
            SELECT 1 FROM identity_vector_child 
            WHERE child_id = c.id AND active_status = '1'
        )) as child_vector,
        (EXISTS (
            SELECT 1 FROM identity_vector_parent 
            WHERE parent_id = p.id AND active_status = '1'
        )) as parent_vector
`;

// 2. Search Multi-Criteria (FIXED)
export const searchMultiCriteria = async (hn: string, fname: string, lname: string) => {
    // REMOVED "ORDER BY" from inside q1
    const q1 = ` 
        ${baseSelect} 
        FROM child c 
        LEFT JOIN parent_child pc ON c.id = pc.child_id 
        LEFT JOIN parent p ON pc.parent_id = p.id AND p.active_status = '1'
        WHERE c.active_status = '1' 
        AND ($1 = '' OR c.hn_number ILIKE  $1) 
        AND ($2 = '' OR c.firstname ILIKE $2) 
        AND ($3 = '' OR c.lastname ILIKE $3)
    `;

    // REMOVED "ORDER BY" from inside q2
    const q2 = ` 
        ${baseSelect} 
        FROM parent p 
        LEFT JOIN parent_child pc ON p.id = pc.parent_id 
        LEFT JOIN child c ON pc.child_id = c.id AND c.active_status = '1'
        WHERE p.active_status = '1' 
        AND ($1 = '' OR p.hn_number ILIKE  $1) 
        AND ($2 = '' OR p.firstname ILIKE $2) 
        AND ($3 = '' OR p.lastname ILIKE $3) 
    `;

    try { 
        const p1 = hn.trim() ? `%${hn.trim()}%` : ''; 
        const p2 = fname.trim() ? `%${fname.trim()}%` : ''; 
        const p3 = lname.trim() ? `%${lname.trim()}%` : ''; 
        
        // ADDED "ORDER BY child_fname" at the very end
        const finalQuery = `${q1} UNION ${q2} ORDER BY child_fname ASC`;
        
        const res = await getClient().query(finalQuery, [p1, p2, p3]); 
        return res.rows; 
    } catch (error) { 
        console.error(error); 
        return []; 
    }
};

export const searchByFirstname = async (firstname: string) => {
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
      // ADDED ORDER BY HERE
      const finalQuery = `${q1} UNION ${q2} ORDER BY child_fname ASC`;
      const res = await getClient().query(finalQuery, [`%${firstname}%`]);
      return res.rows;
    } catch (error) { console.error(error); return []; }
};

export const searchByHN = async (hn: string) => {
    const q1 = `
      ${baseSelect}
      FROM child c
      LEFT JOIN parent_child pc ON c.id = pc.child_id 
      LEFT JOIN parent p ON pc.parent_id = p.id AND p.active_status = '1'
      WHERE c.active_status = '1' AND c.hn_number like $1
    `;
    const q2 = `
      ${baseSelect}
      FROM parent p
      LEFT JOIN parent_child pc ON p.id = pc.parent_id 
      LEFT JOIN child c ON pc.child_id = c.id AND c.active_status = '1'
      WHERE p.active_status = '1' AND p.hn_number like $1
    `;
    try {
      // ADDED ORDER BY HERE
      const finalQuery = `${q1} UNION ${q2} ORDER BY child_fname ASC`;
      const res = await getClient().query(finalQuery, [`%${hn}%`]);
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
      // ADDED ORDER BY HERE
      const finalQuery = `${q1} UNION ${q2} ORDER BY child_fname ASC`;
      const res = await getClient().query(finalQuery, [`%${lastname}%`]);
      return res.rows;
    } catch (error) { console.error(error); return []; }
};

// ==========================================
// 2. INSERT ENTITIES (Updated with New Fields)
// ==========================================

export const insertChild = async (data: any, op_number: string) => {
  const query = `
    INSERT INTO child (
        hn_number, firstname, lastname, age_text, dob, sex, nationality, active_status,
        address, born_detail, born_weight, weight_now, height_length, data_integrity, data_text
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, '1', $8, $9, $10, $11, $12, $13, $14)
  `;
  try {
    await getClient().query(query, [
        data.hn, data.firstname, data.lastname, data.age_text, data.dob, data.sex, data.nationality,
        data.address, data.born_detail, data.born_weight, data.weight_now, data.height_length, data.integrity, data.data
    ]);
    await logActivity(op_number, `Registered Child HN: ${data.hn}`);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

export const insertParent = async (data: any, op_number: string) => {
  const query = `
    INSERT INTO parent (
        hn_number, firstname, lastname, age_text, dob, sex, nationality, active_status,
        address, born_detail, born_weight, weight_now, height_length, data_integrity, data_text
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, '1', $8, $9, $10, $11, $12, $13, $14)
  `;
  try {
    await getClient().query(query, [
        data.hn, data.firstname, data.lastname, data.age_text, data.dob, data.sex, data.nationality,
        data.address, data.born_detail, data.born_weight, data.weight_now, data.height_length, data.integrity, data.data
    ]);
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
  const query = `
    INSERT INTO identity_vector_child (child_id, vector_1, vector_2, vector_3, path_folder, active_status)
    VALUES (
        (SELECT id FROM child WHERE hn_number = $1), 
        $2, $3, $4, $5, '1'
    )
  `;
  try {
    await getClient().query(query, [hn, JSON.stringify(v1), JSON.stringify(v2), JSON.stringify(v3), path]);
    await linkOperatorChild(op_number, hn); 
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
    const res = await client.query(`UPDATE child SET active_status = '0' WHERE hn_number = $1 AND active_status = '1'`, [hn]);
    
    if (res.rowCount === 0) return { success: false, message: `HN ${hn} not found or already deactivated.` };

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

export const hardDeleteChild = async (hn: string, op_number: string) => {
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
    const query = `SELECT op_number, username FROM operator WHERE username = $1 AND password = $2`;
    
    try {
        const res = await client!.query(query, [username, hashedPassword]);
        if (res.rows.length > 0) {
            const op = res.rows[0];
            const determinedRole = (op.username === 'admin') ? 'admin' : 'user';
            
            if (determinedRole === 'admin') await connectAs('admin');
            else await connectAs('user');

            await logActivity(op.op_number, `Operator ${username} Logged In`);
            
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
            c.hn_number as hn, 
            LEAST(
                iv.vector_1 <=> $1,
                iv.vector_2 <=> $1,
                iv.vector_3 <=> $1
            ) as distance
        FROM identity_vector_child iv
        JOIN child c ON iv.child_id = c.id
        WHERE iv.active_status = '1'
        AND LEAST(iv.vector_1 <=> $1,iv.vector_2 <=> $1,iv.vector_3 <=> $1 ) < 0.3
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
        AND LEAST(iv.vector_1 <=> $1,iv.vector_2 <=> $1,iv.vector_3 <=> $1 ) < 0.3
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
// 8. UPDATE ENTITIES (Updated with New Fields)
// ==========================================

// Define the interface for update data to include new optional fields
interface UpdateData {
    firstname: string;
    lastname: string;
    age_text: string;
    nationality: string;
    dob: string;
    sex: string;
    address?: string;
    born_detail?: string;
    born_weight?: string;
    weight_now?: string;
    height_length?: string;
    integrity?: string;
    data?: string;
}

export const updateChild = async (hn: string, data: UpdateData, op_number: string) => {
  const query = `
    UPDATE child 
    SET firstname = $2, lastname = $3, age_text = $4, dob = $5, sex = $6, nationality = $7,
        address = $8, born_detail = $9, born_weight = $10, weight_now = $11, 
        height_length = $12, data_integrity = $13, data_text = $14
    WHERE hn_number = $1 AND active_status = '1'
  `;
  
    try {
    const client = getClient();
    const res = await client.query(query, [
      hn, data.firstname, data.lastname, data.age_text, data.dob, data.sex, data.nationality,
      data.address || null, data.born_detail || null, data.born_weight || null, data.weight_now || null,
      data.height_length || null, data.integrity || null, data.data || null
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

export const updateParent = async (hn: string, data: UpdateData, op_number: string) => {
  const query = `
    UPDATE parent 
    SET firstname = $2, lastname = $3, age_text = $4, dob = $5, sex = $6, nationality = $7,
        address = $8, born_detail = $9, born_weight = $10, weight_now = $11, 
        height_length = $12, data_integrity = $13, data_text = $14
    WHERE hn_number = $1 AND active_status = '1'
  `;

    try {
    const client = getClient();
    const res = await client.query(query, [
      hn, data.firstname, data.lastname, data.age_text, data.dob, data.sex, data.nationality,
      data.address || null, data.born_detail || null, data.born_weight || null, data.weight_now || null,
      data.height_length || null, data.integrity || null, data.data || null
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

// ==========================================
// 9. SELECT SINGLE BY HN (INDIVIDUAL TABLES)
// ==========================================

export const getChildByHN = async (hn: string) => {
    const query = `
        SELECT hn_number, firstname, lastname, age_text, dob, sex, nationality,
               address, born_detail, born_weight, weight_now, height_length, 
               data_integrity as integrity, data_text as data
        FROM child 
        WHERE hn_number = $1 AND active_status = '1'
        LIMIT 1
    `;
    try {
        const res = await getClient().query(query, [hn]);
        return res.rows[0]; 
    } catch (error: any) {
        console.error("❌ [DB] Get Child By HN Failed:", error.message);
        return null;
    }
};

export const getParentByHN = async (hn: string) => {
    const query = `
        SELECT hn_number, firstname, lastname, age_text, dob, sex, nationality,
               address, born_detail, born_weight, weight_now, height_length, 
               data_integrity as integrity, data_text as data
        FROM parent 
        WHERE hn_number = $1 AND active_status = '1'
        LIMIT 1
    `;
    try {
        const res = await getClient().query(query, [hn]);
        return res.rows[0]; 
    } catch (error: any) {
        console.error("❌ [DB] Get Parent By HN Failed:", error.message);
        return null;
    }
};

// ==========================================
// CHECK VECTOR EXISTENCE (Returns SQL Boolean)
// ==========================================

export const checkChildVectorExists = async (hn: string) => {
    const query = `
        SELECT EXISTS (
            SELECT 1 
            FROM identity_vector_child 
            WHERE child_id = (SELECT id FROM child WHERE hn_number = $1)
            AND active_status = '1'
        ) as "exists";
    `;
    try {
        const res = await getClient().query(query, [hn]);
        return res.rows[0]?.exists ?? false; 
    } catch (error: any) {
        console.error("❌ [DB] Check Child Vector Failed:", error.message);
        return false;
    }
};

export const checkParentVectorExists = async (hn: string) => {
    const query = `
        SELECT EXISTS (
            SELECT 1 
            FROM identity_vector_parent 
            WHERE parent_id = (SELECT id FROM parent WHERE hn_number = $1)
            AND active_status = '1'
        ) as "exists";
    `;
    try {
        const res = await getClient().query(query, [hn]);
        return res.rows[0]?.exists ?? false; 
    } catch (error: any) {
        console.error("❌ [DB] Check Parent Vector Failed:", error.message);
        return false;
    }
};

// ==========================================
// LOG ACTIVITY 
// ==========================================

export const getActivityLogs = async (category:IActivityCategory) => {
    // init query
    const query = `
        SELECT 
        activity_time_stamp.activity, 
        activity_time_stamp.time_stamp, 
        operator.firstname, 
        operator.lastname, 
        operator.username 
        FROM activity_time_stamp 
        JOIN operator ON activity_time_stamp.operator_id = operator.id
        ORDER BY time_stamp ${category.ordering};
    `;
    
    try {
        const result = await getClient().query(query);
        return result.rows;
    } catch (error: any) {
        console.error("Failed to fetch activity logs:", error);
        return []; // Return empty array on error to prevent frontend crash
    }
};
