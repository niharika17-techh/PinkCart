/**
 * Pink Cart backend (Express + MongoDB + JWT)
 * - GET /products -> product list
 * - POST /order -> accept order data
 * - POST /auth/register -> create user (MongoDB)
 * - POST /auth/login -> return JWT token
 * - GET /auth/me -> return logged-in user info
 * - GET /wishlist -> protected wishlist items (MongoDB)
 * - POST /wishlist/toggle -> protected add/remove wishlist item
 */

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// Backend API URL is called from a static frontend. Allow Authorization header.
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON request bodies
app.use(express.json());

// Simple in-memory product list (no database required)
// Images are free Unsplash photos (direct `images.unsplash.com` URLs).
const products = [
  {
    id: "lipstick-rose",
    name: "Rose Kiss Lipstick",
    price: 4200,
    description: "Creamy, long-lasting color with a soft rose-glow finish.",
    image:
      "https://images.unsplash.com/photo-1729016723300-7146ce87dfaf?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "foundation-velvet",
    name: "Velvet Glow Foundation",
    price: 7200,
    description: "Full-coverage velvet-matte look that feels lightweight on skin.",
    image: "https://images.unsplash.com/photo-1632038559953-abd80bed8966?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "Blush",
    name: "Feather Blush",
    price: 2600,
    description: "Feather-light blush for a natural.",
    image:
      "https://images.unsplash.com/photo-1515688594390-b649af70d282?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "mascara-black",
    name: "Jet Black Mascara",
    price: 3000,
    description: "Instant volume and length for bold, fluttery lashes.",
    image:
      "https://images.unsplash.com/photo-1512207159096-c2c91b1dfadd?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "powder-compact",
    name: "Silk Matte Compact Powder",
    price: 3400,
    description: "Silky matte finish that helps set makeup and control shine.",
    image:
      "https://images.unsplash.com/photo-1512207037870-c006a7631ae0?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

const productById = new Map(products.map((p) => [p.id, p]));

// --- MongoDB setup ---
const mongoUrl = "mongodb+srv://niharika_mongodb:pinkcart2026@cluster0.r5ivql4.mongodb.net/pink_cart_db?retryWrites=true&w=majority";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// We'll connect once at startup. If Mongo isn't running, we keep the server alive,
// but auth/wishlist endpoints will return a clear error.
const mongoClient = new MongoClient(mongoUrl, {
  serverSelectionTimeoutMS: 5000,
});

let db = null;
let usersCollection = null;

async function initMongo() {
  try {
    await mongoClient.connect();
    db = mongoClient.db();
    usersCollection = db.collection("users");

    // Make sure email is unique.
    await usersCollection.createIndex({ email: 1 }, { unique: true });

    console.log("MongoDB connected successfully.");
    return true;
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    return false;
  }
}

function requireDb(res) {
  if (!db || !usersCollection) {
    res.status(503).json({ message: "MongoDB is not connected. Start MongoDB and try again." });
    return false;
  }
  return true;
}

// --- JWT auth middleware ---
function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing Authorization token." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { userId, email, iat, exp }
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid/expired token." });
  }
}

// GET /products -> return product list
app.get("/products", (req, res) => {
  res.json(products);
});

// POST /order -> accept order data
app.post("/order", (req, res) => {
  const order = req.body || {};

  // Create a simple order id (no real payment processing in this demo)
  const orderId = Math.random().toString(36).slice(2, 10).toUpperCase();

  // For a real app, you would validate inputs and store the order.
  console.log("New order received:", JSON.stringify(order, null, 2));

  res.json({
    message: "Order received",
    orderId,
  });
});

// --- Auth endpoints ---
// POST /auth/register -> { email, password }
app.post("/auth/register", async (req, res) => {
  if (!requireDb(res)) return;

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const existing = await usersCollection.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userDoc = {
      email: normalizedEmail,
      passwordHash,
      wishlistProductIds: [],
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(userDoc);

    return res.json({
      message: "Account created successfully",
      userId: result.insertedId.toString(),
    });
  } catch (err) {
    console.error("Register error:", err.message);
    return res.status(500).json({ message: "Registration failed." });
  }
});

// POST /auth/login -> { email, password } => { token }
app.post("/auth/login", async (req, res) => {
  if (!requireDb(res)) return;

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const user = await usersCollection.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ message: "Login failed." });
  }
});

// GET /auth/me -> token user info
app.get("/auth/me", authRequired, async (req, res) => {
  return res.json({ email: req.user.email });
});

// --- Pinklist endpoints ---
// GET /pinklist -> returns full product objects for saved productIds
app.get("/pinklist", authRequired, async (req, res) => {
  if (!requireDb(res)) return;

  try {
    const user = await usersCollection.findOne({
      _id: new ObjectId(req.user.userId),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const ids = Array.isArray(user.pinklistProductIds) ? user.pinklistProductIds : [];
    const pinklistProducts = ids.map((id) => productById.get(id)).filter(Boolean);

    return res.json(pinklistProducts);
  } catch (err) {
    console.error("Pinklist load error:", err.message);
    return res.status(500).json({ message: "Could not load pinklist." });
  }
});

// POST /wishlist/toggle -> { productId }
app.post("/pinklist/toggle", authRequired, async (req, res) => {
  if (!requireDb(res)) return;

  const { productId } = req.body || {};
  const pid = String(productId || "").trim();

  if (!pid || !productById.has(pid)) {
    return res.status(400).json({ message: "Invalid productId." });
  }

  try {
    const userIdObj = new ObjectId(req.user.userId);

    const user = await usersCollection.findOne({ _id: userIdObj });
    if (!user) return res.status(404).json({ message: "User not found." });

    const ids = Array.isArray(user.pinklistProductIds) ? user.pinklistProductIds : [];
    const already = ids.includes(pid);

    // Toggle using $addToSet (add unique) or $pull (remove)
    if (already) {
      await usersCollection.updateOne(
        { _id: userIdObj },
        { $pull: { pinklistProductIds: pid } }
      );
    } else {
      await usersCollection.updateOne(
        { _id: userIdObj },
        { $addToSet: { pinklistProductIds: pid } }
      );
    }

    // Fetch updated list
    const updated = await usersCollection.findOne({ _id: userIdObj });
    const updatedIds = Array.isArray(updated.pinklistProductIds) ? updated.pinklistProductIds : [];

    const pinklistProducts = updatedIds.map((id) => productById.get(id)).filter(Boolean);

    return res.json({
      productId: pid,
      isPinklisted: !already,
      pinklist: pinklistProducts,
    });
  } catch (err) {
    console.error("Pinklist toggle error:", err.message);
    return res.status(500).json({ message: "Could not update pinklist." });
  }
});

// Keep trying to connect MongoDB until it's available.
// This helps when you start the backend first, then start MongoDB.
async function initMongoRetry() {
  while (true) {
    const ok = await initMongo();
    if (ok) return;
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// Start server
initMongoRetry();

const path = require("path");

// Serve frontend files (HTML, CSS, JS)
app.use(express.json());
app.use(express.static(__dirname));

// Default route (homepage)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


// Default backend port (frontend calls this port).
const PORT = process.env.PORT || 3008;
;
app.listen(PORT, () => {
  console.log(`Pink Cart server (MongoDB + JWT) running on http://localhost:${PORT}`);
});