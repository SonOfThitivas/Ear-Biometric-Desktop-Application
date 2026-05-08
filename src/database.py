import os
import hashlib
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

# Connection Config
DB_CONFIG = {
    'host': 'localhost',
    'database': 'ear_db',
    'port': os.getenv('VITE_DATABASE_PORT', '5432')
}

# Credentials
ROLES = {
    'gatekeeper': {'user': 'app_gatekeeper', 'password': 'gatekeeper_pass'},
    'user':       {'user': 'app_user',       'password': 'secure_user_pass'},
    'admin':      {'user': 'app_admin',      'password': 'secure_admin_pass'}
}

_connection = None

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def connect_as(role_name):
    global _connection
    if _connection:
        _connection.close()
        print("🔌 [DB] Disconnecting previous session...")
    
    creds = ROLES.get(role_name)
    if not creds:
        return {'success': False, 'message': f"Unknown role: {role_name}"}
    
    try:
        _connection = psycopg2.connect(
            host=DB_CONFIG['host'],
            database=DB_CONFIG['database'],
            port=DB_CONFIG['port'],
            user=creds['user'],
            password=creds['password']
        )
        # Enable autocommit for simpler operations, or manage transactions as needed.
        # TS code doesn't explicitly manage transactions per function, so autocommit is safer for direct translation.
        _connection.autocommit = True
        print(f"✅ [DB] Connected as role: {role_name.upper()}")
        return {'success': True, 'message': "Database has connected"}
    except Exception as e:
        print(f"❌ [DB] Failed to connect as {role_name}", e)
        return {'success': False, 'message': str(e)}

def connect_db():
    return connect_as('gatekeeper')

def get_connection():
    if not _connection:
        raise Exception("Database not connected. Call connect_db() first.")
    return _connection

def get_cursor():
    return get_connection().cursor(cursor_factory=RealDictCursor)

# ==========================================
# 0. LOGGING HELPER
# ==========================================
def log_activity(op_number, activity):
    query = """
        INSERT INTO activity_time_stamp (operator_id, time_stamp, activity) 
        VALUES (
            (SELECT id FROM operator WHERE op_number = %s), 
            NOW() AT TIME ZONE 'Asia/Bangkok', 
            %s
        )
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (op_number, activity))
        return {'success': True}
    except Exception as e:
        print("Failed to log activity:", e)
        return {'success': False, 'error': str(e)}

# ==========================================
# 1. SELECT & SEARCH
# ==========================================

def get_all_active_children():
    query = """
        SELECT 
            c.hn_number as hn, 
            c.firstname, 
            c.lastname, 
            c.age_text, 
            c.nationality,
            c.sex, 
            c.dob,
            c.address,
            c.born_detail,
            c.born_weight,
            c.weight_now,
            c.height_length,
            c.integrity,
            c.data,
            p.hn_number as hn_parent 
        FROM child c
        LEFT JOIN parent_child pc ON c.id = pc.child_id
        LEFT JOIN parent p ON pc.parent_id = p.id AND p.active_status = '1'
        WHERE c.active_status = '1'
        ORDER BY c.firstname ASC
    """
    try:
        with get_cursor() as cur:
            cur.execute(query)
            return cur.fetchall()
    except Exception as e:
        print(e)
        return []

BASE_SELECT = """
    SELECT 
        c.hn_number as child_hn, c.firstname as child_fname, c.lastname as child_lname, 
        c.age_text as child_age_text, c.nationality as child_nationality, c.sex as child_sex, c.dob as child_dob,
        c.address as child_address, c.born_detail as child_born_detail, c.born_weight as child_born_weight,
        c.weight_now as child_weight_now, c.height_length as child_height_length, c.integrity as child_integrity, c.data as child_data,
        
        p.hn_number as parent_hn, p.firstname as parent_fname, p.lastname as parent_lname, 
        p.age_text as parent_age_text, p.nationality as parent_nationality, p.sex as parent_sex, p.dob as parent_dob,
        p.address as parent_address, p.born_detail as parent_born_detail, p.born_weight as parent_born_weight,
        p.weight_now as parent_weight_now, p.height_length as parent_height_length, p.integrity as parent_integrity, p.data as parent_data,

        (EXISTS (
            SELECT 1 FROM identity_vector_child 
            WHERE child_id = c.id AND active_status = '1'
        )) as child_vector,
        (EXISTS (
            SELECT 1 FROM identity_vector_parent 
            WHERE parent_id = p.id AND active_status = '1'
        )) as parent_vector
"""

def search_multi_criteria(hn, fname, lname):
    q1 = f"""
        {BASE_SELECT} 
        FROM child c 
        LEFT JOIN parent_child pc ON c.id = pc.child_id 
        LEFT JOIN parent p ON pc.parent_id = p.id AND p.active_status = '1'
        WHERE c.active_status = '1' 
        AND (%s = '' OR c.hn_number ILIKE %s) 
        AND (%s = '' OR c.firstname ILIKE %s) 
        AND (%s = '' OR c.lastname ILIKE %s)
    """
    q2 = f"""
        {BASE_SELECT} 
        FROM parent p 
        LEFT JOIN parent_child pc ON p.id = pc.parent_id 
        LEFT JOIN child c ON pc.child_id = c.id AND c.active_status = '1'
        WHERE p.active_status = '1' 
        AND (%s = '' OR p.hn_number ILIKE %s) 
        AND (%s = '' OR p.firstname ILIKE %s) 
        AND (%s = '' OR p.lastname ILIKE %s) 
    """
    try:
        p1 = f"%{hn.strip()}%" if hn.strip() else ''
        p2 = f"%{fname.strip()}%" if fname.strip() else ''
        p3 = f"%{lname.strip()}%" if lname.strip() else ''
        
        final_query = f"{q1} UNION {q2} ORDER BY child_fname ASC"
        
        params = (p1, p1, p2, p2, p3, p3, p1, p1, p2, p2, p3, p3)
        with get_cursor() as cur:
            cur.execute(final_query, params)
            return cur.fetchall()
    except Exception as e:
        print(e)
        return []

def search_by_firstname(firstname):
    q1 = f"""
        {BASE_SELECT}
        FROM child c
        LEFT JOIN parent_child pc ON c.id = pc.child_id 
        LEFT JOIN parent p ON pc.parent_id = p.id AND p.active_status = '1'
        WHERE c.active_status = '1' AND c.firstname ILIKE %s
    """
    q2 = f"""
        {BASE_SELECT}
        FROM parent p
        LEFT JOIN parent_child pc ON p.id = pc.parent_id 
        LEFT JOIN child c ON pc.child_id = c.id AND c.active_status = '1'
        WHERE p.active_status = '1' AND p.firstname ILIKE %s
    """
    try:
        final_query = f"{q1} UNION {q2} ORDER BY child_fname ASC"
        param = f"%{firstname}%"
        with get_cursor() as cur:
            cur.execute(final_query, (param, param))
            return cur.fetchall()
    except Exception as e:
        print(e)
        return []

def search_by_hn(hn):
    q1 = f"""
        {BASE_SELECT}
        FROM child c
        LEFT JOIN parent_child pc ON c.id = pc.child_id 
        LEFT JOIN parent p ON pc.parent_id = p.id AND p.active_status = '1'
        WHERE c.active_status = '1' AND c.hn_number LIKE %s
    """
    q2 = f"""
        {BASE_SELECT}
        FROM parent p
        LEFT JOIN parent_child pc ON p.id = pc.parent_id 
        LEFT JOIN child c ON pc.child_id = c.id AND c.active_status = '1'
        WHERE p.active_status = '1' AND p.hn_number LIKE %s
    """
    try:
        final_query = f"{q1} UNION {q2} ORDER BY child_fname ASC"
        param = f"%{hn}%"
        with get_cursor() as cur:
            cur.execute(final_query, (param, param))
            return cur.fetchall()
    except Exception as e:
        print(e)
        return []

def search_by_lastname(lastname):
    q1 = f"""
        {BASE_SELECT}
        FROM child c
        LEFT JOIN parent_child pc ON c.id = pc.child_id 
        LEFT JOIN parent p ON pc.parent_id = p.id AND p.active_status = '1'
        WHERE c.active_status = '1' AND c.lastname ILIKE %s
    """
    q2 = f"""
        {BASE_SELECT}
        FROM parent p
        LEFT JOIN parent_child pc ON p.id = pc.parent_id 
        LEFT JOIN child c ON pc.child_id = c.id AND c.active_status = '1'
        WHERE p.active_status = '1' AND p.lastname ILIKE %s
    """
    try:
        final_query = f"{q1} UNION {q2} ORDER BY child_fname ASC"
        param = f"%{lastname}%"
        with get_cursor() as cur:
            cur.execute(final_query, (param, param))
            return cur.fetchall()
    except Exception as e:
        print(e)
        return []

# ==========================================
# 2. INSERT ENTITIES
# ==========================================

def insert_child(data, op_number):
    query = """
        INSERT INTO child (
            hn_number, firstname, lastname, age_text, dob, sex, nationality, active_status,
            address, born_detail, born_weight, weight_now, height_length, integrity, data
        ) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, '1', %s, %s, %s, %s, %s, %s, %s)
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (
                data['hn'], data['firstname'], data['lastname'], data['age_text'], data['dob'], data['sex'], data['nationality'],
                data.get('address'), data.get('born_detail'), data.get('born_weight'), data.get('weight_now'),
                data.get('height_length'), data.get('integrity'), data.get('data')
            ))
        log_activity(op_number, f"Registered Child HN: {data['hn']}")
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def insert_parent(data, op_number):
    query = """
        INSERT INTO parent (
            hn_number, firstname, lastname, age_text, dob, sex, nationality, active_status,
            address, born_detail, born_weight, weight_now, height_length, integrity, data
        ) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, '1', %s, %s, %s, %s, %s, %s, %s)
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (
                data['hn'], data['firstname'], data['lastname'], data['age_text'], data['dob'], data['sex'], data['nationality'],
                data.get('address'), data.get('born_detail'), data.get('born_weight'), data.get('weight_now'),
                data.get('height_length'), data.get('integrity'), data.get('data')
            ))
        log_activity(op_number, f"Registered Parent HN: {data['hn']}")
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def insert_operator(data):
    secure_pass = hash_password(data['password'])
    query = """
        INSERT INTO operator (op_number, firstname, lastname, username, password, role) 
        VALUES (%s, %s, %s, %s, %s, 'user')
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (data['op_number'], data['firstname'], data['lastname'], data['username'], secure_pass))
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

# ==========================================
# 3. LINKING
# ==========================================

def link_parent_child(parent_hn, child_hn):
    query = """
        INSERT INTO parent_child (parent_id, child_id) 
        VALUES (
            (SELECT id FROM parent WHERE hn_number = %s),
            (SELECT id FROM child WHERE hn_number = %s)
        )
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (parent_hn, child_hn))
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def unlink_parent_child(parent_hn, child_hn, op_number):
    query = """
        DELETE FROM parent_child 
        WHERE parent_id = (SELECT id FROM parent WHERE hn_number = %s)
        AND child_id = (SELECT id FROM child WHERE hn_number = %s)
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (parent_hn, child_hn))
            if cur.rowcount == 0:
                return {'success': False, 'message': "Relation link not found."}
        log_activity(op_number, f"Unlinked Parent {parent_hn} and Child {child_hn}")
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def link_operator_child(op_number, child_hn):
    query = """
        INSERT INTO operator_child (operator_id, child_id) 
        VALUES (
            (SELECT id FROM operator WHERE op_number = %s),
            (SELECT id FROM child WHERE hn_number = %s)
        )
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (op_number, child_hn))
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def link_operator_parent(op_number, parent_hn):
    query = """
        INSERT INTO operator_parent (operator_id, parent_id) 
        VALUES (
            (SELECT id FROM operator WHERE op_number = %s),
            (SELECT id FROM parent WHERE hn_number = %s)
        )
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (op_number, parent_hn))
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

# ==========================================
# 4. VECTORS
# ==========================================

def insert_child_vectors(hn, v1, v2, v3, path, op_number):
    query = """
        INSERT INTO identity_vector_child (child_id, vector_1, vector_2, vector_3, path_folder, active_status)
        VALUES (
            (SELECT id FROM child WHERE hn_number = %s), 
            %s, %s, %s, %s, '1'
        )
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (hn, json.dumps(v1), json.dumps(v2), json.dumps(v3), path))
        link_operator_child(op_number, hn)
        log_activity(op_number, f"Updated Vectors for Child HN: {hn}")
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def insert_parent_vectors(hn, v1, v2, v3, path, op_number):
    query = """
        INSERT INTO identity_vector_parent (parent_id, vector_1, vector_2, vector_3, path_folder, active_status)
        VALUES (
            (SELECT id FROM parent WHERE hn_number = %s), 
            %s, %s, %s, %s, '1'
        )
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (hn, json.dumps(v1), json.dumps(v2), json.dumps(v3), path))
        link_operator_parent(op_number, hn)
        log_activity(op_number, f"Updated Vectors for Parent HN: {hn}")
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

# ==========================================
# 5. DELETE / STATUS
# ==========================================

def deactivate_child(hn, op_number):
    try:
        with get_cursor() as cur:
            cur.execute("UPDATE child SET active_status = '0' WHERE hn_number = %s AND active_status = '1'", (hn,))
            if cur.rowcount == 0:
                return {'success': False, 'message': f"HN {hn} not found or already deactivated."}

            cur.execute("""
                UPDATE identity_vector_child SET active_status = '0' 
                WHERE child_id = (SELECT id FROM child WHERE hn_number = %s)
            """, (hn,))

        log_activity(op_number, f"Soft Deleted Child HN: {hn}")
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def deactivate_parent(hn, op_number):
    try:
        with get_cursor() as cur:
            cur.execute("UPDATE parent SET active_status = '0' WHERE hn_number = %s AND active_status = '1'", (hn,))
            if cur.rowcount == 0:
                return {'success': False, 'message': f"HN {hn} not found or already deactivated."}

            cur.execute("""
                UPDATE identity_vector_parent SET active_status = '0' 
                WHERE parent_id = (SELECT id FROM parent WHERE hn_number = %s)
            """, (hn,))

        log_activity(op_number, f"Soft Deleted Parent HN: {hn}")
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def hard_delete_child(hn, op_number):
    try:
        with get_cursor() as cur:
            cur.execute("DELETE FROM child WHERE hn_number = %s", (hn,))
            if cur.rowcount == 0:
                return {'success': False, 'message': f"HN {hn} not found."}
        
        log_activity(op_number, f"Hard Deleted Child HN: {hn}")
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}

def hard_delete_parent(hn, op_number):
    try:
        with get_cursor() as cur:
            cur.execute("DELETE FROM parent WHERE hn_number = %s", (hn,))
            if cur.rowcount == 0:
                return {'success': False, 'message': f"HN {hn} not found."}
        
        log_activity(op_number, f"Hard Deleted Parent HN: {hn}")
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}

# ==========================================
# 6. LOGIN
# ==========================================

def login_operator(username, password):
    if not _connection:
        connect_as('gatekeeper')
    
    print(f"🔐 [DB] Checking credentials for: {username}")
    hashed_password = hash_password(password)
    query = "SELECT op_number, username FROM operator WHERE username = %s AND password = %s"
    
    try:
        with get_cursor() as cur:
            cur.execute(query, (username, hashed_password))
            row = cur.fetchone()
            if row:
                op_number = row['op_number']
                determined_role = 'admin' if row['username'] == 'admin' else 'user'
                
                connect_as(determined_role)
                log_activity(op_number, f"Operator {username} Logged In")
                
                return {'success': True, 'op_number': op_number, 'role': determined_role}
        return {'success': False, 'message': "Invalid credentials"}
    except Exception as e:
        print("❌ [DB] LOGIN QUERY CRASHED:", str(e))
        return {'success': False, 'error': str(e)}

# ==========================================
# 7. VECTOR SEARCH
# ==========================================

def find_closest_child(vector, op_number):
    vector_str = json.dumps(vector)
    query = """
        SELECT 
            c.hn_number as hn, 
            LEAST(
                iv.vector_1 <=> %s,
                iv.vector_2 <=> %s,
                iv.vector_3 <=> %s
            ) as distance
        FROM identity_vector_child iv
        JOIN child c ON iv.child_id = c.id
        WHERE iv.active_status = '1'
        AND LEAST(iv.vector_1 <=> %s, iv.vector_2 <=> %s, iv.vector_3 <=> %s) < 0.2
        ORDER BY distance ASC
        LIMIT 1;
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (vector_str, vector_str, vector_str, vector_str, vector_str, vector_str))
            row = cur.fetchone()
            if row:
                log_activity(op_number, f"Identify child got {row['hn']}")
                return row
        return None
    except Exception as e:
        print("❌ [DB] Child Vector Search Failed:", str(e))
        return None

def find_closest_parent(vector, op_number):
    vector_str = json.dumps(vector)
    query = """
        SELECT 
            p.hn_number as hn,
            LEAST(
                iv.vector_1 <=> %s,
                iv.vector_2 <=> %s,
                iv.vector_3 <=> %s
            ) as distance
        FROM identity_vector_parent iv
        JOIN parent p ON iv.parent_id = p.id
        WHERE iv.active_status = '1'
        AND LEAST(iv.vector_1 <=> %s, iv.vector_2 <=> %s, iv.vector_3 <=> %s) < 0.2
        ORDER BY distance ASC
        LIMIT 1;
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (vector_str, vector_str, vector_str, vector_str, vector_str, vector_str))
            row = cur.fetchone()
            if row:
                log_activity(op_number, f"Identify parent got {row['hn']}")
                return row
        return None
    except Exception as e:
        print("❌ [DB] Parent Vector Search Failed:", str(e))
        return None

# ==========================================
# 8. UPDATE ENTITIES
# ==========================================

def update_child(hn, data, op_number):
    query = """
        UPDATE child 
        SET firstname = %s, lastname = %s, age_text = %s, dob = %s, sex = %s, nationality = %s,
            address = %s, born_detail = %s, born_weight = %s, weight_now = %s, 
            height_length = %s, integrity = %s, data = %s
        WHERE hn_number = %s AND active_status = '1'
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (
                data['firstname'], data['lastname'], data['age_text'], data['dob'], data['sex'], data['nationality'],
                data.get('address'), data.get('born_detail'), data.get('born_weight'), data.get('weight_now'),
                data.get('height_length'), data.get('integrity'), data.get('data'),
                hn
            ))
            if cur.rowcount == 0:
                return {'success': False, 'message': f"Update failed: Child HN {hn} not found or inactive."}
        log_activity(op_number, f"Updated Info for Child HN: {hn}")
        return {'success': True}
    except Exception as e:
        print("❌ [DB] Update Child Failed:", str(e))
        return {'success': False, 'error': str(e)}

def update_parent(hn, data, op_number):
    query = """
        UPDATE parent 
        SET firstname = %s, lastname = %s, age_text = %s, dob = %s, sex = %s, nationality = %s,
            address = %s, born_detail = %s, born_weight = %s, weight_now = %s, 
            height_length = %s, integrity = %s, data = %s
        WHERE hn_number = %s AND active_status = '1'
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (
                data['firstname'], data['lastname'], data['age_text'], data['dob'], data['sex'], data['nationality'],
                data.get('address'), data.get('born_detail'), data.get('born_weight'), data.get('weight_now'),
                data.get('height_length'), data.get('integrity'), data.get('data'),
                hn
            ))
            if cur.rowcount == 0:
                return {'success': False, 'message': f"Update failed: Parent HN {hn} not found or inactive."}
        log_activity(op_number, f"Updated Info for Parent HN: {hn}")
        return {'success': True}
    except Exception as e:
        print("❌ [DB] Update Parent Failed:", str(e))
        return {'success': False, 'error': str(e)}

# ==========================================
# 9. SELECT SINGLE BY HN
# ==========================================

def get_child_by_hn(hn):
    query = """
        SELECT hn_number, firstname, lastname, age_text, dob, sex, nationality,
               address, born_detail, born_weight, weight_now, height_length, integrity, data
        FROM child 
        WHERE hn_number = %s AND active_status = '1'
        LIMIT 1
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (hn,))
            return cur.fetchone()
    except Exception as e:
        print("❌ [DB] Get Child By HN Failed:", str(e))
        return None

def get_parent_by_hn(hn):
    query = """
        SELECT hn_number, firstname, lastname, age_text, dob, sex, nationality,
               address, born_detail, born_weight, weight_now, height_length, integrity, data
        FROM parent 
        WHERE hn_number = %s AND active_status = '1'
        LIMIT 1
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (hn,))
            return cur.fetchone()
    except Exception as e:
        print("❌ [DB] Get Parent By HN Failed:", str(e))
        return None

# ==========================================
# CHECK VECTOR EXISTENCE
# ==========================================

def check_child_vector_exists(hn):
    query = """
        SELECT EXISTS (
            SELECT 1 
            FROM identity_vector_child 
            WHERE child_id = (SELECT id FROM child WHERE hn_number = %s)
            AND active_status = '1'
        ) as "exists";
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (hn,))
            row = cur.fetchone()
            return row['exists'] if row else False
    except Exception as e:
        print("❌ [DB] Check Child Vector Failed:", str(e))
        return False

def check_parent_vector_exists(hn):
    query = """
        SELECT EXISTS (
            SELECT 1 
            FROM identity_vector_parent 
            WHERE parent_id = (SELECT id FROM parent WHERE hn_number = %s)
            AND active_status = '1'
        ) as "exists";
    """
    try:
        with get_cursor() as cur:
            cur.execute(query, (hn,))
            row = cur.fetchone()
            return row['exists'] if row else False
    except Exception as e:
        print("❌ [DB] Check Parent Vector Failed:", str(e))
        return False

# ==========================================
# LOG ACTIVITY 
# ==========================================

def get_activity_logs(ordering='DESC'):
    query = f"""
        SELECT 
        activity_time_stamp.activity, 
        activity_time_stamp.time_stamp, 
        operator.firstname, 
        operator.lastname, 
        operator.username 
        FROM activity_time_stamp 
        JOIN operator ON activity_time_stamp.operator_id = operator.id
        ORDER BY time_stamp {ordering};
    """
    try:
        with get_cursor() as cur:
            cur.execute(query)
            return cur.fetchall()
    except Exception as e:
        print("Failed to fetch activity logs:", e)
        return []
