const express = require("express");
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
dotenv.config();
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./helpers/logger');
const categoryRoutes = require("./routes/category");
const subcategoryRoutes = require("./routes/subcategory");
const productRoutes = require("./routes/product")
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const sellerRoutes = require("./routes/seller");
const authRoutes = require("./routes/auth");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");
const PORT = process.env.PORT;

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Use Morgan for HTTP request logging, piped into Winston
app.use(morgan('combined', { stream: logger.stream }));

// Apply global rate limiting to all requests
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        status: 429,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});
app.use(globalLimiter);
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/categories", categoryRoutes);
app.use("/subcategories", subcategoryRoutes);
app.use("/users", userRoutes);
app.use("/admins", adminRoutes);
app.use("/sellers", sellerRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);

const errorHandler = require('./middleware/errorHandler');

app.get("/", (req, res) => {
    res.send("API is running");
});

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});