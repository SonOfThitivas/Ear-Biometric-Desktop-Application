import pg from 'pg';
const { Client } = pg;

// Database Connection Config
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'ear_db', // Ensure this matches your DB name
  password: 'cpre888', 
  port: 5433, 
});

export const connectDB = async () => {
  try {
    await client.connect();
    console.log('✅ [DB] Connected to PostgreSQL on port 5433');
  } catch (err) {
    console.error('❌ [DB] Connection error:', err);
  }
};

// ==========================================
// 1. SELECT & SEARCH (Active Status = 1)
// ==========================================

// 1. Select all active children
export const getAllActiveChildren = async () => {
  const query = `SELECT * FROM child WHERE active_status = '1'`;
  try {
    const res = await client.query(query);
    return res.rows;
  } catch (error) { console.error(error); return []; }
};

// Helper query for joins (Used in 2, 3, 4)
const joinQuery = `
  SELECT 
    c.hn_number as child_hn, c.firstname as child_fname, c.lastname as child_lname, 
    c.age as child_age, c.sex as child_sex, c.dob as child_dob,
    p.hn_number as parent_hn, p.firstname as parent_fname, p.lastname as parent_lname, 
    p.age as parent_age, p.sex as parent_sex, p.dob as parent_dob
  FROM child c
  JOIN parent_child pc ON c.hn_number = pc.child_hn_number
  JOIN parent p ON pc.parent_hn_number = p.hn_number
  WHERE c.active_status = '1' AND p.active_status = '1'
`;

// 2. Join Child+Parent by Firstname (Matches Child OR Parent)
export const searchByFirstname = async (firstname: string) => {
  const query = `${joinQuery} AND (c.firstname ILIKE $1 OR p.firstname ILIKE $1)`;
  try {
    const res = await client.query(query, [`%${firstname}%`]);
    return res.rows;
  } catch (error) { console.error(error); return []; }
};

// 3. Join Child+Parent by HN (Matches Child OR Parent)
export const searchByHN = async (hn: string) => {
  const query = `${joinQuery} AND (c.hn_number = $1 OR p.hn_number = $1)`;
  try {
    const res = await client.query(query, [hn]);
    return res.rows;
  } catch (error) { console.error(error); return []; }
};

// 4. Join Child+Parent by Lastname (Matches Child OR Parent)
export const searchByLastname = async (lastname: string) => {
  const query = `${joinQuery} AND (c.lastname ILIKE $1 OR p.lastname ILIKE $1)`;
  try {
    const res = await client.query(query, [`%${lastname}%`]);
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
    await client.query(query, [data.hn, data.firstname, data.lastname, data.age, data.dob, data.sex]);
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
    await client.query(query, [data.hn, data.firstname, data.lastname, data.age, data.dob, data.sex]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 7. Insert Operator
export const insertOperator = async (data: any) => {
  // Note: data.op_number must be provided or generated before calling this
  const query = `
    INSERT INTO operator (op_number, firstname, lastname, username, password)
    VALUES ($1, $2, $3, $4, $5)
  `;
  try {
    await client.query(query, [data.op_number, data.firstname, data.lastname, data.username, data.password]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
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
    await client.query(query, [hn, JSON.stringify(v1), JSON.stringify(v2), JSON.stringify(v3), path]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 9. Link Operator -> Child
export const linkOperatorChild = async (op_number: string, child_hn: string) => {
  const query = `INSERT INTO operator_child (operator_op_number, child_hn_number) VALUES ($1, $2)`;
  try {
    await client.query(query, [op_number, child_hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 10. Link Parent -> Child
export const linkParentChild = async (parent_hn: string, child_hn: string) => {
  const query = `INSERT INTO parent_child (parent_hn_number, child_hn_number) VALUES ($1, $2)`;
  try {
    await client.query(query, [parent_hn, child_hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 11. Log Activity Timestamp
export const logActivity = async (op_number: string, activity: string) => {
  const query = `INSERT INTO activity_time_stamp (op_number, time_stamp, activity) VALUES ($1, NOW(), $2)`;
  try {
    await client.query(query, [op_number, activity]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 12. Link Operator -> Parent
export const linkOperatorParent = async (op_number: string, parent_hn: string) => {
  const query = `INSERT INTO operator_parent (operator_op_number, parent_hn_number) VALUES ($1, $2)`;
  try {
    await client.query(query, [op_number, parent_hn]);
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
    await client.query(query, [hn, JSON.stringify(v1), JSON.stringify(v2), JSON.stringify(v3), path]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// ==========================================
// 14 - 17. UPDATE STATUS (Soft Delete)
// ==========================================

// 14. Deactivate Child
export const deactivateChild = async (hn: string) => {
  try {
    await client.query(`UPDATE child SET active_status = '0' WHERE hn_number = $1`, [hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 15. Deactivate Parent
export const deactivateParent = async (hn: string) => {
  try {
    await client.query(`UPDATE parent SET active_status = '0' WHERE hn_number = $1`, [hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 16. Deactivate Child Vectors
export const deactivateChildVectors = async (hn: string) => {
  try {
    await client.query(`UPDATE identity_vector_child SET active_status = '0' WHERE child_hn_number = $1`, [hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// 17. Deactivate Parent Vectors
export const deactivateParentVectors = async (hn: string) => {
  try {
    await client.query(`UPDATE identity_vector_parent SET active_status = '0' WHERE parent_hn_number = $1`, [hn]);
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
};

// ==========================================
// 18. AUTHENTICATION
// ==========================================

// 18. Operator Login
export const loginOperator = async (username: string, password: string) => {
  const query = `SELECT op_number FROM operator WHERE username = $1 AND password = $2`;
  try {
    const res = await client.query(query, [username, password]);
    if (res.rows.length > 0) {
        return { success: true, op_number: res.rows[0].op_number };
    }
    return { success: false, message: "Invalid credentials" };
  } catch (error: any) { return { success: false, error: error.message }; }
};