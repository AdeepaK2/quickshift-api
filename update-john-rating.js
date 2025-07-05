const mongoose = require('mongoose');
const User = require('./src/models/user');

mongoose.connect('mongodb://localhost:27017/quickshift').then(async () => {
  const user = await User.findOneAndUpdate(
    {email: 'john.doe@student.com'}, 
    {rating: 4.2}, 
    {new: true}
  );
  console.log('✅ Updated John Doe rating to', user.rating);
  process.exit(0);
});
