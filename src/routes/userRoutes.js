const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// GET all users
router.get("/", userController.getAllUsers);

// GET a single user by ID
router.get("/:id", userController.getUserById);

// POST create a new user
router.post("/", userController.createUser);

// PATCH/PUT update a user
router.patch("/:id", userController.updateUser);

// DELETE a user
router.delete("/:id", userController.deleteUser);

// Verify a user
router.patch("/:id/verify", userController.verifyUser);

// Suspend a user
router.patch("/:id/suspend", userController.suspendUser);

// Activate a user
router.patch("/:id/activate", userController.activateUser);

module.exports = router;
