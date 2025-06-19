const Employer = require("../models/employer");

// Get all employers
exports.getAllEmployers = async (req, res) => {
  try {
    // Add pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Add filtering options
    const filter = {};
    if (req.query.verified !== undefined)
      filter.verified = req.query.verified === "true";

    const employers = await Employer.find(filter)
      .select("-password") // Exclude password field
      .skip(skip)
      .limit(limit);

    const total = await Employer.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: employers.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: employers,
    });
  } catch (error) {
    console.error("Error getting employers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve employers",
      error: error.message,
    });
  }
};

// Get employer by ID
exports.getEmployerById = async (req, res) => {
  try {
    const employer = await Employer.findById(req.params.id).select("-password");

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: employer,
    });
  } catch (error) {
    console.error("Error getting employer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve employer",
      error: error.message,
    });
  }
};

// Create new employer
exports.createEmployer = async (req, res) => {
  try {
    // Check if employer with email already exists
    const existingEmployer = await Employer.findOne({ email: req.body.email });
    if (existingEmployer) {
      return res.status(400).json({
        success: false,
        message: "Employer with this email already exists",
      });
    }

    const employer = new Employer(req.body);
    await employer.save();

    // Return employer without password
    const employerResponse = employer.toObject();
    delete employerResponse.password;

    res.status(201).json({
      success: true,
      message: "Employer created successfully",
      data: employerResponse,
    });
  } catch (error) {
    console.error("Error creating employer:", error);
    res.status(400).json({
      success: false,
      message: "Failed to create employer",
      error: error.message,
    });
  }
};

// Update employer
exports.updateEmployer = async (req, res) => {
  try {
    // Find employer by ID
    let employer = await Employer.findById(req.params.id);

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    // Prevent email updates if email already exists
    if (req.body.email && req.body.email !== employer.email) {
      const emailExists = await Employer.findOne({ email: req.body.email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    // Update employer
    employer = await Employer.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Employer updated successfully",
      data: employer,
    });
  } catch (error) {
    console.error("Error updating employer:", error);
    res.status(400).json({
      success: false,
      message: "Failed to update employer",
      error: error.message,
    });
  }
};

// Delete employer
exports.deleteEmployer = async (req, res) => {
  try {
    const employer = await Employer.findByIdAndDelete(req.params.id);

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting employer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete employer",
      error: error.message,
    });
  }
};

// Verify an employer
exports.verifyEmployer = async (req, res) => {
  try {
    const emp = await Employer.findByIdAndUpdate(
      req.params.id,
      { verified: true, isVerified: true, updatedAt: Date.now() },
      { new: true }
    );

    if (!emp) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: emp,
    });
  } catch (error) {
    console.error("Error verifying employer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify employer",
      error: error.message,
    });
  }
};

// Suspend an employer
exports.suspendEmployer = async (req, res) => {
  try {
    const emp = await Employer.findByIdAndUpdate(
      req.params.id,
      { verified: false, isVerified: false, updatedAt: Date.now() },
      { new: true }
    );

    if (!emp) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: emp,
    });
  } catch (error) {
    console.error("Error suspending employer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to suspend employer",
      error: error.message,
    });
  }
};
