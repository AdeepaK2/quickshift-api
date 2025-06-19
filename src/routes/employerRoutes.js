const express = require("express");
const router = express.Router();
const employerController = require("../controllers/employerController");

// GET all employers
router.get("/", employerController.getAllEmployers);

// GET a single employer by ID
router.get("/:id", employerController.getEmployerById);

// POST create a new employer
router.post("/", employerController.createEmployer);

// PATCH/PUT update an employer
router.patch("/:id", employerController.updateEmployer);

// DELETE an employer
router.delete("/:id", employerController.deleteEmployer);

// Verify an employer
router.patch("/:id/verify", employerController.verifyEmployer);

// Suspend an employer
router.patch("/:id/suspend", employerController.suspendEmployer);

module.exports = router;
