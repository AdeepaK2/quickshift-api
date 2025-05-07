const express = require('express');
const router = express.Router();
const employerController = require('../controllers/employerController');

// GET all employers
router.get('/', employerController.getAllEmployers);

// GET a single employer by ID
router.get('/:id', employerController.getEmployerById);

// POST create a new employer
router.post('/', employerController.createEmployer);

// PATCH/PUT update an employer
router.patch('/:id', employerController.updateEmployer);

// DELETE an employer
router.delete('/:id', employerController.deleteEmployer);

module.exports = router;