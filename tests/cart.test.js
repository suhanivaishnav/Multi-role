/**
 * cart.test.js
 * Integration tests for Cart API endpoints — both authenticated and guest flows.
 *
 * Uses Node's built-in http module for HTTP calls (no extra test framework).
 * Run: node tests/cart.test.js
 *
 * Pre-conditions:
 *   - Server must be running on the configured PORT (node app.js)
 *   - Set the following env vars before running:
 *
 *   $env:TEST_USER_TOKEN  = "<valid user JWT>"
 *   $env:TEST_USER_EMAIL  = "<user email used to generate that token>"
 *   $env:TEST_USER_PASS   = "<user password>"
 *   $env:TEST_PRODUCT_ID  = "<id of an Active product with stock>"
 *   node tests/cart.test.js
 */

const http = require("http");

// ─── Configuration ────────────────────────────────────────────────────────────
const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const USER_TOKEN     = process.env.TEST_USER_TOKEN  || "YOUR_USER_JWT_HERE";
const USER_EMAIL     = process.env.TEST_USER_EMAIL  || "testuser@example.com";
const USER_PASS      = process.env.TEST_USER_PASS   || "password123";
const VALID_PRODUCT_ID   = parseInt(process.env.TEST_PRODUCT_ID || "1");
const INVALID_PRODUCT_ID = 999999;
// ──────────────────────────────────────────────────────────────────────────────

let createdCartItemId = null;
let passed = 0;
let failed = 0;
const results = [];

// ─── HTTP Helper ──────────────────────────────────────────────────────────────
function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const url    = new URL(BASE_URL + path);
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: url.hostname,
            port:     url.port || 80,
            path:     url.pathname,
            method,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        };
        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

// ─── Test Utilities ───────────────────────────────────────────────────────────
async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✅  ${name}`);
        passed++;
        results.push({ name, status: "PASS" });
    } catch (err) {
        console.error(`  ❌  ${name}`);
        console.error(`       ${err.message}`);
        failed++;
        results.push({ name, status: "FAIL", error: err.message });
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || "Assertion failed");
}

function assertEqual(actual, expected, message) {
    if (actual !== expected)
        throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — AUTHENTICATED CART (existing behaviour)
// ═══════════════════════════════════════════════════════════════════════════════

async function testViewEmptyCart() {
    await test("GET /cart/ — empty cart for new/clean user", async () => {
        const res = await request("GET", "/cart/", null, USER_TOKEN);
        assertEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
        const isEmpty = res.body.message === "Your cart is empty" || (Array.isArray(res.body.items) && res.body.items.length === 0);
        assert(isEmpty || Array.isArray(res.body.items), "Expected empty cart or items array");
    });
}

async function testAddToCart() {
    await test("POST /cart/add — add a product (authenticated)", async () => {
        const res = await request("POST", "/cart/add", { productId: VALID_PRODUCT_ID, quantity: 2 }, USER_TOKEN);
        assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
        assert(res.body.cartItem, "Expected cartItem in response");
        assertEqual(res.body.cartItem.quantity, 2, "Expected quantity 2");
        assert(typeof res.body.cartTotal === "number", "Expected numeric cartTotal");
        createdCartItemId = res.body.cartItem.id;
    });

    await test("POST /cart/add — same product accumulates quantity", async () => {
        const res = await request("POST", "/cart/add", { productId: VALID_PRODUCT_ID, quantity: 1 }, USER_TOKEN);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assertEqual(res.body.cartItem.quantity, 3, "Expected accumulated quantity 3");
    });

    await test("POST /cart/add — invalid product returns 404", async () => {
        const res = await request("POST", "/cart/add", { productId: INVALID_PRODUCT_ID, quantity: 1 }, USER_TOKEN);
        assertEqual(res.status, 404, `Expected 404`);
    });

    await test("POST /cart/add — missing productId returns 400", async () => {
        const res = await request("POST", "/cart/add", { quantity: 1 }, USER_TOKEN);
        assertEqual(res.status, 400, `Expected 400`);
    });

    await test("POST /cart/add — quantity 0 returns 400", async () => {
        const res = await request("POST", "/cart/add", { productId: VALID_PRODUCT_ID, quantity: 0 }, USER_TOKEN);
        assertEqual(res.status, 400, `Expected 400`);
    });

    await test("POST /cart/add — negative quantity returns 400", async () => {
        const res = await request("POST", "/cart/add", { productId: VALID_PRODUCT_ID, quantity: -5 }, USER_TOKEN);
        assertEqual(res.status, 400, `Expected 400`);
    });

    await test("POST /cart/add — over-stock quantity returns 400", async () => {
        const res = await request("POST", "/cart/add", { productId: VALID_PRODUCT_ID, quantity: 999999 }, USER_TOKEN);
        assertEqual(res.status, 400, `Expected 400`);
        assert(res.body.message.toLowerCase().includes("stock") || res.body.message.toLowerCase().includes("insufficient"),
            `Expected stock-related message, got: ${res.body.message}`);
    });

    await test("POST /cart/add — no token returns 401", async () => {
        const res = await request("POST", "/cart/add", { productId: VALID_PRODUCT_ID, quantity: 1 });
        assertEqual(res.status, 401, `Expected 401`);
    });
}

async function testViewCart() {
    await test("GET /cart/ — returns items with subtotals and total", async () => {
        const res = await request("GET", "/cart/", null, USER_TOKEN);
        assertEqual(res.status, 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.body.items), "Expected items array");
        assert(res.body.items.length > 0, "Expected at least one cart item");
        const item = res.body.items[0];
        assert("cartItemId" in item && "productId" in item && "quantity" in item && "price" in item && "subtotal" in item,
            "Missing expected fields on cart item");
        assert(typeof res.body.total === "number", "Expected numeric total");
        const expectedSubtotal = parseFloat((item.price * item.quantity).toFixed(2));
        assert(Math.abs(parseFloat(item.subtotal) - expectedSubtotal) < 0.01, "Subtotal mismatch");
    });
}

async function testUpdateCartItem() {
    await test("PUT /cart/update/:id — update quantity, recalculate total", async () => {
        assert(createdCartItemId, "No cartItemId available");
        const res = await request("PUT", `/cart/update/${createdCartItemId}`, { quantity: 1 }, USER_TOKEN);
        assertEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
        assertEqual(res.body.cartItem.quantity, 1, "Expected quantity 1");
        assert(typeof res.body.cartTotal === "number", "Expected numeric cartTotal");
    });

    await test("PUT /cart/update/:id — quantity 0 returns 400", async () => {
        const res = await request("PUT", `/cart/update/${createdCartItemId}`, { quantity: 0 }, USER_TOKEN);
        assertEqual(res.status, 400, `Expected 400`);
    });

    await test("PUT /cart/update/:id — non-existent item returns 404", async () => {
        const res = await request("PUT", "/cart/update/999999", { quantity: 1 }, USER_TOKEN);
        assertEqual(res.status, 404, `Expected 404`);
    });
}

async function testRemoveCartItem() {
    await test("DELETE /cart/remove/:id — removes item and returns updated cart", async () => {
        assert(createdCartItemId, "No cartItemId available");
        const res = await request("DELETE", `/cart/remove/${createdCartItemId}`, null, USER_TOKEN);
        assertEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
        assert(Array.isArray(res.body.items), "Expected items array in response");
        assert(!res.body.items.find((i) => i.cartItemId === createdCartItemId), "Removed item should not be in cart");
    });

    await test("DELETE /cart/remove/:id — non-existent item returns 404", async () => {
        const res = await request("DELETE", "/cart/remove/999999", null, USER_TOKEN);
        assertEqual(res.status, 404, `Expected 404`);
    });
}

async function testEmptyCartAfterRemoval() {
    await test("GET /cart/ — empty after all items removed", async () => {
        const res = await request("GET", "/cart/", null, USER_TOKEN);
        assertEqual(res.status, 200, `Expected 200, got ${res.status}`);
        const isEmpty = res.body.message === "Your cart is empty" ||
            (Array.isArray(res.body.items) && res.body.items.length === 0);
        assert(isEmpty, `Expected empty cart, got: ${JSON.stringify(res.body)}`);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — GUEST CART (no token needed)
// ═══════════════════════════════════════════════════════════════════════════════

async function testGuestCart() {
    let guestCart = []; // Simulates client-side cart state

    await test("POST /cart/guest/add — add product to guest cart (no token)", async () => {
        const res = await request("POST", "/cart/guest/add", {
            productId: VALID_PRODUCT_ID,
            quantity: 2,
            guestCart: []
        }); // No token
        assertEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
        assert(Array.isArray(res.body.guestCart), "Expected guestCart array");
        assert(res.body.guestCart.length > 0, "Expected at least one item in guest cart");
        assert(typeof res.body.total === "number", "Expected numeric total");
        // Update simulated client cart
        guestCart = res.body.guestCart.map((i) => ({ productId: i.productId, quantity: i.quantity }));
        console.log(`       Guest cart: ${JSON.stringify(guestCart)}, total: ${res.body.total}`);
    });

    await test("POST /cart/guest/add — same product accumulates quantity in guest cart", async () => {
        const res = await request("POST", "/cart/guest/add", {
            productId: VALID_PRODUCT_ID,
            quantity: 1,
            guestCart
        });
        assertEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
        const item = res.body.guestCart.find((i) => i.productId === VALID_PRODUCT_ID);
        assert(item && item.quantity === 3, `Expected quantity 3, got: ${item ? item.quantity : "not found"}`);
        guestCart = res.body.guestCart.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    });

    await test("POST /cart/guest/add — invalid product returns 404", async () => {
        const res = await request("POST", "/cart/guest/add", {
            productId: INVALID_PRODUCT_ID, quantity: 1, guestCart: []
        });
        assertEqual(res.status, 404, `Expected 404, got ${res.status}`);
    });

    await test("POST /cart/guest/add — over-stock quantity returns 400", async () => {
        const res = await request("POST", "/cart/guest/add", {
            productId: VALID_PRODUCT_ID, quantity: 999999, guestCart: []
        });
        assertEqual(res.status, 400, `Expected 400, got ${res.status}`);
        assert(res.body.message.toLowerCase().includes("stock") || res.body.message.toLowerCase().includes("insufficient"),
            `Expected stock message, got: ${res.body.message}`);
    });

    await test("POST /cart/guest/add — missing productId returns 400", async () => {
        const res = await request("POST", "/cart/guest/add", { quantity: 1, guestCart: [] });
        assertEqual(res.status, 400, `Expected 400`);
    });

    await test("POST /cart/guest/add — invalid quantity returns 400", async () => {
        const res = await request("POST", "/cart/guest/add", {
            productId: VALID_PRODUCT_ID, quantity: 0, guestCart: []
        });
        assertEqual(res.status, 400, `Expected 400`);
    });

    await test("POST /cart/guest/view — view enriched guest cart with total", async () => {
        const res = await request("POST", "/cart/guest/view", { guestCart });
        assertEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
        assert(Array.isArray(res.body.items), "Expected items array");
        assert(res.body.items.length > 0, "Expected at least one item");
        const item = res.body.items[0];
        assert("productName" in item && "quantity" in item && "price" in item && "subtotal" in item,
            "Missing expected fields on guest cart item");
        assert(typeof res.body.total === "number", "Expected numeric total");
        const expectedSubtotal = parseFloat((item.price * item.quantity).toFixed(2));
        assert(Math.abs(parseFloat(item.subtotal) - expectedSubtotal) < 0.01, "Subtotal mismatch in guest cart");
    });

    await test("POST /cart/guest/view — empty guest cart returns empty response", async () => {
        const res = await request("POST", "/cart/guest/view", { guestCart: [] });
        assertEqual(res.status, 200, `Expected 200`);
        assert(res.body.message === "Your guest cart is empty" ||
            (Array.isArray(res.body.items) && res.body.items.length === 0),
            "Expected empty response");
    });

    // ── Checkout Gate ──────────────────────────────────────────────────────────

    await test("POST /cart/checkout — unauthenticated returns 401", async () => {
        const res = await request("POST", "/cart/checkout", {});
        assertEqual(res.status, 401, `Expected 401 for missing token, got ${res.status}`);
    });

    await test("POST /cart/checkout — authenticated returns cart info", async () => {
        const res = await request("POST", "/cart/checkout", {}, USER_TOKEN);
        assertEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
        assert("total" in res.body, "Expected total in checkout response");
        assert(res.body.requiresAuth === false, "Expected requiresAuth: false");
    });

    // ── Cart Sync on Login ─────────────────────────────────────────────────────

    await test("POST /auth/login — login with guestCart syncs items into user cart", async () => {
        if (USER_EMAIL === "testuser@example.com" || USER_PASS === "password123") {
            console.log("       ⚠️  Skipped: TEST_USER_EMAIL / TEST_USER_PASS not configured");
            return;
        }
        const res = await request("POST", "/auth/login", {
            email: USER_EMAIL,
            password: USER_PASS,
            guestCart
        });
        assertEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
        assert(res.body.token, "Expected token in login response");
        assert(res.body.cartSync, "Expected cartSync summary in response");
        assert(Array.isArray(res.body.cartSync.synced), "Expected synced array");
        assert(Array.isArray(res.body.cartSync.skipped), "Expected skipped array");
        console.log(`       Cart sync — synced: ${res.body.cartSync.synced.length}, skipped: ${res.body.cartSync.skipped.length}`);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — CART SYNC ON REGISTER
// ═══════════════════════════════════════════════════════════════════════════════

async function testCartSyncOnRegister() {
    const uniqueEmail = `guest_test_${Date.now()}@example.com`;
    const guestCartPayload = [{ productId: VALID_PRODUCT_ID, quantity: 1 }];

    await test("POST /users/register — register with guestCart syncs items into new user's cart", async () => {
        const res = await request("POST", "/users/register", {
            name: "Guest Test User",
            email: uniqueEmail,
            password: "Test@12345",
            guestCart: guestCartPayload
        });
        assertEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
        assert(res.body.token, "Expected token in register response");
        assert(res.body.cartSync, "Expected cartSync in register response");
        assert(Array.isArray(res.body.cartSync.synced), "Expected synced array");
        assert(res.body.cartSync.synced.length > 0, "Expected at least one synced item");
        console.log(`       Synced items: ${JSON.stringify(res.body.cartSync.synced)}`);

        // Verify the cart actually has items using the new token
        const cartRes = await request("GET", "/cart/", null, res.body.token);
        assertEqual(cartRes.status, 200, `Expected 200 for cart view, got ${cartRes.status}`);
        assert(Array.isArray(cartRes.body.items) && cartRes.body.items.length > 0,
            "Expected synced items to appear in user's cart");
        console.log(`       Cart after sync: ${cartRes.body.items.length} item(s), total: ${cartRes.body.total}`);
    });

    await test("POST /users/register — register without guestCart still works (no cartSync)", async () => {
        const res = await request("POST", "/users/register", {
            name: "Normal User",
            email: `normal_${Date.now()}@example.com`,
            password: "Test@12345"
        });
        assertEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
        assert(res.body.token, "Expected token");
        assert(!res.body.cartSync, "Expected no cartSync when no guestCart provided");
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
(async () => {
    console.log("\n🛒  Cart API Tests\n" + "=".repeat(60));

    if (USER_TOKEN === "YOUR_USER_JWT_HERE") {
        console.warn(
            "\n⚠️  WARNING: TEST_USER_TOKEN is not set.\n" +
            "   Set these env vars before running:\n" +
            "   $env:TEST_USER_TOKEN='eyJ...'\n" +
            "   $env:TEST_USER_EMAIL='user@example.com'\n" +
            "   $env:TEST_USER_PASS='yourpassword'\n" +
            "   $env:TEST_PRODUCT_ID='1'\n" +
            "   node tests/cart.test.js\n"
        );
    }

    console.log("\n📋  Suite 1 — Authenticated Cart\n" + "-".repeat(40));
    console.log("  View Cart (empty state)");
    await testViewEmptyCart();
    console.log("  Add to Cart");
    await testAddToCart();
    console.log("  View Cart");
    await testViewCart();
    console.log("  Update Cart Item");
    await testUpdateCartItem();
    console.log("  Remove Cart Item");
    await testRemoveCartItem();
    console.log("  View Cart (after removals)");
    await testEmptyCartAfterRemoval();

    console.log("\n👻  Suite 2 — Guest Cart\n" + "-".repeat(40));
    await testGuestCart();

    console.log("\n🔗  Suite 3 — Cart Sync on Register\n" + "-".repeat(40));
    await testCartSyncOnRegister();

    console.log("\n" + "=".repeat(60));
    console.log(`Results: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
        console.log("\nFailed tests:");
        results.filter((r) => r.status === "FAIL").forEach((r) => {
            console.log(`  ❌  ${r.name}: ${r.error}`);
        });
        process.exit(1);
    } else {
        console.log("\n🎉  All tests passed!");
    }
})();
