const mongoose = require("mongoose");
const Roles = require("./models/roles"); // Update with the correct path to your model
const { v4: uuidv4 } = require("uuid");

// Define the categories and roles
const data = {
  Admin: [
    "Finance Manager",
    "Human Resource Manager",
    "Legal Consultant",
    "Recruiter",
  ],
  Animation: [
    "2D Animator",
    "3D Animator",
    "Cinematic Animator",
    "Mocap Specialist",
    "Technical Animator",
  ],
  "Art & Visual Effects": [
    "2D Artist",
    "3D Artist",
    "Art Director",
    "Character Artist",
    "Concept Artist",
    "Environment Artist",
    "Lighting Artist",
    "Material / Shader Artist",
    "Technical Artist",
    "UI Artist",
    "VFX Artist",
    "Weapon",
  ],
  Design: [
    "Combat Designer",
    "Economy Designer",
    "Game Designer",
    "Level Designer",
    "Narrative Designer",
    "Systems Designer",
    "UI/UX Designer",
  ],
  Management: [
    "Art Manager",
    "Community Manager",
    "Design Director",
    "Design Manager",
    "Live Operations Manager",
    "Marketing Manager",
    "Technical Director",
  ],
  "Marketing & Community": [
    "Brand Manager",
    "Community Manager",
    "Data Analyst",
    "Marketer",
    "Monetization",
    "PR Specialist",
    "Social Media Manager",
  ],
  "Production & Executive": [
    "Assistant Producer",
    "Assistant Project",
    "Chief Executive",
    "Chief Financial",
    "Chief Operations",
    "Founder",
    "Localization Manager",
    "Outsourcing Manager",
    "Producer",
    "Project Manager",
    "QA Lead",
    "Scrum Master",
  ],
  "Programming & Engineering": [
    "AI Programmer",
    "Audio Programmer",
    "Backend Developer",
    "Engine Programmer",
    "Gameplay Programmer",
    "Graphics Programmer",
    "Lighting Programmer",
    "Network Programmer",
    "Networking Programmer",
    "Physics Programmer",
    "Security Engineer",
    "Software Engineer",
    "Tools Programmer",
  ],
  "Sound & Audio": [
    "Audio Director",
    "Composer",
    "Sound Designer",
    "Voice Director",
    "Voice Actor",
  ],
  "Writing & Narrative": [
    "Dialogue Writer",
    "Lore / Worldbuilding Specialist",
    "Narrative Designer",
  ],
  "Support & Quality Assurance": [
    "Customer Support Specialist",
    "Game Tester",
    "QA Tester",
    "Tech Support Specialist",
  ],
  Internships: [
    "Intern Animator",
    "Intern Artist",
    "Intern Designer",
    "Intern Programmer",
    "Intern QA Tester",
  ],
  Trial: ["Trial"],
};

// Generate roles array
const roles = Object.entries(data).flatMap(([category, roleNames]) =>
  roleNames.map((role) => ({
    name: role,
    hourlySalary: { Junior: 10, Mid: 20, Senior: 30 }, // Example salaries
    category: category,
    id: uuidv4(), // Generate a UUID for each role
  }))
);

const insertData = async () => {
  try {
    // Insert roles for a specific guild
    const guildId = "1333113415522062427";

    await Roles.create({
      guildId,
      roles,
      categorys: Object.keys(data),
      experiences: ["Junior", "Mid", "Senior"],
    });

    console.log("Data successfully inserted!");
    mongoose.disconnect();
  } catch (error) {
    console.error("Error inserting data:", error);
    mongoose.disconnect();
  }
};

module.exports = insertData;
