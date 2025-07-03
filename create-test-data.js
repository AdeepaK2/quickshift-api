const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/user');
const Employer = require('./src/models/employer');
const Admin = require('./src/models/admin');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshift', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createTestData() {
  try {
    console.log('Creating test data...');

    // Create test users (students)
    const testUsers = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@student.com',
        password: await bcrypt.hash('password123', 10),
        role: 'job_seeker',
        university: 'University of Technology',
        faculty: 'Computer Science',
        yearOfStudy: 3,
        phone: '+1234567890',
        isActive: true,
        isVerified: true,
        studentIdVerified: true,
        gender: 'Male',
        city: 'Colombo',
        address: '123 Main St',
        postalCode: '10001',
        bio: 'Computer Science student with passion for web development',
        gpa: 3.8,
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@student.com',
        password: await bcrypt.hash('password123', 10),
        role: 'job_seeker',
        university: 'National University',
        faculty: 'Engineering',
        yearOfStudy: 2,
        phone: '+1234567891',
        isActive: true,
        isVerified: true,
        studentIdVerified: false,
        gender: 'Female',
        city: 'Kandy',
        address: '456 Oak Ave',
        postalCode: '20001',
        bio: 'Engineering student interested in mechanical design',
        gpa: 3.6,
      },
      {
        firstName: 'Mike',
        lastName: 'Johnson',
        email: 'mike.johnson@student.com',
        password: await bcrypt.hash('password123', 10),
        role: 'job_seeker',
        university: 'International University',
        faculty: 'Business',
        yearOfStudy: 4,
        phone: '+1234567892',
        isActive: true,
        isVerified: false,
        studentIdVerified: false,
        gender: 'Male',
        city: 'Galle',
        address: '789 Pine St',
        postalCode: '30001',
        bio: 'Business student with focus on marketing',
        gpa: 3.4,
      },
      {
        firstName: 'Sarah',
        lastName: 'Wilson',
        email: 'sarah.wilson@student.com',
        password: await bcrypt.hash('password123', 10),
        role: 'job_seeker',
        university: 'University of Technology',
        faculty: 'Information Technology',
        yearOfStudy: 1,
        phone: '+1234567893',
        isActive: false,
        isVerified: true,
        studentIdVerified: true,
        gender: 'Female',
        city: 'Colombo',
        address: '321 Elm St',
        postalCode: '10002',
        bio: 'First-year IT student passionate about cybersecurity',
        gpa: 3.9,
      },
      {
        firstName: 'Alex',
        lastName: 'Brown',
        email: 'alex.brown@student.com',
        password: await bcrypt.hash('password123', 10),
        role: 'job_seeker',
        university: 'State University',
        faculty: 'Arts',
        yearOfStudy: 3,
        phone: '+1234567894',
        isActive: true,
        isVerified: true,
        studentIdVerified: true,
        gender: 'Non-binary',
        city: 'Jaffna',
        address: '654 Maple Dr',
        postalCode: '40001',
        bio: 'Arts student with focus on graphic design',
        gpa: 3.7,
      },
    ];

    // Create test employers
    const testEmployers = [
      {
        companyName: 'Tech Solutions Inc.',
        email: 'hr@techsolutions.com',
        password: await bcrypt.hash('password123', 10),
        contactPersonName: 'Robert Manager',
        phone: '+1234567800',
        location: 'Colombo',
        companyDescription: 'Leading technology company specializing in web development and software solutions',
        isActive: true,
        isVerified: true,
        industryType: 'Technology',
        companySize: '50-100',
        website: 'https://techsolutions.com',
        ratings: {
          averageRating: 4.5,
          totalReviews: 12,
        },
      },
      {
        companyName: 'Marketing Masters',
        email: 'contact@marketingmasters.com',
        password: await bcrypt.hash('password123', 10),
        contactPersonName: 'Lisa Director',
        phone: '+1234567801',
        location: 'Kandy',
        companyDescription: 'Creative marketing agency helping businesses grow their online presence',
        isActive: true,
        isVerified: false,
        industryType: 'Marketing',
        companySize: '10-50',
        website: 'https://marketingmasters.com',
        ratings: {
          averageRating: 4.2,
          totalReviews: 8,
        },
      },
      {
        companyName: 'Design Studio Pro',
        email: 'info@designstudiopro.com',
        password: await bcrypt.hash('password123', 10),
        contactPersonName: 'David Creative',
        phone: '+1234567802',
        location: 'Galle',
        companyDescription: 'Professional design studio offering branding and UI/UX services',
        isActive: true,
        isVerified: true,
        industryType: 'Design',
        companySize: '10-50',
        website: 'https://designstudiopro.com',
        ratings: {
          averageRating: 4.8,
          totalReviews: 15,
        },
      },
      {
        companyName: 'Global Logistics',
        email: 'jobs@globallogistics.com',
        password: await bcrypt.hash('password123', 10),
        contactPersonName: 'Emma Operations',
        phone: '+1234567803',
        location: 'Colombo',
        companyDescription: 'International logistics company providing supply chain solutions',
        isActive: false,
        isVerified: true,
        industryType: 'Logistics',
        companySize: '100+',
        website: 'https://globallogistics.com',
        ratings: {
          averageRating: 3.9,
          totalReviews: 6,
        },
      },
      {
        companyName: 'FinTech Innovations',
        email: 'careers@fintechinnovations.com',
        password: await bcrypt.hash('password123', 10),
        contactPersonName: 'James CEO',
        phone: '+1234567804',
        location: 'Colombo',
        companyDescription: 'Innovative financial technology company developing mobile payment solutions',
        isActive: true,
        isVerified: true,
        industryType: 'Finance',
        companySize: '50-100',
        website: 'https://fintechinnovations.com',
        ratings: {
          averageRating: 4.6,
          totalReviews: 20,
        },
      },
    ];

    // Clear existing data
    console.log('Clearing existing test data...');
    await User.deleteMany({ email: { $regex: '@student.com$' } });
    await Employer.deleteMany({ email: { $regex: '@(techsolutions|marketingmasters|designstudiopro|globallogistics|fintechinnovations).com$' } });

    // Insert test users
    console.log('Creating test users...');
    const createdUsers = await User.insertMany(testUsers);
    console.log(`Created ${createdUsers.length} test users`);

    // Insert test employers
    console.log('Creating test employers...');
    const createdEmployers = await Employer.insertMany(testEmployers);
    console.log(`Created ${createdEmployers.length} test employers`);

    // Display summary
    console.log('\n=== TEST DATA SUMMARY ===');
    console.log('Users created:');
    createdUsers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - ${user.university}`);
    });

    console.log('\nEmployers created:');
    createdEmployers.forEach(employer => {
      console.log(`- ${employer.companyName} (${employer.email}) - ${employer.location}`);
    });

    console.log('\nTest data created successfully!');
    console.log('You can now test the admin dashboard with this data.');

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    mongoose.disconnect();
  }
}

createTestData();
