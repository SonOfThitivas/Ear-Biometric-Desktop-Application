// src/test_db.ts
import * as db from './database';

// Helper to create a dummy vector
const mockVector = () => Array(128).fill(0).map(() => Math.random());

export const runDatabaseTests = async () => {
    console.log("🧪 --- STARTING DATABASE TESTS ---");

    try {

        // --- QUERY TESTS ---

        // 7. Select All Active Children (Test 1)
        console.log("Test 1: Fetching All Active Children...");
        const children = await db.getAllActiveChildren();
        console.log(`Found ${children.length} children`);

        // 8. Search by Firstname (Test 2)
        console.log("Test 2: Search Join by Firstname 'Baby'...");
        const nameSearch = await db.searchByFirstname('Evan');
        console.log("Search Result:", nameSearch);

        // 9. Search by HN (Test 3)
        console.log("Test 3: Search Join by HN 'C-TEST-01'...");
        const hnSearch = await db.searchByHN('C-001');
        console.log("Search Result:", hnSearch);


        console.log("✅ --- ALL TESTS COMPLETED SUCCESSFULLY ---");

    } catch (error) {
        console.error("❌ TEST FAILED:", error);
    }
};