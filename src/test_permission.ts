// src/test_permissions.ts
import * as db from './database';

export const runPermissionTests = async () => {
    console.log("\n🕵️ --- STARTING PERMISSION SECURITY AUDIT ---");

    // --- SETUP: Create a dummy record to play with ---
    // We need to be an Admin or Gatekeeper first to set up the test data reliably, 
    // or just assume our initial connection (gatekeeper) can't do it, so we login as admin first.

    // =========================================================================
    // TEST 1: NORMAL USER (Bob) -> TRY TO DELETE (SHOULD FAIL)
    // =========================================================================
    console.log("\n🧪 TEST 1: Logging in as User 'alice_staff'...");
    
    // 1. Login as Bob (Role: 'user')
    // Make sure you created Bob in your DB: 
    // INSERT INTO operator (op_number, username, password, role) VALUES ('OP-002', 'bob_staff', '1234', 'user');
    const userLogin = await db.loginOperator('alice_admin', 'securepass1'); 
    
    if (userLogin.success) {
        console.log(`   Logged in as: ${userLogin.role}`);

        // 2. Try to DELETE (This is the Hard Delete query)
        console.log("   🛑 Attempting UNAUTHORIZED Delete...");
        try {
            // We have to access the client directly or make a specific delete function for testing
            // Since we don't have a delete function in db file yet, let's pretend or create a temp one
            // Ideally, you add a 'hardDeleteChild' function to database.ts just for this test, 
            // or we use a raw query if we export 'client' (which we usually don't for safety).
            
            // Let's assume you added this helper function to database.ts temporarily:
            // export const hardDeleteChild = async (hn: string) => client.query("DELETE FROM child WHERE hn_number = $1", [hn]);
            
            await db.hardDeleteChild('C-TEST-01');
            
            console.error("   ❌ SECURITY FAILURE: User was able to DELETE! Permissions are wrong.");
        } catch (error: any) {
            // We EXPECT an error here!
            if (error.message.includes('permission denied')) {
                console.log("   ✅ SUCCESS: Delete blocked! Postgres said: 'permission denied'");
            } else {
                console.log("   ⚠️ Unexpected error:", error.message);
            }
        }
    } else {
        console.log("   ⚠️ Could not login as Bob. Did you add him to the operator table?");
    }

    // =========================================================================
    // TEST 2: ADMIN (System) -> TRY TO DELETE (SHOULD PASS)
    // =========================================================================
    console.log("\n🧪 TEST 2: Logging in as Admin 'admin'...");
    
    await db.loginOperator('admin', 'admin888');
    console.log("   Logged in as: admin");

    console.log("   🚀 Attempting AUTHORIZED Delete...");
    try {
        await db.hardDeleteChild('C-TEST-01');
        console.log("   ✅ SUCCESS: Admin successfully deleted the record.");
    } catch (error: any) {
        console.error("   ❌ FAILURE: Admin could not delete:", error.message);
    }

    console.log("\n🏁 --- AUDIT COMPLETE ---");
};