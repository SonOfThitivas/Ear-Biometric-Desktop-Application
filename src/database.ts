import pg from 'pg';
import crypto from 'crypto';
const { Client } = pg;

// Connection Config
const DB_CONFIG = {
  host: 'localhost',
  database: 'ear_db',
  port: 5433,
};

// Credentials for our 3 Roles
const ROLES = {
  gatekeeper: { user: 'app_gatekeeper', password: 'gatekeeper_pass' },
  user:       { user: 'app_user',       password: 'secure_user_pass' },
  admin:      { user: 'app_admin',      password: 'secure_admin_pass' }
};

// Mutable Client (This changes based on who is logged in)
let client: pg.Client | null = null;

const hashPassword = (password: string) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// Helper to switch connections
export const connectAs = async (roleName: 'gatekeeper' | 'user' | 'admin') => {
  // 1. Disconnect current session if exists
  if (client) {
    await client.end();
    console.log("🔌 [DB] Disconnecting previous session...");
  }

  // 2. Create new client with specific role credentials
  const creds = ROLES[roleName];
  client = new Client({
    ...DB_CONFIG,
    user: creds.user,
    password: creds.password
  });

  // 3. Connect
  try {
    await client.connect();
    console.log(`✅ [DB] Connected as role: ${roleName.toUpperCase()}`);
  } catch (err) {
    console.error(`❌ [DB] Failed to connect as ${roleName}`, err);
  }
};


// Initial Connection (Always Gatekeeper)
export const connectDB = async () => {
  await connectAs('gatekeeper');
};


const getClient = () => {
    if (!client) throw new Error("Database not connected. Call connectDB() first.");
    return client;
}



// ==========================================
// 1. SELECT & SEARCH (Active Status = 1)
// ==========================================

// 1. Select all active children (Updated to include Parent HN)
export const getAllActiveChildren = async () => {
  const query = `
    SELECT 
        c.hn_number as hn, 
        c.firstname, 
        c.lastname, 
        c.age, 
        c.sex, 
        c.dob,
        pc.parent_hn_number as hn_parent  -- Returns NULL if no parent
    FROM child c
    LEFT JOIN parent_child pc ON c.hn_number = pc.child_hn_number
    WHERE c.active_status = '1'
  `;
  try {
    const res = await client!.query(query);
    return res.rows;
  } catch (error) { console.error(error); return []; }
};

// Helper: Base Columns for the UNION query
// We select both Child and Parent info. If one side is missing, it will be NULL.
const baseSelect = `
    SELECT 
        c.hn_number as child_hn, c.firstname as child_fname, c.lastname as child_lname, 
        c.age as child_age, c.sex as child_sex, c.dob as child_dob,
        p.hn_number as parent_hn, p.firstname as parent_fname, p.lastname as parent_lname, 
        p.age as parent_age, p.sex as parent_sex, p.dob as parent_dob
`;

// 2. Search by Firstname (Union of Child matches + Parent matches)
export const searchByFirstname = async (firstname: string) => {
  // Part 1: Find Children (and optional parents)
  const q1 = `
    ${baseSelect}
    FROM child c
    LEFT JOIN parent_child pc ON c.hn_number = pc.child_hn_number
    LEFT JOIN parent p ON pc.parent_hn_number = p.hn_number
    WHERE c.active_status = '1' AND c.firstname ILIKE $1
  `;

  // Part 2: Find Parents (and optional children)
  const q2 = `
    ${baseSelect}
    FROM parent p
    LEFT JOIN parent_child pc ON p.hn_number = pc.parent_hn_number
    LEFT JOIN child c ON pc.child_hn_number = c.hn_number
    WHERE p.active_status = '1' AND p.firstname ILIKE $1
  `;

  try {
    const res = await getClient().query(`${q1} UNION ${q2}`, [`%${firstname}%`]);
    return res.rows;
  } catch (error) { console.error(error); return []; }
};

// 3. Search by HN (Union of Child matches + Parent matches)
export const searchByHN = async (hn: string) => {
  const q1 = `
    ${baseSelect}
    FROM child c
    LEFT JOIN parent_child pc ON c.hn_number = pc.child_hn_number
    LEFT JOIN parent p ON pc.parent_hn_number = p.hn_number
    WHERE c.active_status = '1' AND c.hn_number = $1
  `;

  const q2 = `
    ${baseSelect}
    FROM parent p
    LEFT JOIN parent_child pc ON p.hn_number = pc.parent_hn_number
    LEFT JOIN child c ON pc.child_hn_number = c.hn_number
    WHERE p.active_status = '1' AND p.hn_number = $1
  `;

  try {
    const res = await getClient().query(`${q1} UNION ${q2}`, [hn]);
    return res.rows;
  } catch (error) { console.error(error); return []; }
};

// 4. Search by Lastname (Union of Child matches + Parent matches)
export const searchByLastname = async (lastname: string) => {
  const q1 = `
    ${baseSelect}
    FROM child c
    LEFT JOIN parent_child pc ON c.hn_number = pc.child_hn_number
    LEFT JOIN parent p ON pc.parent_hn_number = p.hn_number
    WHERE c.active_status = '1' AND c.lastname ILIKE $1
  `;

  const q2 = `
    ${baseSelect}
    FROM parent p
    LEFT JOIN parent_child pc ON p.hn_number = pc.parent_hn_number
    LEFT JOIN child c ON pc.child_hn_number = c.hn_number
    WHERE p.active_status = '1' AND p.lastname ILIKE $1
  `;

  try {
    const res = await getClient().query(`${q1} UNION ${q2}`, [`%${lastname}%`]);
    return res.rows;
  } catch (error) { console.error(error); return []; }
};

// ==========================================
// 5 - 7. INSERT ENTITIES
// ==========================================

// 5. Insert Child
export const insertChild = async (data: any) => {
  const query = `
    INSERT INTO child (hn_number, firstname, lastname, age, dob, sex, active_status)
    VALUES ($1, $2, $3, $4, $5, $6, '1')
  `;
  try {
    await getClient().query(query, [data.hn, data.firstname, data.lastname, data.age, data.dob, data.sex]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 6. Insert Parent
export const insertParent = async (data: any) => {
  const query = `
    INSERT INTO parent (hn_number, firstname, lastname, age, dob, sex, active_status)
    VALUES ($1, $2, $3, $4, $5, $6, '1')
  `;
  try {
    await getClient().query(query, [data.hn, data.firstname, data.lastname, data.age, data.dob, data.sex]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 7. Insert Operator
export const insertOperator = async (data: any) => {
    // Hash the password before insertion
    const securePass = hashPassword(data.password);

    const query = `
        INSERT INTO operator (op_number, firstname, lastname, username, password, role)
        VALUES ($1, $2, $3, $4, $5, 'user') -- Default to user role
    `;
    try {
        await getClient().query(query, [
            data.op_number, 
            data.firstname, 
            data.lastname, 
            data.username, 
            securePass // <--- Store the hash
        ]);
        return { success: true };
    } catch (error: any) { 
        return { success: false, error: error.message }; 
    }
};

// ==========================================
// 8 - 13. INSERT RELATIONS & VECTORS & LOGS
// ==========================================

// 8. Insert Child Vectors
export const insertChildVectors = async (hn: string, v1: number[], v2: number[], v3: number[], path: string) => {
  const query = `
    INSERT INTO identity_vector_child (child_hn_number, vector_1, vector_2, vector_3, path_folder, active_status)
    VALUES ($1, $2, $3, $4, $5, '1')
  `;
  try {
    await getClient().query(query, [hn, JSON.stringify(v1), JSON.stringify(v2), JSON.stringify(v3), path]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 9. Link Operator -> Child
export const linkOperatorChild = async (op_number: string, child_hn: string) => {
  const query = `INSERT INTO operator_child (operator_op_number, child_hn_number) VALUES ($1, $2)`;
  try {
    await getClient().query(query, [op_number, child_hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 10. Link Parent -> Child
export const linkParentChild = async (parent_hn: string, child_hn: string) => {
  const query = `INSERT INTO parent_child (parent_hn_number, child_hn_number) VALUES ($1, $2)`;
  try {
    await getClient().query(query, [parent_hn, child_hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 11. Log Activity Timestamp
export const logActivity = async (op_number: string, activity: string) => {
  const query = `INSERT INTO activity_time_stamp (op_number, time_stamp, activity) VALUES ($1, NOW(), $2)`;
  try {
    await getClient().query(query, [op_number, activity]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 12. Link Operator -> Parent
export const linkOperatorParent = async (op_number: string, parent_hn: string) => {
  const query = `INSERT INTO operator_parent (operator_op_number, parent_hn_number) VALUES ($1, $2)`;
  try {
    await getClient().query(query, [op_number, parent_hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 13. Insert Parent Vectors
export const insertParentVectors = async (hn: string, v1: number[], v2: number[], v3: number[], path: string) => {
  const query = `
    INSERT INTO identity_vector_parent (parent_hn_number, vector_1, vector_2, vector_3, path_folder, active_status)
    VALUES ($1, $2, $3, $4, $5, '1')
  `;
  try {
    await getClient().query(query, [hn, JSON.stringify(v1), JSON.stringify(v2), JSON.stringify(v3), path]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// ==========================================
// 14 - 17. UPDATE STATUS (Soft Delete)
// ==========================================

// 14. Deactivate Child
export const deactivateChild = async (hn: string) => {
  try {
    await getClient().query(`UPDATE child SET active_status = '0' WHERE hn_number = $1`, [hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 15. Deactivate Parent
export const deactivateParent = async (hn: string) => {
  try {
    await getClient().query(`UPDATE parent SET active_status = '0' WHERE hn_number = $1`, [hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 16. Deactivate Child Vectors
export const deactivateChildVectors = async (hn: string) => {
  try {
    await getClient().query(`UPDATE identity_vector_child SET active_status = '0' WHERE child_hn_number = $1`, [hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 17. Deactivate Parent Vectors
export const deactivateParentVectors = async (hn: string) => {
  try {
    await getClient().query(`UPDATE identity_vector_parent SET active_status = '0' WHERE parent_hn_number = $1`, [hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// ==========================================
// 18. AUTHENTICATION
// ==========================================

export const loginOperator = async (username: string, pass: string) => {
    // Ensure we are connected (likely as gatekeeper)
    if (!client) await connectAs('gatekeeper');

    console.log(`🔐 [DB] Checking credentials for: ${username}`);
    
    // 1. Hash the input password immediately
    const hashedPassword = hashPassword(pass);

    // 2. Compare HASH vs HASH in the database
    // IMPORTANT: Select 'role' here so we can use it for the logic below
    const query = `SELECT op_number, username FROM operator WHERE username = $1 AND password = $2`;
    
    try {
        const res = await client!.query(query, [username, hashedPassword]);
        if (res.rows.length > 0) {
            const op = res.rows[0];
            console.log(`✅ [DB] Login valid for ${op.username}`);

            // Reconnect logic: Check the database Role, not just the username
            if (op.username === 'admin') {
                await connectAs('admin'); 
            } else {
                await connectAs('user');
            }

            return { success: true, op_number: op.op_number, role: op.username };
        }
        return { success: false, message: "Invalid credentials" };
    } catch (error: any) { 
        console.error("❌ [DB] LOGIN QUERY CRASHED:", error.message);
        return { success: false, error: error.message }; 
    }
};

// 19. Hard Delete (For Admin Use Only)
export const hardDeleteChild = async (hn: string) => {
    // If client is null, ensure we are connected
    if (!client) throw new Error("Database not connected");

    console.log(`🔥 [DB] Attempting HARD DELETE on ${hn}...`);
    // This query will FAIL if the current role is 'app_user'
    await client.query(`DELETE FROM child WHERE hn_number = $1`, [hn]);
};


// 20. Hard Delete Parent (For Admin Use Only)
export const hardDeleteParent = async (hn: string) => {
    // If client is null, ensure we are connected
    if (!client) throw new Error("Database not connected");

    console.log(`🔥 [DB] Attempting HARD DELETE on Parent ${hn}...`);
    
    // Because we set up CASCADE in SQL, this single line deletes:
    // 1. The Parent record
    // 2. Their Vectors (identity_vector_parent)
    // 3. Their Relations (parent_child, operator_parent)
    await client.query(`DELETE FROM parent WHERE hn_number = $1`, [hn]);
};

// 21. Multi-Criteria Search (Handles any combination of HN, Firstname, Lastname)
export const searchMultiCriteria = async (hn: string, fname: string, lname: string) => {
    // Base Select (Same columns we always use)
    const baseSelect = `
        SELECT 
            c.hn_number as child_hn, c.firstname as child_fname, c.lastname as child_lname, 
            c.age as child_age, c.sex as child_sex, c.dob as child_dob,
            p.hn_number as parent_hn, p.firstname as parent_fname, p.lastname as parent_lname, 
            p.age as parent_age, p.sex as parent_sex, p.dob as parent_dob
    `;

    // SQL LOGIC EXPLAINED:
    // ($1 = '' OR c.hn_number = $1) 
    // Means: "If the input ($1) is empty, match EVERYTHING (ignore this filter).
    //         But if input ($1) has text, then the database column MUST match it."

    const q1 = `
        ${baseSelect}
        FROM child c
        LEFT JOIN parent_child pc ON c.hn_number = pc.child_hn_number
        LEFT JOIN parent p ON pc.parent_hn_number = p.hn_number
        WHERE c.active_status = '1'
        AND ($1 = '' OR c.hn_number = $1)
        AND ($2 = '' OR c.firstname ILIKE $2)
        AND ($3 = '' OR c.lastname ILIKE $3)
    `;

    const q2 = `
        ${baseSelect}
        FROM parent p
        LEFT JOIN parent_child pc ON p.hn_number = pc.parent_hn_number
        LEFT JOIN child c ON pc.child_hn_number = c.hn_number
        WHERE p.active_status = '1'
        AND ($1 = '' OR p.hn_number = $1)
        AND ($2 = '' OR p.firstname ILIKE $2)
        AND ($3 = '' OR p.lastname ILIKE $3)
    `;

    try {
        // Prepare parameters: trim whitespace
        // For names, we add % for partial match (e.g. "Jo" finds "John")
        const p1 = hn.trim();
        const p2 = fname.trim() ? `%${fname.trim()}%` : '';
        const p3 = lname.trim() ? `%${lname.trim()}%` : '';

        // Run both queries combined
        const res = await getClient().query(`${q1} UNION ${q2}`, [p1, p2, p3]);
        return res.rows;
    } catch (error) { 
        console.error(error); 
        return []; 
    }
};