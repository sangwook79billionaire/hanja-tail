const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = "AIzaSyBWQPFIGt8k7wU1Es3rsnSWSo88MRjaatU";

async function test() {
  console.log("Testing with hardcoded Key...");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  // Try different model names
  const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
  
  for (const modelName of models) {
    console.log(`\n--- Testing Model: ${modelName} ---`);
    const model = genAI.getGenerativeModel({ model: modelName });
    try {
      const result = await model.generateContent("Hi");
      const response = await result.response;
      console.log(`[${modelName}] Success! Response:`, response.text());
      break; // Stop if one works
    } catch (err) {
      console.error(`[${modelName}] Failed!`);
      console.error("Status:", err.status);
      console.error("Message:", err.message);
    }
  }
}

test();
