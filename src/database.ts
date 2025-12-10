// src/database.ts
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'ear_db', // Double check your DB name (ear_db vs postgres)
  password: 'cpre888',
  port: 5433,
});

// Interface matching the backend expectation (strict types)
interface RegistryData {
    hn: string;
    firstname: string;
    lastname: string;
    age: number;
    sex: string;
    dob: Date | null;
    r1: number[];
    r2: number[];
    r3: number[];
}

export const connectDB = async () => {
  try {
    await client.connect();
    console.log('✅ [DB] Connected to PostgreSQL on port 5433');
  } catch (err) {
    console.error('❌ [DB] Connection error:', err);
  }
};

export const registerPatientPair = async (child: RegistryData, parent: RegistryData) => {
    console.log("📝 [DB] Starting Full Registration (Data + 3 Vectors)...");
    
    try {
        await client.query('BEGIN'); 

        // 1. Insert Child (With r1, r2, r3)
        // Use JSON.stringify for pgvector input format "[1,2,3]"
        const childQuery = `
            INSERT INTO child (hn, firstname, lastname, age, gender, dob, r1, r2, r3, time_create)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `;
        await client.query(childQuery, [
            child.hn, 
            child.firstname, 
            child.lastname, 
            child.age, 
            child.sex, 
            child.dob, 
            JSON.stringify(child.r1), 
            JSON.stringify(child.r2), 
            JSON.stringify(child.r3)
        ]);
        console.log(`✅ [DB] Inserted Child: ${child.hn}`);

        // 2. Insert Parent (With r1, r2, r3) - Optional
        if (parent && parent.hn && parent.hn.trim() !== "") {
            const parentQuery = `
                INSERT INTO parent (hn, firstname, lastname, age, gender, dob, r1, r2, r3, time_create)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                ON CONFLICT (hn) DO NOTHING 
            `;
            await client.query(parentQuery, [
                parent.hn, 
                parent.firstname, 
                parent.lastname, 
                parent.age, 
                parent.sex, 
                parent.dob,
                JSON.stringify(parent.r1),
                JSON.stringify(parent.r2),
                JSON.stringify(parent.r3)
            ]);
            console.log(`✅ [DB] Processed Parent: ${parent.hn}`);

            // 3. Link them
            const relationQuery = `
                INSERT INTO patient_relation (child_hn, parent_hn)
                VALUES ($1, $2)
            `;
            await client.query(relationQuery, [child.hn, parent.hn]);
            console.log(`✅ [DB] Linked ${child.hn} <-> ${parent.hn}`);
        }

        await client.query('COMMIT');
        return { success: true, message: "Registration successful" };

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("❌ [DB] Registration failed:", error);
        
        if (error.code === '23505') {
            return { success: false, message: "Error: Child HN already exists." };
        }
        return { success: false, message: error.message };
    }
};

// ---------------------------------------------------------
// QUERY 1: Search by HN (Finds person + optional relation)
// ---------------------------------------------------------
export const getRelationsByHN = async (hn: string) => {
  console.log(`🔍 [DB] Searching for HN: "${hn}" (Left Join Mode)`);

  const query = `
    -- 1. Check if HN is a CHILD (Get child info + optional parent info)
    SELECT 
      pr.relation_id,
      c.hn as child_hn,
      p.hn as parent_hn,
      -- Child Data
      c.firstname as child_firstname, c.lastname as child_lastname, c.age as child_age, c.gender as child_sex, c.dob as child_dob,
      -- Parent Data (Might be NULL)
      p.firstname as parent_firstname, p.lastname as parent_lastname, p.age as parent_age, p.gender as parent_sex, p.dob as parent_dob
    FROM child c
    LEFT JOIN patient_relation pr ON c.hn = pr.child_hn
    LEFT JOIN parent p ON pr.parent_hn = p.hn
    WHERE c.hn = $1

    UNION

    -- 2. Check if HN is a PARENT (Get parent info + optional child info)
    SELECT 
      pr.relation_id,
      c.hn as child_hn,
      p.hn as parent_hn,
      -- Child Data (Might be NULL)
      c.firstname as child_firstname, c.lastname as child_lastname, c.age as child_age, c.gender as child_sex, c.dob as child_dob,
      -- Parent Data
      p.firstname as parent_firstname, p.lastname as parent_lastname, p.age as parent_age, p.gender as parent_sex, p.dob as parent_dob
    FROM parent p
    LEFT JOIN patient_relation pr ON p.hn = pr.parent_hn
    LEFT JOIN child c ON pr.child_hn = c.hn
    WHERE p.hn = $1
  `;

  try {
    const res = await client.query(query, [hn]);
    console.log(`✅ [DB] Found ${res.rowCount} matches for HN`);
    return res.rows;
  } catch (error) {
    console.error(`❌ [DB] HN search error:`, error);
    return [];
  }
};

// ---------------------------------------------------------
// QUERY 2: Search by Name (Finds person + optional relation)
// ---------------------------------------------------------
export const getRelationsByName = async (name: string) => {
  console.log(`🔍 [DB] Searching for Name: "${name}" (Left Join Mode)`);

  const query = `
    -- 1. Search in CHILD table (Get child info + optional parent info)
    SELECT 
      pr.relation_id,
      c.hn as child_hn,
      p.hn as parent_hn,
      c.firstname as child_firstname, c.lastname as child_lastname, c.age as child_age, c.gender as child_sex, c.dob as child_dob,
      p.firstname as parent_firstname, p.lastname as parent_lastname, p.age as parent_age, p.gender as parent_sex, p.dob as parent_dob
    FROM child c
    LEFT JOIN patient_relation pr ON c.hn = pr.child_hn
    LEFT JOIN parent p ON pr.parent_hn = p.hn
    WHERE c.firstname ILIKE $1 OR c.lastname ILIKE $1 -- Search First OR Last name

    UNION

    -- 2. Search in PARENT table (Get parent info + optional child info)
    SELECT 
      pr.relation_id,
      c.hn as child_hn,
      p.hn as parent_hn,
      c.firstname as child_firstname, c.lastname as child_lastname, c.age as child_age, c.gender as child_sex, c.dob as child_dob,
      p.firstname as parent_firstname, p.lastname as parent_lastname, p.age as parent_age, p.gender as parent_sex, p.dob as parent_dob
    FROM parent p
    LEFT JOIN patient_relation pr ON p.hn = pr.parent_hn
    LEFT JOIN child c ON pr.child_hn = c.hn
    WHERE p.firstname ILIKE $1 OR p.lastname ILIKE $1 -- Search First OR Last name
  `;

  try {
    const res = await client.query(query, [`%${name}%`]);
    console.log(`✅ [DB] Found ${res.rowCount} matches for Name`);
    return res.rows;
  } catch (error) {
    console.error(`❌ [DB] Name search error:`, error);
    return [];
  }
};

// ---------------------------------------------------------
// QUERY 3: Get ALL (Unchanged)
// ---------------------------------------------------------
export const getAllPatients = async () => {
  const query = `
    SELECT hn, firstname, lastname, age, gender as sex, dob, 'child' as type FROM child
    UNION ALL
    SELECT hn, firstname, lastname, age, gender as sex, dob, 'parent' as type FROM parent
  `;
  try {
    const res = await client.query(query);
    return res.rows;
  } catch (error) { return []; }
};

export const getAllRelations = async () => {
  console.log("🔍 [DB] Fetching ALL relations...");
  const query = `
    SELECT 
      pr.relation_id,
      pr.child_hn,
      pr.parent_hn,
      c.firstname as child_firstname,
      c.lastname as child_lastname,
      c.age as child_age,
      c.gender as child_sex,
      c.dob as child_dob,
      p.firstname as parent_firstname,
      p.lastname as parent_lastname,
      p.age as parent_age,
      p.gender as parent_sex,
      p.dob as parent_dob
    FROM patient_relation pr
    JOIN child c ON pr.child_hn = c.hn
    JOIN parent p ON pr.parent_hn = p.hn
  `;

  try {
    const res = await client.query(query);
    console.log(`✅ [DB] Found ${res.rowCount} total relations`);
    return res.rows;
  } catch (error) {
    console.error(`❌ [DB] Error fetching all relations:`, error);
    return [];
  }
};